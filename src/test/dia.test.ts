import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiaLoginError, diaLogin } from "../helpers/dia.js";

const credentials = { username: "user", password: "pass", apiKey: "" };

describe("diaLogin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the session id when DIA accepts the credentials", async () => {
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { code: "200", msg: "f3a9c1d2e4b5" },
    });

    await expect(diaLogin("diademo", credentials)).resolves.toBe(
      "f3a9c1d2e4b5",
    );
  });

  // DIA answers rejected logins with HTTP 200, the failure is only in `code`
  // (observed against diademo with an unknown user)
  it("throws a DiaLoginError when DIA rejects the credentials", async () => {
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { code: "401", msg: "NOUSER" },
    });

    const error = await diaLogin("diademo", credentials).catch((e) => e);

    expect(error).toBeInstanceOf(DiaLoginError);
    expect(error.diaMessage).toBe("NOUSER");
  });

  it("logs into the sis module of the firm's server with the given credentials", async () => {
    const post = vi
      .spyOn(axios, "post")
      .mockResolvedValue({ data: { code: "200", msg: "f3a9c1d2e4b5" } });

    await diaLogin("diademo", credentials);

    expect(post).toHaveBeenCalledWith(
      "https://diademo.ws.dia.com.tr/api/v3/sis/json",
      {
        login: {
          username: "user",
          password: "pass",
          disconnect_same_user: "true",
          params: { apikey: "" },
        },
      },
    );
  });
});
