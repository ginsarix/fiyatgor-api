/**
 * corresponding of the column names to their names in the products db table:
 * - _key: diaKey
 * - stokkartkodu: stockCode
 * - m_birimler: for the barcodes table (we dont include it in the selected columns because it will always be in the response anyway)
 * - aciklama: name
 * - doviz1: currency
 * - kdvsatis: vat
 * - durum: status
 * - minsiparismiktari: minQuantity
 * - birimadi: unit
 * - aws_url: image
 * - _key_scf_marka / _key_sis_ozelkod1-11: not stored directly, used to match special offer campaigns to this stock
 */
export const SELECTED_COLUMNS_BASE = [
  "_key",
  "stokkartkodu",
  "aciklama",
  "doviz1",
  "kdvsatis",
  "durum",
  "minsiparismiktari",
  "birimadi",
  "aws_url",
  "_key_scf_marka",
  "_key_sis_ozelkod1",
  "_key_sis_ozelkod2",
  "_key_sis_ozelkod3",
  "_key_sis_ozelkod4",
  "_key_sis_ozelkod5",
  "_key_sis_ozelkod6",
  "_key_sis_ozelkod7",
  "_key_sis_ozelkod8",
  "_key_sis_ozelkod9",
  "_key_sis_ozelkod10",
  "_key_sis_ozelkod11",
] as const;
