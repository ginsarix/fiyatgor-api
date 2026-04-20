import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  type InferEnum,
  ilike,
  inArray,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { ONLY_ACTIVE_FILTER } from "../constants/dia.js";
import type { DB } from "../db/index.js";
import {
  barcodesTable,
  type InsertableBarcode,
} from "../db/schemas/barcodes.js";
import { firmsTable, type priceFieldEnum } from "../db/schemas/firms.js";
import {
  type InsertableProduct,
  productsTable,
  type SelectableProduct,
} from "../db/schemas/products.js";
import { dia } from "../helpers/dia.js";
import type { DiaListRequest } from "../types/dia-requests.js";
import type { DiaResponse, DiaStock } from "../types/dia-responses.js";
import { buildSelectedProductColumns } from "../utils/dia.js";

function extractBarcodesWithRelation(
  stocks: DiaStock[],
  savedProducts: SelectableProduct[],
) {
  // lookup map (diaKey -> productId)
  const productMap = new Map<number, number>(
    savedProducts
      .filter(
        (p): p is SelectableProduct & { diaKey: number } => p.diaKey !== null,
      )
      .map((p) => [p.diaKey, p.id]),
  );

  const results: InsertableBarcode[] = [];

  for (const stock of stocks) {
    const diaKey = Number(stock._key);
    const productId = productMap.get(diaKey);

    if (!productId) continue;

    const birimler = Array.isArray(stock.m_birimler) ? stock.m_birimler : [];

    for (const birim of birimler) {
      const barkodlar = Array.isArray(birim.__barkodlar)
        ? birim.__barkodlar
        : [];

      for (const barkod of barkodlar) {
        if (!barkod?.barkod) continue;

        results.push({
          productId,
          diaKey,
          barcode: barkod.barkod,
        });
      }
    }
  }

  return results;
}

export async function saveProducts(
  db: DB,
  stocks: DiaStock[],
  firmId: number,
  priceField: InferEnum<typeof priceFieldEnum>,
) {
  const products: InsertableProduct[] = stocks.map((s) => ({
    firmId,
    diaKey: Number(s._key),
    stockCode: s.stokkartkodu,
    name: s.aciklama,
    price: s[priceField] ?? "",
    currency: s.doviz1,
    vat: Number(s.kdvsatis),
    status: s.durum === "A" ? "active" : "passive",
    minQuantity: Number(s.minsiparismiktari),
    unit: s.birimadi,
    image: s.aws_url,
  }));

  const chunkSize = 300;

  let insertedProductRowsCount = 0;
  let updatedProductRowsCount = 0;
  let insertedBarcodeRowsCount = 0;
  let updatedBarcodeRowsCount = 0;
  let deletedProductRowsCount = 0;

  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);

    await db.transaction(async (tx) => {
      const upsertedProducts = await tx
        .insert(productsTable)
        .values(chunk)
        .onConflictDoUpdate({
          target: productsTable.diaKey,
          set: {
            stockCode: sql`excluded.stock_code`,
            name: sql`excluded.name`,
            price: sql`excluded.price`,
            currency: sql`excluded.currency`,
            vat: sql`excluded.vat`,
            status: sql`excluded.status`,
            minQuantity: sql`excluded.min_quantity`,
            unit: sql`excluded.unit`,
            image: sql`excluded.image`,
            updatedAt: new Date(),
          },

          // only update if different to get a correct affected row count
          setWhere: sql`
              products.stock_code IS DISTINCT FROM excluded.stock_code OR
              products.name IS DISTINCT FROM excluded.name OR
              products.price IS DISTINCT FROM excluded.price OR
              products.currency IS DISTINCT FROM excluded.currency OR
              products.vat IS DISTINCT FROM excluded.vat OR
              products.status IS DISTINCT FROM excluded.status OR
              products.min_quantity IS DISTINCT FROM excluded.min_quantity OR
              products.unit IS DISTINCT FROM excluded.unit OR
              products.image IS DISTINCT FROM excluded.image
            `,
        })
        .returning({
          id: productsTable.id,
          name: productsTable.name,
          createdAt: productsTable.createdAt,
          updatedAt: productsTable.updatedAt,
          firmId: productsTable.firmId,
          diaKey: productsTable.diaKey,
          stockCode: productsTable.stockCode,
          price: productsTable.price,
          currency: productsTable.currency,
          vat: productsTable.vat,
          stockQuantity: productsTable.stockQuantity,
          status: productsTable.status,
          minQuantity: productsTable.minQuantity,
          unit: productsTable.unit,
          image: productsTable.image,
          inserted: sql<boolean>`xmax = 0`,
        });

      const insertedCount = upsertedProducts.filter((r) => r.inserted).length;
      const updatedCount = upsertedProducts.length - insertedCount;

      insertedProductRowsCount += insertedCount;
      updatedProductRowsCount += updatedCount;

      const barcodesWithRelation = extractBarcodesWithRelation(
        stocks,
        upsertedProducts,
      );

      if (barcodesWithRelation.length) {
        const result = await tx
          .insert(barcodesTable)
          .values(barcodesWithRelation)
          .onConflictDoUpdate({
            target: barcodesTable.barcode,
            set: {
              barcode: sql`excluded.barcode`,
            },
            setWhere: sql`barcodes.barcode IS DISTINCT FROM excluded.barcode`,
          })
          .returning({
            barcode: barcodesTable.barcode,
            inserted: sql<boolean>`xmax = 0`,
          });

        const insertedCount = result.filter((r) => r.inserted).length;
        const updatedCount = result.length - insertedCount;

        insertedBarcodeRowsCount += insertedCount;
        updatedBarcodeRowsCount += updatedCount;
      }
    });
  }

  const fetchedDiaKeys = stocks.map((s) => Number(s._key));

  if (fetchedDiaKeys.length > 0) {
    const deleted = await db
      .delete(productsTable)
      .where(
        and(
          eq(productsTable.firmId, firmId),
          notInArray(productsTable.diaKey, fetchedDiaKeys),
        ),
      )
      .returning({ id: productsTable.id });

    deletedProductRowsCount = deleted.length;
  } else {
    // Nothing came back from DIA — remove all products for this firm
    const deleted = await db
      .delete(productsTable)
      .where(eq(productsTable.firmId, firmId))
      .returning({ id: productsTable.id });

    deletedProductRowsCount = deleted.length;
  }

  return {
    insertedProductRowsCount,
    updatedProductRowsCount,
    insertedBarcodeRowsCount,
    updatedBarcodeRowsCount,
    deletedProductRowsCount,
  };
}

