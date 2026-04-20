import { createRoute } from "@hono/zod-openapi";
import {
  FirmCodeAndBarcodeParamsSchema,
  MessageSchema,
  ProductResponseSchema,
  ServerCodeAndBarcodeParamsSchema,
} from "../schemas.js";

export const getProductByBarcodeRoute = createRoute({
  method: "get",
  path: "/servers/{serverCode}/products/{barcode}",
  tags: ["Public"],
  summary: "Get product by barcode",
  description:
    "Looks up a product by any of its associated barcodes within a firm identified by its DIA server code. No authentication required.",
  request: {
    params: ServerCodeAndBarcodeParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: ProductResponseSchema } },
      description: "Product found",
    },
    404: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Firm or product not found",
    },
    422: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Validation error (invalid serverCode or barcode)",
    },
  },
});

export const getProductByFirmCodeBarcodeRoute = createRoute({
  method: "get",
  path: "/firms/{firmCode}/products/{barcode}",
  tags: ["Public"],
  summary: "Get product by firm code and barcode",
  description:
    "Looks up a product by any of its associated barcodes within a firm identified by its user-friendly firm code. No authentication required.",
  request: {
    params: FirmCodeAndBarcodeParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: ProductResponseSchema } },
      description: "Product found",
    },
    404: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Firm or product not found",
    },
    422: {
      content: { "application/json": { schema: MessageSchema } },
      description: "Validation error (invalid firmCode or barcode)",
    },
  },
});
