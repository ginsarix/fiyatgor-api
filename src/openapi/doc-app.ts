import { OpenAPIHono } from "@hono/zod-openapi";

import {
  deleteJobRoute,
  getAdminFirmRoute,
  getAdminProductsRoute,
  getJobRoute,
  getMeRoute,
  syncProductsRoute,
  updateAdminFirmRoute,
  updateMeRoute,
  upsertJobRoute,
} from "./routes/admin.routes.js";
import {
  getCurrentSessionRoute,
  loginRoute,
  logoutRoute,
} from "./routes/auth.routes.js";
import { getProductByBarcodeRoute } from "./routes/public.routes.js";
import {
  createFirmRoute,
  createUserRoute,
  getFirmByIdRoute,
  listFirmsRoute,
  listUsersRoute,
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

// ─── Admin – Products ─────────────────────────────────────────────────────────
docApp.openapi(syncProductsRoute, stub);
docApp.openapi(getAdminProductsRoute, stub);

// ─── Admin – Jobs ─────────────────────────────────────────────────────────────
docApp.openapi(upsertJobRoute, stub);
docApp.openapi(getJobRoute, stub);
docApp.openapi(deleteJobRoute, stub);

// ─── Admin – Firm ─────────────────────────────────────────────────────────────
docApp.openapi(getAdminFirmRoute, stub);
docApp.openapi(updateAdminFirmRoute, stub);

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
