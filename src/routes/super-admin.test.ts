import "dotenv/config";
import { eq, like } from "drizzle-orm";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db/index.js";
import { firmsTable } from "../db/schemas/firms.js";
import { jobsTable } from "../db/schemas/jobs.js";
import { usersTable } from "../db/schemas/users.js";
import { registerSuperAdminRoutes } from "./super-admin.js";

// ---------------------------------------------------------------------------
// Partial mocks — only things with real side-effects or that are too slow
// ---------------------------------------------------------------------------

// bcrypt cost 12 is intentionally slow; swap in a fast no-op for tests
const { mockBcryptHash, mockCreateJob } = vi.hoisted(() => ({
  mockBcryptHash: vi.fn(),
  mockCreateJob: vi.fn(),
}));

vi.mock("bcrypt", () => ({ hash: mockBcryptHash }));
// Prevent real cron tasks from being scheduled during tests
vi.mock("../services/jobs/scheduler.js", () => ({ createJob: mockCreateJob }));
// Prevent outbound DIA API calls
vi.mock("../services/jobs/job-fns.js", () => ({ runProductSyncJob: vi.fn() }));

// ---------------------------------------------------------------------------
// Test-data helpers
// ---------------------------------------------------------------------------

/** Prefix every server-code we create so afterEach can bulk-delete them all. */
const TEST_PREFIX = "TEST_SA_";
let seq = 0;

function uniqueServerCode() {
  return `${TEST_PREFIX}${Date.now()}_${++seq}`;
}

function firmPayload(
  overrides: Partial<{
    name: string;
    diaServerCode: string;
    diaUsername: string;
    diaPassword: string;
    diaApiKey: string;
    diaFirmCode: number;
    diaPeriodCode: number;
  }> = {},
) {
  const base = {
    name: "Test Firma",
    diaServerCode: uniqueServerCode(),
    diaUsername: "testuser",
    diaPassword: "plain-test-pw",
    diaApiKey: "test-api-key",
    diaFirmCode: 9999,
    diaPeriodCode: 0,
  };
  return { ...base, ...overrides };
}

type FirmPayload = ReturnType<typeof firmPayload>;

/** Insert a firm directly and return the row. */
async function seedFirm(overrides: Partial<FirmPayload> = {}) {
  const [row] = await db
    .insert(firmsTable)
    .values(firmPayload(overrides))
    .returning();
  return row;
}

