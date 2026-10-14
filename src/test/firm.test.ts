import { describe, expect, it } from "vitest";
import {
  pendingDiaCredentials,
  withEncryptedDiaPassword,
} from "../services/firm.js";
import { aesDecrypt, aesEncrypt } from "../utils/aes-256-gcm.js";

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

describe("pendingDiaCredentials", () => {
  const storedFirm = {
    diaServerCode: "diademo",
    diaUsername: "user",
    diaPassword: aesEncrypt("old-pass"),
    diaApiKey: "",
  };

  it("returns nothing to check when the save doesn't touch DIA credentials", () => {
    expect(pendingDiaCredentials(storedFirm, { name: "Yeni ad" })).toBeNull();
  });

  // the settings form always sends the (prefilled) username and API key back
  it("returns nothing to check when the credentials sent are the stored ones", () => {
    expect(
      pendingDiaCredentials(storedFirm, { diaUsername: "user", diaApiKey: "" }),
    ).toBeNull();
  });

  it("checks a new password together with the stored username and API key", () => {
    expect(
      pendingDiaCredentials(storedFirm, { diaPassword: "new-pass" }),
    ).toEqual({
      serverCode: "diademo",
      credentials: { username: "user", password: "new-pass", apiKey: "" },
    });
  });

  it("checks a new username with the stored password decrypted", () => {
    expect(
      pendingDiaCredentials(storedFirm, {
        diaUsername: "other",
        diaApiKey: "",
      }),
    ).toEqual({
      serverCode: "diademo",
      credentials: { username: "other", password: "old-pass", apiKey: "" },
    });
  });

  // both firm routes save a missing API key as ""
  it("checks the API key that will be saved when none is sent", () => {
    const firmWithApiKey = { ...storedFirm, diaApiKey: "key" };

    expect(
      pendingDiaCredentials(firmWithApiKey, { diaUsername: "user" }),
    ).toEqual({
      serverCode: "diademo",
      credentials: { username: "user", password: "old-pass", apiKey: "" },
    });
  });

  it("checks every credential of a new firm", () => {
    expect(
      pendingDiaCredentials(null, {
        diaServerCode: "diademo",
        diaUsername: "user",
        diaPassword: "pass",
        diaApiKey: "key",
      }),
    ).toEqual({
      serverCode: "diademo",
      credentials: { username: "user", password: "pass", apiKey: "key" },
    });
  });

  it("returns nothing to check when the resulting credentials are incomplete", () => {
    expect(
      pendingDiaCredentials(null, {
        diaServerCode: "diademo",
        diaUsername: "user",
      }),
    ).toBeNull();
  });
});
