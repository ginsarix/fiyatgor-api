import type { DiaFilter } from "../types/dia-requests.js";

export const URL_BASE = "ws.dia.com.tr/api/v3";

export const ONLY_ACTIVE_FILTER: DiaFilter = {
  field: "durum",
  operator: "=",
  value: "A",
};
