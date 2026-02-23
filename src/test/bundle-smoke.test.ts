import { describe, expect, it } from "vitest";

const BASE = "http://localhost:3000";

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

describe("bundle smoke tests", () => {
  // -------------------------------------------------------------------------
  // Core
  // -------------------------------------------------------------------------

  describe("GET /", () => {
    it("returns 200 with the API name", async () => {
      const res = await fetch(`${BASE}/`);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Fiyatgör API");
    });
  });

  describe("GET /doc", () => {
    it("returns 200 with a valid OpenAPI 3.1 document", async () => {
      const res = await fetch(`${BASE}/doc`);
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.openapi).toBe("3.1.0");
      expect((body.info as Record<string, unknown>).title).toBe("Fiyatgör API");
    });
  });

  describe("GET /ui", () => {
    it("returns 200", async () => {
      const res = await fetch(`${BASE}/ui`);
      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  describe("POST /auth/sessions", () => {
    it("returns 400 when body is empty", async () => {
      const res = await fetch(`${BASE}/auth/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when email is malformed", async () => {
      const res = await fetch(`${BASE}/auth/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "secret" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 401 for valid shape but wrong credentials", async () => {
      const res = await fetch(`${BASE}/auth/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nobody@example.com",
          password: "wrongpassword",
        }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /auth/sessions/current", () => {
    it("returns 401 when no session cookie is present", async () => {
      const res = await fetch(`${BASE}/auth/sessions/current`);
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /auth/sessions/current", () => {
    it("returns 200 even without a session cookie", async () => {
      const res = await fetch(`${BASE}/auth/sessions/current`, {
        method: "DELETE",
      });
      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // Superadmin — auth guard
  // -------------------------------------------------------------------------

  describe("superadmin routes auth guard", () => {
    const superadminRoutes: { method: string; path: string }[] = [
      { method: "GET", path: "/superadmin/firms" },
      { method: "GET", path: "/superadmin/firm/1" },
      { method: "POST", path: "/superadmin/firms" },
      { method: "POST", path: "/superadmin/users" },
    ];

    for (const { method, path } of superadminRoutes) {
      it(`${method} ${path} returns 401 without a session`, async () => {
        const res = await fetch(`${BASE}${path}`, { method });
        expect(res.status).toBe(401);
      });
    }
  });

  // -------------------------------------------------------------------------
  // Admin — auth guard
  // -------------------------------------------------------------------------

  describe("admin routes auth guard", () => {
    const adminRoutes: { method: string; path: string }[] = [
      { method: "POST", path: "/admin/products/sync" },
      { method: "GET", path: "/admin/products" },
      { method: "GET", path: "/admin/jobs" },
      { method: "POST", path: "/admin/jobs" },
      { method: "DELETE", path: "/admin/jobs" },
      { method: "GET", path: "/admin/firm" },
      { method: "GET", path: "/admin/me" },
      { method: "PATCH", path: "/admin/me" },
      { method: "PATCH", path: "/admin/firm" },
    ];

    for (const { method, path } of adminRoutes) {
      it(`${method} ${path} returns 401 without a session`, async () => {
        const res = await fetch(`${BASE}${path}`, { method });
        expect(res.status).toBe(401);
      });
    }
  });

  // -------------------------------------------------------------------------
  // Public
  // -------------------------------------------------------------------------

  describe("GET /servers/:serverCode/products/:barcode", () => {
    it("returns 404 for a server code that does not exist", async () => {
      const res = await fetch(
        `${BASE}/servers/nonexistent-server/products/1234567890`,
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 when barcode exceeds 48 characters", async () => {
      const longBarcode = "x".repeat(49);
      const res = await fetch(
        `${BASE}/servers/someserver/products/${longBarcode}`,
      );
      expect(res.status).toBe(400);
    });
  });
});
