import type { InferEnum } from "drizzle-orm";
import { ONLY_ACTIVE_FILTER } from "../constants/dia.js";
import type { DB } from "../db/index.js";
import type { priceFieldEnum } from "../db/schemas/firms.js";
import { dia } from "../helpers/dia.js";
import type { DiaGetRequest, DiaListRequest } from "../types/dia-requests.js";
import type {
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
  // number of scf_kampanya_getir calls made — the listele step doesn't expose the discount
  // data we need, so we have to fetch each active offer individually, and each of those
  // fetches (unlike login/logout/remaining-credit lookups) consumes paid DIA credits
  discountCount: number;
};

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

  for (const { _key } of listResponse.result) {
    const getRequest: DiaGetRequest<SpecialOfferGetRequestServiceName> = {
      scf_kampanya_getir: {
        firma_kodu: diaFirmCode,
        key: Number(_key),
      },
    };

    const getResponse = await dia<
      SpecialOfferGetRequestServiceName,
      DiaSpecialOfferGetResponse
    >(db, { module: "scf", serverCode }, getRequest);

    if (getResponse.result) offers.push(getResponse.result);
  }

  return { offers, discountCount: listResponse.result.length };
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

// a kalem (campaign line item) applies to a stock if the stock is targeted directly by key,
// by brand, or by any özel kod slot (same slot number on both sides)
function kalemMatchesStock(kalem: SpecialOfferKalem, stock: DiaStock): boolean {
  const kalemStockKey = String(kalem._key_scf_kart);
  if (!isUnset(kalemStockKey) && kalemStockKey === stock._key) return true;

  if (
    !isUnset(stock._key_scf_marka) &&
    specialCodeArrayMatches(kalem._key_scf_marka_kart_array, stock._key_scf_marka)
  ) {
    return true;
  }

  for (let slot = 1; slot <= OZELKOD_SLOT_COUNT; slot++) {
    const stockOzelkod = stock[
      `_key_sis_ozelkod${slot}` as keyof DiaStock
    ] as string;
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

function parseDiaDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

// how much of a DIA WS credit a single fetch costs, per DIA's pricing — the same rate applies
// to the one scf_stokkart_detay_listele call and every scf_kampanya_getir call
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

/**
 * @returns a map keyed by stock._key (DIA product key) with the winning discount per stock.
 * When a stock matches multiple offers, the one with the lowest `oncelik` wins; ties go to
 * whichever matching offer was encountered first.
 */
export function computeProductDiscounts(
  stocks: DiaStock[],
  offers: DiaSpecialOffer[],
  priceField: InferEnum<typeof priceFieldEnum>,
): Map<string, ProductDiscount> {
  const discounts = new Map<string, ProductDiscount>();
  const winningOncelik = new Map<string, number>();

  for (const stock of stocks) {
    const basePrice = Number(stock[priceField] ?? 0);

    for (const offer of offers) {
      const oncelik = Number(offer.oncelik);

      const currentWinnerOncelik = winningOncelik.get(stock._key);
      if (currentWinnerOncelik !== undefined && oncelik >= currentWinnerOncelik) {
        continue;
      }

      const kalem = offer.m_kalemler.find((k) => kalemMatchesStock(k, stock));
      if (!kalem) continue;

      winningOncelik.set(stock._key, oncelik);
      discounts.set(stock._key, {
        discountedPrice: applyCascadingDiscount(basePrice, kalem).toFixed(4),
        discountStartsAt: parseDiaDateTime(offer.bastarih, offer.bassaat),
        discountEndsAt: parseDiaDateTime(offer.bittarih, offer.bitsaat),
        discountDetail: offer.aciklama,
      });
    }
  }

  return discounts;
}
