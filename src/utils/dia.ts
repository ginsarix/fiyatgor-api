import type { InferEnum } from "drizzle-orm";
import { SELECTED_COLUMNS_BASE } from "../constants/products.js";
import type { priceFieldEnum } from "../db/schemas/firms.js";

export const buildSelectedProductColumns = (
  priceField: InferEnum<typeof priceFieldEnum>,
) => [...SELECTED_COLUMNS_BASE, priceField];
