import { ONLY_ACTIVE_FILTER } from "../constants/dia.js";
import type { DB } from "../db/index.js";
import { dia } from "../helpers/dia.js";
import type { DiaGetRequest, DiaListRequest } from "../types/dia-requests.js";
import type {
  DiaMatchKeys,
  DiaSpecialCode,
  DiaSpecialOffer,
  DiaSpecialOfferGetResponse,
  DiaSpecialOfferListResponse,
  DiaStock,
} from "../types/dia-responses.js";

type SpecialOfferListRequestServiceName = "scf_kampanya_listele";
type SpecialOfferGetRequestServiceName = "scf_kampanya_getir";

const OZELKOD_SLOT_COUNT = 11;
const INDIRIM_FIELD_COUNT = 20; // indirim2..indirim20

export type SpecialOffersResult = {
  offers: DiaSpecialOffer[];
  listedKeys: number[];
  // number of scf_kampanya_getir calls made — the listele step doesn't expose the discount
  // data we need, so we have to fetch each active offer individually, and each of those
  // fetches (unlike login/logout/remaining-credit lookups) consumes paid DIA credits
  discountCount: number;
};

// how many scf_kampanya_getir calls to have in flight at once — the listele step only gives us
// keys, so every active offer needs its own get call; running them with bounded concurrency
// instead of one at a time cuts wall-clock time roughly proportionally without hammering DIA
// with hundreds of simultaneous requests on one session
const GETIR_CONCURRENCY = 8;

export async function fetchActiveSpecialOffers(
  db: DB,
  serverCode: string,
  diaFirmCode: number,
): Promise<SpecialOffersResult> {
  const listRequest: DiaListRequest<SpecialOfferListRequestServiceName> = {
    scf_kampanya_listele: {
      firma_kodu: diaFirmCode,
      filters: [ONLY_ACTIVE_FILTER],
      params: { selectedcolumns: ["_key"] },
    },
  };

  const listResponse = await dia<
    SpecialOfferListRequestServiceName,
    DiaSpecialOfferListResponse
  >(db, { module: "scf", serverCode }, listRequest);

  const offers: DiaSpecialOffer[] = [];
  const keys = listResponse.result.map(({ _key }) => Number(_key));

  for (let i = 0; i < keys.length; i += GETIR_CONCURRENCY) {
    const batch = keys.slice(i, i + GETIR_CONCURRENCY);

    const getResponses = await Promise.all(
      batch.map((key) => {
        const getRequest: DiaGetRequest<SpecialOfferGetRequestServiceName> = {
          scf_kampanya_getir: {
            firma_kodu: diaFirmCode,
            key,
          },
        };

        return dia<
          SpecialOfferGetRequestServiceName,
          DiaSpecialOfferGetResponse
        >(db, { module: "scf", serverCode }, getRequest);
      }),
    );

    for (const getResponse of getResponses) {
      if (getResponse.result) offers.push(getResponse.result);
    }
  }

  return { offers, listedKeys: keys, discountCount: listResponse.result.length };
}

type SpecialOfferKalem = DiaSpecialOffer["m_kalemler"][number];

// DIA uses "0" (and, for numeric fields, 0) as the sentinel for "not set" throughout this API
function isUnset(value: string): boolean {
  return !value || value === "0";
}

function specialCodeArrayMatches(
  codes: DiaSpecialCode[] | null,
  value: string,
): boolean {
  if (!codes) return false;
  return codes.some(
    (code) => code.durum === "A" && String(code._key) === value,
  );
}

// converts a live DIA stock response into the subset of fields needed to match it against a
// special offer later, purely from our own DB (see DiaMatchKeys)
export function extractDiaMatchKeys(stock: DiaStock): DiaMatchKeys {
  return {
    marka: stock._key_scf_marka,
    ozelkod1: stock._key_sis_ozelkod1,
    ozelkod2: stock._key_sis_ozelkod2,
    ozelkod3: stock._key_sis_ozelkod3,
    ozelkod4: stock._key_sis_ozelkod4,
    ozelkod5: stock._key_sis_ozelkod5,
    ozelkod6: stock._key_sis_ozelkod6,
    ozelkod7: stock._key_sis_ozelkod7,
    ozelkod8: stock._key_sis_ozelkod8,
    ozelkod9: stock._key_sis_ozelkod9,
    ozelkod10: stock._key_sis_ozelkod10,
    ozelkod11: stock._key_sis_ozelkod11,
  };
}

