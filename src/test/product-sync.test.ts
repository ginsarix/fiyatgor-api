import { describe, expect, it } from "vitest";
import { DiaLoginError } from "../helpers/dia.js";
import { productSyncErrorMessage } from "../services/product.js";

describe("productSyncErrorMessage", () => {
  it("tells the user why DIA login failed", () => {
    expect(
      productSyncErrorMessage(
        new DiaLoginError("DIA girişi başarısız oldu", "NOUSER"),
      ),
    ).toBe("DIA girişi başarısız oldu");
  });

  it("falls back to a generic message for anything else", () => {
    expect(productSyncErrorMessage(new Error("secret internals"))).toBe(
      "Ürünler eşleştirilirken bir hata oluştu",
    );
  });
});
