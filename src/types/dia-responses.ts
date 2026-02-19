export type DiaResponse<T> = {
  code: string;
  result: T;
};

export type DiaLoginResponse = {
  code: string;
  msg: string;
};

export type DiaPingResponse = {
  code: "200" | "401";
  /**
   * will be undefined if response code is 200
   */
  msg?: "INVALID_SESSION";
};

export type DiaStock = {
  _key: string;
  stokkartkodu: string;
  m_birimler: { __barkodlar: { barkod: string }[] }[];
  aciklama: string;
  fiyat1: string;
  doviz1: string;
  kdvsatis: string;
  durum: "A" | "P";
  minsiparismiktari: string;
  birimadi: string;
  aws_url: string;
};

export type DiaStockListResponse = DiaResponse<DiaStock[]>;
