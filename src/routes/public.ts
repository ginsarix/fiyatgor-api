import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { lookup as mimeLookup } from "mime-types";
import { z } from "zod";
import { catalogNotFoundPageHTML } from "../constants/html.js";
import { db } from "../db/index.js";
import { catalogsTable } from "../db/schemas/catalogs.js";
import {
  getFirmIdByFirmCode,
  getFirmIdByServerCode,
} from "../services/firm.js";
import { findProductByAnyBarcode } from "../services/product.js";
import { isErrnoException } from "../utils/error.js";
import { getFilePath } from "../utils/file.js";
import {
  firmCodeValidation,
  serverCodeValidation,
} from "../validations/zod.js";

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
  app.get(
    "/firms/:firmCode/products/:barcode",
    zValidator(
      "param",
      z.object({
        firmCode: firmCodeValidation,
        barcode: z
          .string()
          .min(1, { error: "Barkod boş olamaz!" })
          .max(48, { error: "Barkod 48 harfden daha fazla olamaz!" }),
      }),
    ),
    async (c) => {
      const { firmCode, barcode } = c.req.valid("param");

      const firmId = await getFirmIdByFirmCode(db, firmCode);

      if (!firmId) {
        return c.json(
          { message: `${firmCode} firma kodlu bir firma bulunamadı` },
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

  app.get(
    "/catalog/:filename",
    zValidator(
      "param",
      z.object({
        filename: z
          .string()
          .min(1, { error: "Dosya adı gereklidir" })
          .max(255, { error: "Dosya adı 255 karakterden daha fazla olamaz" }),
      }),
    ),
    async (c) => {
      const { filename } = c.req.valid("param");

      const filePath = getFilePath(filename);

      const contentType = mimeLookup(filePath);

      try {
        const fileStat = await stat(filePath);

        const stream = createReadStream(filePath);

        if (contentType) {
          c.header("Content-Type", contentType);
          c.header("X-Content-Type-Options", "nosniff"); // prevent mime guessing
        }
        c.header("Cache-Control", "public, max-age=31536000, immutable"); // cache for 1 year

        c.header("Content-Length", fileStat.size.toString());

        c.header("Content-Disposition", "inline");

        return c.body(stream as any, 200);
      } catch (error) {
        if (isErrnoException(error) && error.code === "ENOENT") {
          throw new HTTPException(404, {
            message: "Katalog resmi dosyası bulunamadı",
          });
        }
        throw error;
      }
    },
  );

  app.get(
    "/servers/:serverCode/catalog",
    zValidator("param", z.object({ serverCode: serverCodeValidation })),
    async (c) => {
      const { serverCode } = c.req.valid("param");

      const firmId = await getFirmIdByServerCode(db, serverCode);

      if (!firmId) return c.html(catalogNotFoundPageHTML, 404);

      const [catalog] = await db
        .select()
        .from(catalogsTable)
        .where(eq(catalogsTable.firmId, firmId));

      if (!catalog) return c.html(catalogNotFoundPageHTML, 404);

      // I used 2 endpoints for this operation, this one is basically a resolver that only requires a firmCode so that we can get the firms's catalog image filename
      // and then redirect to the endpoint that actually gives you the file via the given filename
      // this way the client doesn't have to know the filename to get the firm's catalog,
      // while also allowing us to use immutable caching with proper revalidation via versioning (our filenames are unique).
      return c.redirect(`/catalog/${catalog.filename}`);
    },
  );

  app.get(
    "/firms/:firmCode/catalog",
    zValidator(
      "param",
      z.object({
        firmCode: firmCodeValidation,
      }),
    ),
    async (c) => {
      const { firmCode } = c.req.valid("param");

      const firmId = await getFirmIdByFirmCode(db, firmCode);

      if (!firmId) return c.html(catalogNotFoundPageHTML, 404);

      const [catalog] = await db
        .select()
        .from(catalogsTable)
        .where(eq(catalogsTable.firmId, firmId));

      if (!catalog) return c.html(catalogNotFoundPageHTML, 404);

      // I used 2 endpoints for this operation, this one is basically a resolver that only requires a firmCode so that we can get the firms's catalog image filename
      // and then redirect to the endpoint that actually gives you the file via the given filename
      // this way the client doesn't have to know the filename to get the firm's catalog,
      // while also allowing us to use immutable caching with proper revalidation via versioning (our filenames are unique).
      return c.redirect(`/catalog/${catalog.filename}`);
    },
  );
}
