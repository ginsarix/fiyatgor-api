import { and, asc, count, desc, eq, ilike, isNotNull, notInArray, or } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { firmsTable } from "../db/schemas/firms.js";
import { productsTable } from "../db/schemas/products.js";
import { specialOffersTable } from "../db/schemas/special-offers.js";
import type { DiaSpecialOffer } from "../types/dia-responses.js";
import {
  computeDiscountsFromMatchKeys,
  estimateNextSyncCost,
  fetchActiveSpecialOffers,
  parseDiaDateTime,
  type ProductForDiscountMatch,
} from "./discounts.js";

/**
 * Whether this firm has run at least one product sync since `diaMatchKeys` shipped. Used both
 * to gate the (costly, per-offer DIA-queried) special-offer sync up front, and as a signal for
 * `recomputeFirmProductDiscounts` — the `diaMatchKeys IS NOT NULL` filter there is what actually
 * protects correctness regardless of this value.
 */
export async function hasFirmSyncedProducts(
  db: DB,
  firmId: number,
): Promise<boolean> {
  const [syncedProduct] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.firmId, firmId),
        isNotNull(productsTable.diaMatchKeys),
      ),
    )
    .limit(1);

  return !!syncedProduct;
}

/**
 * Recomputes and persists discount fields for a firm's products, from currently-stored
 * special offers — no DIA call. Called after a product sync, after a special-offer sync, and
 * after a single offer's enabled toggle, so a toggle takes effect immediately. Every product
 * with a `diaMatchKeys` is written on every call (matched products get fresh values, unmatched
 * products get nulled out) — that's what makes disabling (or removing) an offer immediately
 * clear the discount off any product that offer used to win on.
 *
 * Products with `diaMatchKeys === null` are skipped entirely rather than treated as "no offer
 * matches". `diaMatchKeys` is a new column populated only going forward from product syncs, so
 * every pre-existing product row starts out null — if this ran unconditionally, an offer
 * toggle or sync fired before a firm's first post-migration product sync would incorrectly
 * clear discount data that was still correct under the old code. Skipping them leaves that
 * data untouched until their own next product sync backfills the match keys and folds them
 * into a subsequent recompute correctly.
 */
