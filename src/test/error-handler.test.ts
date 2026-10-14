import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { DiaLoginError } from "../helpers/dia.js";
import { errorHandler } from "../middlewares/error-handler.js";

function appThrowing(error: Error) {
  return new Hono().onError(errorHandler).get("/", () => {
    throw error;
  });
}

describe("errorHandler", () => {
  it("responds to DIA login errors with their message so the user can fix their credentials", async () => {
    const res = await appThrowing(
      new DiaLoginError("DIA girişi başarısız oldu", "NOUSER"),
    ).request("/");

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ message: "DIA girişi başarısız oldu" });
  });

  it("hides the details of unknown errors", async () => {
    const res = await appThrowing(new Error("secret internals")).request("/");

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret internals");
  });
});
