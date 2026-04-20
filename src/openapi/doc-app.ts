import { OpenAPIHono } from "@hono/zod-openapi";

import {
  deleteJobRoute,
  getAdminFirmRoute,
  getAdminProductsRoute,
  getJobRoute,
  getMeRoute,
  saveRawProductsRoute,
  syncProductsRoute,
  updateAdminFirmRoute,
  updateMeRoute,
  uploadCatalogRoute,
  upsertJobRoute,
} from "./routes/admin.routes.js";
import {
  getCurrentSessionRoute,
  loginRoute,
  logoutRoute,
} from "./routes/auth.routes.js";
import {
  getProductByBarcodeRoute,
  getProductByFirmCodeBarcodeRoute,
} from "./routes/public.routes.js";
import {
  createFirmRoute,
  createUserRoute,
  deleteFirmByIdRoute,
  getFirmByIdRoute,
  listFirmsRoute,
  listUsersRoute,
  updateFirmByIdRoute,
} from "./routes/super-admin.routes.js";

// biome-ignore lint/suspicious/noExplicitAny: stub handlers are never called — this app is only used for spec generation
const stub: any = () => {};

export const docApp = new OpenAPIHono();

docApp.openAPIRegistry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: "session",
  description:
    "Session cookie obtained via `POST /auth/sessions`. Required for all authenticated endpoints.",
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
docApp.openapi(loginRoute, stub);
docApp.openapi(getCurrentSessionRoute, stub);
docApp.openapi(logoutRoute, stub);

// ─── Public ───────────────────────────────────────────────────────────────────
docApp.openapi(getProductByBarcodeRoute, stub);
docApp.openapi(getProductByFirmCodeBarcodeRoute, stub);

// ─── Admin – Products ─────────────────────────────────────────────────────────
docApp.openapi(syncProductsRoute, stub);
docApp.openapi(saveRawProductsRoute, stub);
docApp.openapi(getAdminProductsRoute, stub);

// ─── Admin – Jobs ─────────────────────────────────────────────────────────────
docApp.openapi(upsertJobRoute, stub);
docApp.openapi(getJobRoute, stub);
docApp.openapi(deleteJobRoute, stub);

// ─── Admin – Firm ─────────────────────────────────────────────────────────────
docApp.openapi(getAdminFirmRoute, stub);
docApp.openapi(updateAdminFirmRoute, stub);
docApp.openapi(uploadCatalogRoute, stub);

// ─── Admin – User ─────────────────────────────────────────────────────────────
docApp.openapi(getMeRoute, stub);
docApp.openapi(updateMeRoute, stub);

// ─── Super Admin – Users ──────────────────────────────────────────────────────
docApp.openapi(createUserRoute, stub);
docApp.openapi(listUsersRoute, stub);

// ─── Super Admin – Firms ──────────────────────────────────────────────────────
docApp.openapi(createFirmRoute, stub);
docApp.openapi(listFirmsRoute, stub);
docApp.openapi(getFirmByIdRoute, stub);
docApp.openapi(updateFirmByIdRoute, stub);
docApp.openapi(deleteFirmByIdRoute, stub);