export async function recomputeFirmProductDiscounts(
  db: DB,
  firmId: number,
): Promise<{ discountedProductCount: number; hasSyncedProducts: boolean }> {
  const hasSyncedProducts = await hasFirmSyncedProducts(db, firmId);

  const [firm] = await db
    .select({ discountsEnabled: firmsTable.discountsEnabled })
    .from(firmsTable)
    .where(eq(firmsTable.id, firmId));

  if (!firm) return { discountedProductCount: 0, hasSyncedProducts };

  if (!firm.discountsEnabled) {
    await db
      .update(productsTable)
      .set({
        discountedPrice: null,
        discountStartsAt: null,
        discountEndsAt: null,
        discountDetail: null,
      })
      .where(
        and(
          eq(productsTable.firmId, firmId),
          or(
            isNotNull(productsTable.discountedPrice),
            isNotNull(productsTable.discountStartsAt),
            isNotNull(productsTable.discountEndsAt),
            isNotNull(productsTable.discountDetail),
          ),
        ),
      );

    return { discountedProductCount: 0, hasSyncedProducts };
  }

  const enabledOffers = await db
    .select({ diaData: specialOffersTable.diaData })
    .from(specialOffersTable)
    .where(
      and(
        eq(specialOffersTable.firmId, firmId),
        eq(specialOffersTable.enabled, true),
      ),
    );

  const offers = enabledOffers
    .map((o) => o.diaData)
    .filter((d): d is DiaSpecialOffer => d !== null);

  const products = await db
    .select({
      id: productsTable.id,
      diaKey: productsTable.diaKey,
      price: productsTable.price,
      diaMatchKeys: productsTable.diaMatchKeys,
      discountedPrice: productsTable.discountedPrice,
      discountStartsAt: productsTable.discountStartsAt,
      discountEndsAt: productsTable.discountEndsAt,
      discountDetail: productsTable.discountDetail,
    })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.firmId, firmId),
        isNotNull(productsTable.diaKey),
        isNotNull(productsTable.diaMatchKeys),
      ),
    );

  const matchInput: ProductForDiscountMatch[] = products
    .filter((p): p is typeof p & { diaKey: number } => p.diaKey !== null)
    .map((p) => ({
      diaKey: p.diaKey,
      price: p.price,
      diaMatchKeys: p.diaMatchKeys,
    }));

  const discounts = computeDiscountsFromMatchKeys(matchInput, offers);

  const chunkSize = 300;

  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);

    await db.transaction(async (tx) => {
      for (const product of chunk) {
        const discount =
          product.diaKey !== null ? discounts.get(product.diaKey) : undefined;

        const nextDiscountedPrice = discount?.discountedPrice ?? null;
        const nextDiscountStartsAt = discount?.discountStartsAt ?? null;
        const nextDiscountEndsAt = discount?.discountEndsAt ?? null;
        const nextDiscountDetail = discount?.discountDetail ?? null;

        const unchanged =
          product.discountedPrice === nextDiscountedPrice &&
          product.discountStartsAt?.getTime() === nextDiscountStartsAt?.getTime() &&
          product.discountEndsAt?.getTime() === nextDiscountEndsAt?.getTime() &&
          product.discountDetail === nextDiscountDetail;

        if (unchanged) continue;

        await tx
          .update(productsTable)
          .set({
            discountedPrice: nextDiscountedPrice,
            discountStartsAt: nextDiscountStartsAt,
            discountEndsAt: nextDiscountEndsAt,
            discountDetail: nextDiscountDetail,
          })
          .where(eq(productsTable.id, product.id));
      }
    });
  }

  return { discountedProductCount: discounts.size, hasSyncedProducts };
}

/**
 * Fetches the firm's currently-active DIA special offers and persists them: existing offers
 * (by DIA key) are updated in place (their `enabled` flag is left untouched — Postgres only
 * touches columns named in `set`), new offers are inserted with `enabled` defaulting to true,
 * and any previously-stored offer no longer in the fresh fetch is deleted outright (DIA
 * either removed it or flipped it passive — this codebase doesn't distinguish the two, see
 * spec). Finishes by recomputing product discounts from the newly-persisted offer set.
 */
export async function syncSpecialOffers(
  db: DB,
  serverCode: string,
  firmId: number,
  diaFirmCode: number,
): Promise<{
  offersSeen: number;
  addedCount: number;
  updatedCount: number;
  removedCount: number;
  discountedProductCount: number;
  hasSyncedProducts: boolean;
}> {
  const { offers, listedKeys, discountCount } = await fetchActiveSpecialOffers(
    db,
    serverCode,
    diaFirmCode,
  );

  const existingOffers = await db
    .select({ diaKey: specialOffersTable.diaKey })
    .from(specialOffersTable)
    .where(eq(specialOffersTable.firmId, firmId));

  const existingDiaKeys = new Set(existingOffers.map((o) => o.diaKey));

  let addedCount = 0;
  let updatedCount = 0;

  for (const offer of offers) {
    const diaKey = Number(offer._key);

    await db
      .insert(specialOffersTable)
      .values({
        firmId,
        diaKey,
        name: offer.aciklama,
        priority: offer.oncelik,
        startsAt: parseDiaDateTime(offer.bastarih, offer.bassaat),
        endsAt: parseDiaDateTime(offer.bittarih, offer.bitsaat),
        diaData: offer,
      })
      .onConflictDoUpdate({
        target: [specialOffersTable.firmId, specialOffersTable.diaKey],
        set: {
          name: offer.aciklama,
          priority: offer.oncelik,
          startsAt: parseDiaDateTime(offer.bastarih, offer.bassaat),
          endsAt: parseDiaDateTime(offer.bittarih, offer.bitsaat),
          diaData: offer,
          updatedAt: new Date(),
        },
      });

    if (existingDiaKeys.has(diaKey)) updatedCount++;
    else addedCount++;
  }

  const fetchedDiaKeys = listedKeys;

  const removed =
    fetchedDiaKeys.length > 0
      ? await db
          .delete(specialOffersTable)
          .where(
            and(
              eq(specialOffersTable.firmId, firmId),
              notInArray(specialOffersTable.diaKey, fetchedDiaKeys),
            ),
          )
          .returning({ id: specialOffersTable.id })
      : await db
          .delete(specialOffersTable)
          .where(eq(specialOffersTable.firmId, firmId))
          .returning({ id: specialOffersTable.id });

  await db
    .update(firmsTable)
    .set({ estimatedNextSyncCost: estimateNextSyncCost(discountCount) })
    .where(eq(firmsTable.id, firmId));

  const { discountedProductCount, hasSyncedProducts } =
    await recomputeFirmProductDiscounts(db, firmId);

  return {
    offersSeen: offers.length,
    addedCount,
    updatedCount,
    removedCount: removed.length,
    discountedProductCount,
    hasSyncedProducts,
  };
}

