import { zValidator } from "@hono/zod-validator";
import type { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { getFirmIdByServerCode } from "../services/firm.js";
import { findProductByAnyBarcode } from "../services/product.js";
import { serverCodeValidation } from "../validations/zod.js";

export function registerPublicRoutes(app: Hono) {
  app.get(
    "/servers/:serverCode/products/:barcode",
    zValidator(
      "param",
      z.object({
        serverCode: serverCodeValidation,
        barcode: z
          .string()
          .min(1, { error: "Barkod boş olamaz!" })
          .max(48, { error: "Barkod 48 harfden daha fazla olamaz!" }),
      }),
    ),
    async (c) => {
      const { serverCode, barcode } = c.req.valid("param");

      const firmId = await getFirmIdByServerCode(db, serverCode);

      if (!firmId) {
        return c.json(
          { message: `${serverCode} sunucu kodlu bir firma bulunamadı` },
          404,
        );
      }

      const product = await findProductByAnyBarcode(db, firmId, barcode);

      if (!product) return c.json({ message: "Ürün bulunamadı" }, 404);

      return c.json({
        product,
        message: "Eşleşen ürün başarıyla getirildi",
      });
    },
  );
}
