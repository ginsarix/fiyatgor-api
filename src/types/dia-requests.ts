import type { NestedIntersect } from "./utils.js";

export type DiaUrl = {
  serverCode: string;
  /**
   * (e.g.), scf, sis, bcs
   */
  module: string;
};

export type DiaFilterOperator =
  | "<"
  | ">"
  | "<="
  | ">="
  | "!"
  | "="
  | "IN"
  | "NOT IN";
export type DiaFilter = {
  field: string;
  operator: DiaFilterOperator;
  value: string;
};

export type DiaSort = { field: string; sorttype: "ASC" | "DESC" };

export type DiaListParams = {
  filters?: DiaFilter[];
  sorts?: DiaSort[];
  limit?: number;
  offset?: number;
};

// I l❤️ve Typescript
export type DiaRequest<KService extends string> = {
  [K in KService]: {
    // in the api this is actually required,
    // but we're making it optional here for the sake of flexibility in the dia helper
    session_id?: string;
    firma_kodu: number;
    donem_kodu?: number;
    params?: { selectedcolumns?: string[] } & Record<string, unknown>;
  };
};

export type DiaLoginRequest = {
  login: {
    username: string;
    password: string;
    /**
     * @default "true"
     */
    disconnect_same_user: "true" | "false";
    params: { apikey: string };
  };
};

export type DiaPingRequest = {
  sis_ping: {
    session_id: string;
  };
};

export type DiaListRequest<KS extends string> = NestedIntersect<
  DiaRequest<KS>,
  DiaListParams
>;