const SPECIAL_OFFER_SORT_COLUMNS = {
  name: specialOffersTable.name,
  priority: specialOffersTable.priority,
  startsAt: specialOffersTable.startsAt,
  endsAt: specialOffersTable.endsAt,
  enabled: specialOffersTable.enabled,
} as const;

export type SpecialOfferSortBy = keyof typeof SPECIAL_OFFER_SORT_COLUMNS;
export type SortOrder = "asc" | "desc";

export interface GetSpecialOffersOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: SpecialOfferSortBy;
  sortOrder?: SortOrder;
}

const specialOfferListColumns = {
  id: specialOffersTable.id,
  firmId: specialOffersTable.firmId,
  diaKey: specialOffersTable.diaKey,
  enabled: specialOffersTable.enabled,
  name: specialOffersTable.name,
  priority: specialOffersTable.priority,
  startsAt: specialOffersTable.startsAt,
  endsAt: specialOffersTable.endsAt,
  createdAt: specialOffersTable.createdAt,
  updatedAt: specialOffersTable.updatedAt,
};

export async function getSpecialOffers(
  db: DB,
  firmId: number,
  {
    page = 1,
    limit = 20,
    search,
    sortBy = "name",
    sortOrder = "desc",
  }: GetSpecialOffersOptions = {},
) {
  const offset = (page - 1) * limit;

  const searchFilter = search
    ? ilike(specialOffersTable.name, `%${search}%`)
    : undefined;

  const whereClause = and(eq(specialOffersTable.firmId, firmId), searchFilter);

  const orderFn = sortOrder === "desc" ? desc : asc;
  const sortColumn = SPECIAL_OFFER_SORT_COLUMNS[sortBy];

  return await db
    .select(specialOfferListColumns)
    .from(specialOffersTable)
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);
}

export async function getSpecialOffersCount(
  db: DB,
  firmId: number,
  search?: string,
): Promise<number> {
  const searchFilter = search
    ? ilike(specialOffersTable.name, `%${search}%`)
    : undefined;

  const [result] = await db
    .select({ count: count() })
    .from(specialOffersTable)
    .where(and(eq(specialOffersTable.firmId, firmId), searchFilter));

  return result.count;
}

export async function setSpecialOfferEnabled(
  db: DB,
  firmId: number,
  id: number,
  enabled: boolean,
) {
  const [updated] = await db
    .update(specialOffersTable)
    .set({ enabled })
    .where(
      and(eq(specialOffersTable.id, id), eq(specialOffersTable.firmId, firmId)),
    )
    .returning(specialOfferListColumns);

  if (!updated) return null;

  const { discountedProductCount, hasSyncedProducts } =
    await recomputeFirmProductDiscounts(db, firmId);

  return { specialOffer: updated, discountedProductCount, hasSyncedProducts };
}
