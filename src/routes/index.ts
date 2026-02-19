import type { Hono } from "hono";
import { registerAdminRoutes } from "./admin.js";
import { registerAuthRoutes } from "./auth.js";
import { registerPublicRoutes } from "./public.js";
import { registerSuperAdminRoutes } from "./super-admin.js";

export function registerRoutes(app: Hono) {
  registerAuthRoutes(app);
  registerSuperAdminRoutes(app);
  registerAdminRoutes(app);
  registerPublicRoutes(app);
}