type GetProductsRequestServiceName = "scf_stokkart_detay_listele";
type GetProductsRequest = DiaListRequest<GetProductsRequestServiceName>;

/**
 * @param request if selectedcolumns is empty {@link SELECTED_COLUMNS} will be used as a default
 */
const SORT_COLUMNS = {
  name: productsTable.name,
  price: productsTable.price,
  stockCode: productsTable.stockCode,
  status: productsTable.status,
  stockQuantity: productsTable.stockQuantity,
} as const;

export type ProductSortBy = keyof typeof SORT_COLUMNS;
export type SortOrder = "asc" | "desc";

export interface GetProductsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: ProductSortBy;
  sortOrder?: SortOrder;
}

export async function getProducts(
  db: DB,
  firmCode: string,
  {
    page = 1,
    limit = 20,
    search,
    sortBy = "stockCode",
    sortOrder = "desc",
  }: GetProductsOptions = {},
): Promise<
  { products: InsertableProduct; barcodes: InsertableBarcode | null }[] | null
> {
  // get the firm id using firmCode
  const [firm] = await db
    .select({ firmId: firmsTable.id })
    .from(firmsTable)
    .where(eq(firmsTable.firmCode, firmCode));

  if (!firm) return null;

  const offset = (page - 1) * limit;

  const searchFilter = search
    ? or(
        ilike(productsTable.name, `%${search}%`),
        ilike(productsTable.stockCode, `%${search}%`),
        exists(
          db
            .select()
            .from(barcodesTable)
            .where(
              and(
                eq(barcodesTable.productId, productsTable.id),
                ilike(barcodesTable.barcode, `%${search}%`),
              ),
            ),
        ),
      )
    : undefined;

  const whereClause = and(eq(productsTable.firmId, firm.firmId), searchFilter);

  const orderFn = sortOrder === "desc" ? desc : asc;
  const sortColumn = SORT_COLUMNS[sortBy];

  const baseProducts = await db
    .select()
    .from(productsTable)
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  const productsWithBarcodes = await db
    .select()
    .from(productsTable)
    .leftJoin(barcodesTable, eq(barcodesTable.productId, productsTable.id))
    .where(
      inArray(
        productsTable.id,
        baseProducts.map((p) => p.id),
      ),
    )
    .orderBy(asc(barcodesTable.barcode));

  return productsWithBarcodes;
}

