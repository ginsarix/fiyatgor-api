import type { InferEnum } from "drizzle-orm";
import type { priceFieldEnum } from "../db/schemas/firms.js";

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

type DiaActiveState = /* Aktif (Active) */ 'A' | /* Pasif (Passive/Inactive) */ 'P';

export type DiaStock = {
  _key: string;
  _key_scf_marka: string;
  _key_sis_ozelkod1: string,
  _key_sis_ozelkod2: string,
  _key_sis_ozelkod3: string,
  _key_sis_ozelkod4: string,
  _key_sis_ozelkod5: string,
  _key_sis_ozelkod6: string,
  _key_sis_ozelkod7: string,
  _key_sis_ozelkod8: string,
  _key_sis_ozelkod9: string,
  _key_sis_ozelkod10: string,
  _key_sis_ozelkod11: string,

  stokkartkodu: string;
  m_birimler: { __barkodlar: { barkod: string }[] }[];
  aciklama: string;
  doviz1: string;
  kdvsatis: string;
  durum: DiaActiveState;
  minsiparismiktari: string;
  birimadi: string;
  aws_url: string;
} & Partial<{ [K in InferEnum<typeof priceFieldEnum>]: string }>;

export type DiaStockListResponse = DiaResponse<DiaStock[]>;

// the subset of a DIA stock's classification keys needed to match it against a special
// offer's line items (kalemMatchesStock) — persisted on products.dia_match_keys so discount
// matching can be re-run later without a live DIA fetch (see recomputeFirmProductDiscounts)
export type DiaMatchKeys = {
  marka: string;
  ozelkod1: string;
  ozelkod2: string;
  ozelkod3: string;
  ozelkod4: string;
  ozelkod5: string;
  ozelkod6: string;
  ozelkod7: string;
  ozelkod8: string;
  ozelkod9: string;
  ozelkod10: string;
  ozelkod11: string;
};

export type DiaSpecialCode = { _key: number; durum: DiaActiveState };

export type DiaSpecialOffer = {
  _key: string;
  aciklama: string;
  // special offers who's `durum` is not 'A' are ignored
	durum: DiaActiveState

  /**
   * priority — lower wins when a product matches multiple active offers, 0 is the highest priority
   * @example '0.000000'
   */
  oncelik: string;

  /**
   * start time
   * @example 09:13:19
   */
  bassaat: string;

  /**
   * start date
   * @example 2026-02-01
   */
  bastarih: string;


  /**
   * end time
   * @example 23:59:59
   */
  bitsaat: string;

  /**
   * end date
   * @example 2026-12-31
   */
  bittarih: string;

  m_kalemler: [{
    _key: number;

    // this is the key of the "stok kart"/product — DIA returns this as a number, and 0 means "not set"
    _key_scf_kart: number;

    /**
    * if their durum is not 'A' they are ignored. DIA returns null here (instead of []) when unset
     * @example // (only relevant fields)
     * [{'_key': 70272, 'durum': 'A'},
     */
    _key_scf_marka_kart_array: DiaSpecialCode[] | null,
		/**
     * if their durum is not 'A' they are ignored. DIA returns null here (instead of []) when unset
     * @example // (only relevant fields)
     * [{'_key': 25149, 'durum': 'A'},
        {'_key': 25151, 'durum': 'P'}]
     */
		_key_sis_ozelkod1_kart_array: DiaSpecialCode[] | null,
    _key_sis_ozelkod2_kart_array: DiaSpecialCode[] | null,
    _key_sis_ozelkod3_kart_array: DiaSpecialCode[] | null,
    _key_sis_ozelkod4_kart_array: DiaSpecialCode[] | null,
    _key_sis_ozelkod5_kart_array: DiaSpecialCode[] | null,
    _key_sis_ozelkod6_kart_array: DiaSpecialCode[] | null,
    _key_sis_ozelkod7_kart_array: DiaSpecialCode[] | null,
    _key_sis_ozelkod8_kart_array: DiaSpecialCode[] | null,
    _key_sis_ozelkod9_kart_array: DiaSpecialCode[] | null,
    _key_sis_ozelkod10_kart_array: DiaSpecialCode[] | null,
    _key_sis_ozelkod11_kart_array: DiaSpecialCode[] | null,

    fiyatartieksi: '-' | '+';

    /**
     * percentage
     * @example '50.000000'
     */
    fiyatyuzde: string;

    /**
     * @example '0.000000'
     */
    indirim2: string,
    indirim3: string,
    indirim4: string,
    indirim5: string,
    indirim6: string,
    indirim7: string,
    indirim8: string,
    indirim9: string,
    indirim10: string,
    indirim11: string,
    indirim12: string,
    indirim13: string,
    indirim14: string,
    indirim15: string,
    indirim16: string,
    indirim17: string,
    indirim18: string,
    indirim19: string,
    indirim20: string,


  }]
}
// we first have to fetch all of the special offers to get all of their keys,
// the special offer listing endpoint in the DIA API does not expose all data (especially the discount info)
// so we have first have to fetch from the listing endpoint (scf_kampanya_listele) to get all of the existing special offer keys,
// then query the (scf_kampanya_getir) endpoint (which takes a single special offer key to get only one special offer)
// which gives us all of the data we need, of course we have to query this "getir" endpoint for every existing key we got from the "listing" endpoint, because of their API design.
// unlike listele, getir returns `result` as a single object (not an array) since it fetches exactly one record by key
export type DiaSpecialOfferGetResponse = DiaResponse<DiaSpecialOffer>;

// the listele endpoint only exposes the key (see comment above), so we only ask for that column
export type DiaSpecialOfferListItem = { _key: string };
export type DiaSpecialOfferListResponse = DiaResponse<DiaSpecialOfferListItem[]>;
