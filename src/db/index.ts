import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../config/env.js";
import * as schema from "./schemas/index.js";

export const db = drizzle(env.DATABASE_URL, { schema });

export type DB = typeof db;