export async function getProductsCount(
  db: DB,
  firmCode: string,
  search?: string,
): Promise<number | null> {
  // get the firm id using firmCode
  const [firm] = await db
    .select({ firmId: firmsTable.id })
    .from(firmsTable)
    .where(eq(firmsTable.firmCode, firmCode));

  if (!firm) return null;

  const searchFilter = search
    ? or(
        ilike(productsTable.name, `%${search}%`),
        ilike(productsTable.stockCode, `%${search}%`),
      )
    : undefined;

  const [result] = await db
    .select({ count: count() })
    .from(productsTable)
    .where(and(eq(productsTable.firmId, firm.firmId), searchFilter));

  return result.count;
}

export type LoadProductsFirmParam = {
  firmId: number;
  priceField: InferEnum<typeof priceFieldEnum>;
  maxProductNameCharacters: number | null;
};

export async function loadProducts(
  db: DB,
  serverCode: string,
  request: GetProductsRequest,
  firmInfo?: LoadProductsFirmParam,
) {
  let finalFirmId = firmInfo?.firmId;
  let finalPriceField = firmInfo?.priceField ?? "fiyat1";
  let finalMaxProductNameCharacters =
    firmInfo?.maxProductNameCharacters ?? null;

  if (!finalFirmId) {
    // get the firm id using serverCode
    const [firm] = await db
      .select({
        firmId: firmsTable.id,
        priceField: firmsTable.priceField,
        maxProductNameCharacters: firmsTable.maxProductNameCharacters,
      })
      .from(firmsTable)
      .where(eq(firmsTable.diaServerCode, serverCode));

    if (!firm) {
      throw new Error(
        "Firm could not be found with the given server code in loadProducts",
      );
    }

    finalFirmId = firm.firmId;
    finalPriceField = firm.priceField;
    finalMaxProductNameCharacters = firm.maxProductNameCharacters;
  }

  const listele = request.scf_stokkart_detay_listele;

  const finalRequest: GetProductsRequest = {
    scf_stokkart_detay_listele: {
      ...listele,
      filters: [ONLY_ACTIVE_FILTER],
      params: {
        ...listele.params,
        selectedcolumns: listele.params?.selectedcolumns?.length
          ? listele.params.selectedcolumns
          : buildSelectedProductColumns(finalPriceField),
      },
    },
  };

  const fetchedProducts = await dia<
    GetProductsRequestServiceName,
    DiaResponse<DiaStock[]>
  >(db, { module: "scf", serverCode }, finalRequest);

  const finalProducts =
    finalMaxProductNameCharacters !== null
      ? fetchedProducts.result.map((p) => ({
          ...p,
          aciklama:
            p.aciklama?.slice(undefined, finalMaxProductNameCharacters) ?? "",
        }))
      : fetchedProducts.result;

  return await saveProducts(db, finalProducts, finalFirmId, finalPriceField);
}

export type RawProductInput = {
  stockCode: string;
  name: string;
  price: string;
  currency?: string | null;
  vat?: number | null;
  status?: "active" | "passive";
  minQuantity?: number;
  unit?: string;
  image?: string | null;
  barcodes?: string[];
};

type ProductIdAndStockCode = Pick<SelectableProduct, "id" | "stockCode">;

function extractRawBarcodesWithRelation(
  rawProducts: RawProductInput[],
  savedProducts: ProductIdAndStockCode[],
) {
  // lookup map (stockCode -> productId)
  const productMap = new Map<string, number>(
    savedProducts.map((p) => [p.stockCode, p.id]),
  );

  const results: InsertableBarcode[] = [];

  for (const raw of rawProducts) {
    if (!raw.barcodes?.length) continue;

    const productId = productMap.get(raw.stockCode);
    if (!productId) continue;

    for (const barcode of raw.barcodes) {
      if (!barcode) continue;
      results.push({
        productId,
        barcode,
      });
    }
  }

  return results;
}

