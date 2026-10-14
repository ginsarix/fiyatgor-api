import { describe, expect, it } from "vitest";
import { createDiaUrl } from "../helpers/dia.js";

const hostnameOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

describe("createDiaUrl", () => {
  it("points at the firm's DIA server", () => {
    expect(createDiaUrl("diademo", "sis")).toBe(
      "https://diademo.ws.dia.com.tr/api/v3/sis/json",
    );
  });

  it("keeps server codes with dots on DIA's domain", () => {
    expect(hostnameOf(createDiaUrl("sub.diademo", "sis"))).toBe(
      "sub.diademo.ws.dia.com.tr",
    );
  });

  // the server code is user input, and the DIA password is sent to this URL
  it.each([
    "attacker.example/x#",
    "attacker.example?",
    "user@attacker.example#",
    "attacker.example:443/",
    "attacker.example\\x#",
  ])("can't be pointed at another host with %j", (serverCode) => {
    expect(hostnameOf(createDiaUrl(serverCode, "sis"))).toBeNull();
  });
});