// a kalem (campaign line item) applies to a product if the product is targeted directly by
// key, by brand, or by any özel kod slot (same slot number on both sides)
function kalemMatchesStock(
  kalem: SpecialOfferKalem,
  productDiaKey: number,
  matchKeys: DiaMatchKeys,
): boolean {
  const kalemStockKey = String(kalem._key_scf_kart);
  if (!isUnset(kalemStockKey) && kalemStockKey === String(productDiaKey)) {
    return true;
  }

  if (
    !isUnset(matchKeys.marka) &&
    specialCodeArrayMatches(kalem._key_scf_marka_kart_array, matchKeys.marka)
  ) {
    return true;
  }

  for (let slot = 1; slot <= OZELKOD_SLOT_COUNT; slot++) {
    const stockOzelkod = matchKeys[`ozelkod${slot}` as keyof DiaMatchKeys];
    if (isUnset(stockOzelkod)) continue;

    const campaignOzelkodArray = kalem[
      `_key_sis_ozelkod${slot}_kart_array` as keyof SpecialOfferKalem
    ] as DiaSpecialCode[] | null;

    if (specialCodeArrayMatches(campaignOzelkodArray, stockOzelkod)) return true;
  }

  return false;
}

// fiyatyuzde (with fiyatartieksi sign) is applied first, then indirim2..indirim20 cascade
// on top of the result in sequence — each percentage is taken off what's left after the previous one
function applyCascadingDiscount(basePrice: number, kalem: SpecialOfferKalem): number {
  const sign = kalem.fiyatartieksi === "-" ? -1 : 1;
  let price = basePrice * (1 + (sign * Number(kalem.fiyatyuzde)) / 100);

  for (let i = 2; i <= INDIRIM_FIELD_COUNT; i++) {
    const pct = Number(kalem[`indirim${i}` as keyof SpecialOfferKalem]);
    if (pct) price *= 1 - pct / 100;
  }

  return price;
}

export function parseDiaDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

// how much of a DIA WS credit a single scf_kampanya_getir call costs, per DIA's pricing.
// estimateNextSyncCost's "+1" below covers the scf_kampanya_listele call this same
// special-offer sync also makes.
const DIA_CREDIT_COST_PER_FETCH = 0.025;

export function estimateNextSyncCost(discountCount: number): string {
  return (
    discountCount * DIA_CREDIT_COST_PER_FETCH + DIA_CREDIT_COST_PER_FETCH
  ).toFixed(4);
}

export type ProductDiscount = {
  discountedPrice: string;
  discountStartsAt: Date;
  discountEndsAt: Date;
  discountDetail: string;
};

export type ProductForDiscountMatch = {
  diaKey: number;
  price: string;
  diaMatchKeys: DiaMatchKeys | null;
};

/**
 * @returns a map keyed by product diaKey with the winning discount per product. Mirrors the
 * matching/priority/cascading rules of the original DIA-stock-based computation, but reads
 * persisted product rows + persisted offers instead of requiring a live DIA fetch — this is
 * what lets discount recomputation run immediately from an offer toggle or fetch without
 * calling DIA (see recomputeFirmProductDiscounts in special-offers.ts). A product with no
 * persisted diaMatchKeys (never synced from DIA, e.g. a manually-entered raw product) is
 * skipped entirely.
 */
export function computeDiscountsFromMatchKeys(
  products: ProductForDiscountMatch[],
  offers: DiaSpecialOffer[],
): Map<number, ProductDiscount> {
  const discounts = new Map<number, ProductDiscount>();
  const winningOncelik = new Map<number, number>();

  for (const product of products) {
    if (!product.diaMatchKeys) continue;

    const basePrice = Number(product.price ?? 0);

    for (const offer of offers) {
      const oncelik = Number(offer.oncelik);

      const currentWinnerOncelik = winningOncelik.get(product.diaKey);
      if (currentWinnerOncelik !== undefined && oncelik >= currentWinnerOncelik) {
        continue;
      }

      const kalem = offer.m_kalemler.find((k) =>
        kalemMatchesStock(k, product.diaKey, product.diaMatchKeys as DiaMatchKeys),
      );
      if (!kalem) continue;

      winningOncelik.set(product.diaKey, oncelik);
      discounts.set(product.diaKey, {
        discountedPrice: applyCascadingDiscount(basePrice, kalem).toFixed(4),
        discountStartsAt: parseDiaDateTime(offer.bastarih, offer.bassaat),
        discountEndsAt: parseDiaDateTime(offer.bittarih, offer.bitsaat),
        discountDetail: offer.aciklama,
      });
    }
  }

  return discounts;
}