export async function saveRawProducts(
  db: DB,
  firmId: number,
  rawProducts: RawProductInput[],
  deleteStale = false,
) {
  const products: InsertableProduct[] = rawProducts.map((r) => ({
    firmId,
    stockCode: r.stockCode,
    name: r.name,
    price: r.price,
    currency: r.currency,
    vat: r.vat ?? undefined,
    status: r.status ?? "active",
    minQuantity: r.minQuantity ?? 1,
    unit: r.unit ?? "AD",
    image: r.image,
  }));

  const chunkSize = 300;

  let insertedProductRowsCount = 0;
  let updatedProductRowsCount = 0;
  let insertedBarcodeRowsCount = 0;
  let updatedBarcodeRowsCount = 0;
  let deletedProductRowsCount = 0;

  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const rawChunk = rawProducts.slice(i, i + chunkSize);

    await db.transaction(async (tx) => {
      const upsertedProducts = await tx
        .insert(productsTable)
        .values(chunk)
        .onConflictDoUpdate({
          target: [productsTable.firmId, productsTable.stockCode],
          set: {
            name: sql`excluded.name`,
            price: sql`excluded.price`,
            currency: sql`excluded.currency`,
            vat: sql`excluded.vat`,
            status: sql`excluded.status`,
            minQuantity: sql`excluded.min_quantity`,
            unit: sql`excluded.unit`,
            image: sql`excluded.image`,
            updatedAt: new Date(),
          },
          setWhere: sql`
            products.name IS DISTINCT FROM excluded.name OR
            products.price IS DISTINCT FROM excluded.price OR
            products.currency IS DISTINCT FROM excluded.currency OR
            products.vat IS DISTINCT FROM excluded.vat OR
            products.status IS DISTINCT FROM excluded.status OR
            products.min_quantity IS DISTINCT FROM excluded.min_quantity OR
            products.unit IS DISTINCT FROM excluded.unit OR
            products.image IS DISTINCT FROM excluded.image
          `,
        })
        .returning({
          id: productsTable.id,
          stockCode: productsTable.stockCode,
          inserted: sql<boolean>`xmax = 0`,
        });

      const insertedCount = upsertedProducts.filter((r) => r.inserted).length;
      const updatedCount = upsertedProducts.length - insertedCount;

      insertedProductRowsCount += insertedCount;
      updatedProductRowsCount += updatedCount;

      const barcodesWithRelation = extractRawBarcodesWithRelation(
        rawChunk,
        upsertedProducts,
      );

      if (barcodesWithRelation.length) {
        const result = await tx
          .insert(barcodesTable)
          .values(barcodesWithRelation)
          .onConflictDoUpdate({
            target: barcodesTable.barcode,
            set: {
              barcode: sql`excluded.barcode`,
            },
            setWhere: sql`barcodes.barcode IS DISTINCT FROM excluded.barcode`,
          })
          .returning({
            barcode: barcodesTable.barcode,
            inserted: sql<boolean>`xmax = 0`,
          });

        const insertedBarcodes = result.filter((r) => r.inserted).length;
        const updatedBarcodes = result.length - insertedBarcodes;

        insertedBarcodeRowsCount += insertedBarcodes;
        updatedBarcodeRowsCount += updatedBarcodes;
      }
    });
  }

  if (deleteStale) {
    const inputStockCodes = rawProducts.map((r) => r.stockCode);

    if (inputStockCodes.length > 0) {
      const deleted = await db
        .delete(productsTable)
        .where(
          and(
            eq(productsTable.firmId, firmId),
            notInArray(productsTable.stockCode, inputStockCodes),
          ),
        )
        .returning({ id: productsTable.id });

      deletedProductRowsCount = deleted.length;
    } else {
      // Nothing in input — remove all products for this firm
      const deleted = await db
        .delete(productsTable)
        .where(eq(productsTable.firmId, firmId))
        .returning({ id: productsTable.id });

      deletedProductRowsCount = deleted.length;
    }
  }

  return {
    insertedProductRowsCount,
    updatedProductRowsCount,
    insertedBarcodeRowsCount,
    updatedBarcodeRowsCount,
    deletedProductRowsCount,
  };
}

export const findProductByAnyBarcode = (
  db: DB,
  firmId: number,
  barcode: string,
) => {
  return db.query.productsTable.findFirst({
    where: (p, { and, eq, exists }) =>
      and(
        eq(p.firmId, firmId),
        exists(
          db
            .select()
            .from(barcodesTable)
            .where(
              and(
                eq(barcodesTable.productId, p.id),
                eq(barcodesTable.barcode, barcode),
              ),
            ),
        ),
      ),
    with: { equivalentBarcodes: true },
  });
};
