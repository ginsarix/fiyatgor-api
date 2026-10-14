import { describe, expect, it } from "vitest";
import { withEncryptedDiaPassword } from "../services/firm.js";
import { aesDecrypt } from "../utils/aes-256-gcm.js";

describe("withEncryptedDiaPassword", () => {
  it("never passes the plaintext password through", () => {
    const values = withEncryptedDiaPassword({
      name: "Test",
      diaPassword: "hunter2",
    });

    expect(values.diaPassword).not.toBe("hunter2");
    expect(aesDecrypt(values.diaPassword as string)).toBe("hunter2");
  });

  it("keeps the other fields as they are", () => {
    const values = withEncryptedDiaPassword({
      name: "Test",
      diaPassword: "hunter2",
    });

    expect(values.name).toBe("Test");
  });

  it("leaves the stored password untouched when none is given", () => {
    // undefined columns are skipped by drizzle's .set()
    const values = withEncryptedDiaPassword({
      name: "Test",
      diaPassword: undefined,
    });

    expect(values.diaPassword).toBeUndefined();
  });
});