/** Insert a user directly and return the row. */
async function seedUser(firmId: number, email = "seed@example.com") {
  const [row] = await db
    .insert(usersTable)
    .values({
      firmId,
      name: "Seed User",
      email,
      password: "hashed",
      role: "admin",
    })
    .returning();
  return row;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("Super Admin Routes", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBcryptHash.mockResolvedValue("hashed-password");
    app = new Hono();
    registerSuperAdminRoutes(app);
  });

  /** Remove every firm whose server-code carries our test prefix.
   *  FK CASCADE handles the child users and jobs rows. */
  afterEach(async () => {
    await db
      .delete(firmsTable)
      .where(like(firmsTable.diaServerCode, `${TEST_PREFIX}%`));
  });

  // -------------------------------------------------------------------------
  // POST /superadmin/users
  // -------------------------------------------------------------------------
  describe("POST /superadmin/users", () => {
    let testFirm: Awaited<ReturnType<typeof seedFirm>>;

    // Each user test needs a real firm to satisfy the FK on usersTable.firmId
    beforeEach(async () => {
      testFirm = await seedFirm();
    });

    function validUserBody(overrides: Record<string, unknown> = {}) {
      return {
        email: `user_${Date.now()}@example.com`,
        password: "secret123",
        name: "Test Admin",
        firmId: testFirm.id,
        role: "admin",
        ...overrides,
      };
    }

    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "incomplete@example.com" }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when role is an invalid enum value", async () => {
      const res = await app.request("/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUserBody({ role: "viewer" })),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when firmId is not a positive integer", async () => {
      const res = await app.request("/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUserBody({ firmId: -1 })),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when email is malformed", async () => {
      const res = await app.request("/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUserBody({ email: "not-an-email" })),
      });

      expect(res.status).toBe(400);
    });

    it("returns 409 when a user with that email already exists", async () => {
      const email = `dup_${Date.now()}@example.com`;
      await seedUser(testFirm.id, email);

      const res = await app.request("/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUserBody({ email })),
      });

      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({
        message: "Bu e-posta ile bir kullanıcı zaten kayıtlı",
      });
    });

    it("returns 201 and creates the user in the database", async () => {
      const body = validUserBody();

      const res = await app.request("/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json).toMatchObject({
        message: "Kullanıcı başarıyla oluşturuldu",
      });
      expect(json.createdUser).toMatchObject({
        email: body.email,
        name: body.name,
        firmId: testFirm.id,
        role: "admin",
      });

      // Verify the row actually exists in the DB
      const [dbUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, json.createdUser.id));

      expect(dbUser).toBeDefined();
      expect(dbUser.email).toBe(body.email);
    });

    it("sets the Location header to /superadmin/users/:id", async () => {
      const res = await app.request("/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUserBody()),
      });

      const json = await res.json();
      expect(res.headers.get("Location")).toBe(
        `/superadmin/users/${json.createdUser.id}`,
      );
    });

    it("hashes the password with bcrypt before storing", async () => {
      const body = validUserBody();

      await app.request("/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(mockBcryptHash).toHaveBeenCalledWith(body.password, 12);
    });

    it("stores the hashed password, not the plaintext", async () => {
      const body = validUserBody();

      const res = await app.request("/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const { createdUser } = await res.json();
      const [dbUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, createdUser.id));

      expect(dbUser.password).not.toBe(body.password);
      expect(dbUser.password).toBe("hashed-password"); // our mock's return value
    });

    it("accepts the superadmin role", async () => {
      const res = await app.request("/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUserBody({ role: "superadmin" })),
      });

      expect(res.status).toBe(201);
      const { createdUser } = await res.json();
      expect(createdUser.role).toBe("superadmin");
    });
  });

  // -------------------------------------------------------------------------
  // GET /superadmin/firms
  // -------------------------------------------------------------------------
  describe("GET /superadmin/firms", () => {
    it("returns 200 and includes every seeded firm", async () => {
      const f1 = await seedFirm();
      const f2 = await seedFirm();

      const res = await app.request("/superadmin/firms");

      expect(res.status).toBe(200);

      const { firms, message } = await res.json();
      expect(message).toBe("Firmalar başarıyla getirildi");

      const ids = firms.map((f: { id: number }) => f.id);
      expect(ids).toContain(f1.id);
      expect(ids).toContain(f2.id);
    });

    it("strips sensitive credentials from every firm in the response", async () => {
      await seedFirm();

      const res = await app.request("/superadmin/firms");
      const { firms } = await res.json();

      // Find the firm we just inserted (by prefix)
      const testFirms = firms.filter((f: { diaServerCode: string }) =>
        f.diaServerCode.startsWith(TEST_PREFIX),
      );
      expect(testFirms.length).toBeGreaterThan(0);

      for (const f of testFirms) {
        expect(f).not.toHaveProperty("diaPassword");
        expect(f).not.toHaveProperty("diaUsername");
        expect(f).not.toHaveProperty("diaApiKey");
      }
    });

    it("includes the expected safe fields for each firm", async () => {
      const seeded = await seedFirm();

      const res = await app.request("/superadmin/firms");
      const { firms } = await res.json();

      const match = firms.find((f: { id: number }) => f.id === seeded.id);
      expect(match).toBeDefined();
      expect(match).toMatchObject({
        id: seeded.id,
        name: seeded.name,
        diaServerCode: seeded.diaServerCode,
        diaFirmCode: seeded.diaFirmCode,
      });
    });
  });

  // -------------------------------------------------------------------------
  // GET /superadmin/firm/:id
  // -------------------------------------------------------------------------
  describe("GET /superadmin/firm/:id", () => {
    it("returns 404 when no firm has that id", async () => {
      const res = await app.request("/superadmin/firm/999999999");

      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ message: "Firma bulunamadı" });
    });

    it("returns 200 when the firm exists", async () => {
      const seeded = await seedFirm();

      const res = await app.request(`/superadmin/firm/${seeded.id}`);

      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        message: "Firma başarıyla getirildi",
      });
    });
  });

  // -------------------------------------------------------------------------
  // POST /superadmin/firms
  // -------------------------------------------------------------------------
  describe("POST /superadmin/firms", () => {
    function validFirmBody(overrides: Record<string, unknown> = {}) {
      return {
        firm: {
          name: "New Firma",
          diaServerCode: uniqueServerCode(),
          diaUsername: "apiuser",
          diaPassword: "plain-pw",
          diaApiKey: "key-abc",
          diaFirmCode: 42,
          diaPeriodCode: 0,
          ...overrides,
        },
      };
    }

    it("returns 400 when required firm fields are missing", async () => {
      const res = await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firm: { name: "Incomplete" } }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when diaFirmCode is not a positive integer", async () => {
      const res = await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validFirmBody({ diaFirmCode: -1 })),
      });

      expect(res.status).toBe(400);
    });

    it("returns 201 and persists the firm in the database", async () => {
      const body = validFirmBody();

      const res = await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json).toMatchObject({ message: "Firma başarıyla oluşturuldu" });
      expect(json.createdFirm).toMatchObject({
        name: body.firm.name,
        diaServerCode: body.firm.diaServerCode,
        diaFirmCode: body.firm.diaFirmCode,
      });

      // Verify the row is really in the DB
      const [dbFirm] = await db
        .select()
        .from(firmsTable)
        .where(eq(firmsTable.id, json.createdFirm.id));

      expect(dbFirm).toBeDefined();
      expect(dbFirm.name).toBe(body.firm.name);
    });

    it("sets the Location header to /superadmin/firm/:id", async () => {
      const body = validFirmBody();

      const res = await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      expect(res.headers.get("Location")).toBe(
        `/superadmin/firm/${json.createdFirm.id}`,
      );
    });

    it("encrypts the diaPassword before storing it", async () => {
      const body = validFirmBody();

      const res = await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const { createdFirm } = await res.json();
      const [dbFirm] = await db
        .select()
        .from(firmsTable)
        .where(eq(firmsTable.id, createdFirm.id));

      // The stored password must differ from what was submitted
      expect(dbFirm.diaPassword).not.toBe(body.firm.diaPassword);
      // AES-256-GCM output is base64-encoded
      expect(() => Buffer.from(dbFirm.diaPassword, "base64")).not.toThrow();
    });

    it("does not insert a job row when the job field is omitted", async () => {
      const body = validFirmBody();

      const res = await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const { createdFirm } = await res.json();
      const jobs = await db
        .select()
        .from(jobsTable)
        .where(eq(jobsTable.firmId, createdFirm.id));

      expect(jobs).toHaveLength(0);
      expect(mockCreateJob).not.toHaveBeenCalled();
    });

    it("does not insert a job row when job is explicitly null", async () => {
      const body = { ...validFirmBody(), job: null };

      const res = await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(201);
      const { createdFirm } = await res.json();
      const jobs = await db
        .select()
        .from(jobsTable)
        .where(eq(jobsTable.firmId, createdFirm.id));

      expect(jobs).toHaveLength(0);
    });

    it("inserts a job row and schedules a cron task when job is provided", async () => {
      const body = {
        ...validFirmBody(),
        job: { frequency: 30, unit: "minute" },
      };

      const res = await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(201);
      const { createdFirm } = await res.json();

      // Job row must be in the DB
      const [dbJob] = await db
        .select()
        .from(jobsTable)
        .where(eq(jobsTable.firmId, createdFirm.id));

      expect(dbJob).toBeDefined();
      expect(dbJob.frequency).toBe(30);
      expect(dbJob.unit).toBe("minute");

      // Cron task must have been scheduled
      expect(mockCreateJob).toHaveBeenCalledOnce();
    });

    it("schedules the cron task with the correct expression for minutes", async () => {
      const body = {
        ...validFirmBody(),
        job: { frequency: 15, unit: "minute" },
      };

      await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(mockCreateJob).toHaveBeenCalledWith(
        expect.any(Number),
        "*/15 * * * *",
        expect.any(Function),
      );
    });

    it("schedules the cron task with the correct expression for hours", async () => {
      const body = {
        ...validFirmBody(),
        job: { frequency: 6, unit: "hour" },
      };

      await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(mockCreateJob).toHaveBeenCalledWith(
        expect.any(Number),
        "0 */6 * * *",
        expect.any(Function),
      );
    });

    it("schedules the cron task with the job's database id", async () => {
      const body = {
        ...validFirmBody(),
        job: { frequency: 1, unit: "day" },
      };

      const res = await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const { createdFirm } = await res.json();
      const [dbJob] = await db
        .select()
        .from(jobsTable)
        .where(eq(jobsTable.firmId, createdFirm.id));

      expect(mockCreateJob).toHaveBeenCalledWith(
        dbJob.id,
        expect.any(String),
        expect.any(Function),
      );
    });

    it("returns 400 when job unit is not a valid enum value", async () => {
      const body = {
        ...validFirmBody(),
        job: { frequency: 5, unit: "second" },
      };

      const res = await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when job frequency is zero or negative", async () => {
      const body = {
        ...validFirmBody(),
        job: { frequency: 0, unit: "hour" },
      };

      const res = await app.request("/superadmin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      expect(res.status).toBe(400);
    });
  });
});
