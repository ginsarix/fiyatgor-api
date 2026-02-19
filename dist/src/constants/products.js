/**
 * corresponding of the column names to their names in the products db table:
 * - _key: diaKey
 * - stokkartkodu: stockCode
 * - m_birimler: for the barcodes table (we dont include it in the selected columns because it will always be in the response anyway)
 * - aciklama: name
 * - fiyat1: price
 * - doviz1: currency
 * - kdvsatis: vat
 * - durum: status
 * - minsiparismiktari: minQuantity
 * - birimadi: unit
 * - aws_url: image
 */
export const SELECTED_COLUMNS = [
    "_key",
    "stokkartkodu",
    "aciklama",
    "fiyat1",
    "doviz1",
    "kdvsatis",
    "durum",
    "minsiparismiktari",
    "birimadi",
    "aws_url",
];
