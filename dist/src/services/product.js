import { count, eq, sql } from "drizzle-orm";
import { ONLY_ACTIVE_FILTER } from "../constants/dia.js";
import { SELECTED_COLUMNS } from "../constants/products.js";
import { barcodesTable, } from "../db/schemas/barcodes.js";
import { firmsTable } from "../db/schemas/firms.js";
import { productsTable, } from "../db/schemas/products.js";
import { dia } from "../helpers/dia.js";
function extractBarcodesWithRelation(stocks, savedProducts) {
    // lookup map (diaKey -> productId)
    const productMap = new Map(savedProducts.map((p) => [p.diaKey, p.id]));
    const results = [];
    for (const stock of stocks) {
        const diaKey = Number(stock._key);
        const productId = productMap.get(diaKey);
        if (!productId)
            continue;
        const birimler = Array.isArray(stock.m_birimler) ? stock.m_birimler : [];
        for (const birim of birimler) {
            const barkodlar = Array.isArray(birim.__barkodlar)
                ? birim.__barkodlar
                : [];
            for (const barkod of barkodlar) {
                if (!barkod?.barkod)
                    continue;
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
export async function saveProducts(db, stocks, firmId) {
    const products = stocks.map((s) => ({
        firmId,
        diaKey: Number(s._key),
        stockCode: s.stokkartkodu,
        name: s.aciklama,
        price: s.fiyat1,
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
    for (let i = 0; i < products.length; i += chunkSize) {
        const chunk = products.slice(i, i + chunkSize);
        await db.transaction(async (tx) => {
            const upsertedProducts = await tx
                .insert(productsTable)
                .values(chunk)
                .onConflictDoUpdate({
                target: productsTable.diaKey,
                set: {
                    stockCode: sql `excluded.stock_code`,
                    name: sql `excluded.name`,
                    price: sql `excluded.price`,
                    currency: sql `excluded.currency`,
                    vat: sql `excluded.vat`,
                    status: sql `excluded.status`,
                    minQuantity: sql `excluded.min_quantity`,
                    unit: sql `excluded.unit`,
                    image: sql `excluded.image`,
                    updatedAt: new Date(),
                },
                // only update if different to get a correct affected row count
                setWhere: sql `
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
                inserted: sql `xmax = 0`,
            });
            insertedProductRowsCount += upsertedProducts.filter((r) => r.inserted).length;
            updatedProductRowsCount += upsertedProducts.length;
            const barcodesWithRelation = extractBarcodesWithRelation(stocks, upsertedProducts);
            if (barcodesWithRelation.length) {
                const result = await tx
                    .insert(barcodesTable)
                    .values(barcodesWithRelation)
                    .onConflictDoUpdate({
                    target: barcodesTable.diaKey,
                    set: {
                        barcode: sql `excluded.barcode`,
                    },
                    setWhere: sql `barcodes.barcode IS DISTINCT FROM excluded.barcode`,
                })
                    .returning({
                    barcode: barcodesTable.barcode,
                    inserted: sql `xmax = 0`,
                });
                insertedBarcodeRowsCount += result.length;
                updatedBarcodeRowsCount += result.filter((r) => r.inserted).length;
            }
        });
    }
    return {
        insertedProductRowsCount,
        updatedProductRowsCount,
        insertedBarcodeRowsCount,
        updatedBarcodeRowsCount,
    };
}
/**
 * @param request if selectedcolumns is empty {@link SELECTED_COLUMNS} will be used as a default
 */
export async function getProducts(db, serverCode, page = 1, limit = 20) {
    // get the firm id using serverCode
    const [firm] = await db
        .select({ firmId: firmsTable.id })
        .from(firmsTable)
        .where(eq(firmsTable.diaServerCode, serverCode));
    if (!firm)
        return null;
    const offset = (page - 1) * limit;
    const existingProducts = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.firmId, firm.firmId))
        .limit(limit)
        .offset(offset);
    return existingProducts;
}
export async function getProductsCount(db, serverCode) {
    // get the firm id using serverCode
    const [firm] = await db
        .select({ firmId: firmsTable.id })
        .from(firmsTable)
        .where(eq(firmsTable.diaServerCode, serverCode));
    if (!firm)
        return null;
    const [product] = await db
        .select({ count: count() })
        .from(productsTable)
        .where(eq(productsTable.firmId, firm.firmId));
    return product.count;
}
export async function loadProducts(db, serverCode, request, firmId) {
    const listele = request.scf_stokkart_detay_listele;
    const finalRequest = {
        scf_stokkart_detay_listele: {
            ...listele,
            filters: [ONLY_ACTIVE_FILTER],
            params: {
                ...listele.params,
                selectedcolumns: listele.params?.selectedcolumns?.length
                    ? listele.params.selectedcolumns
                    : SELECTED_COLUMNS,
            },
        },
    };
    let finalFirmId = firmId;
    if (!finalFirmId) {
        // get the firm id using serverCode
        const [firm] = await db
            .select({ firmId: firmsTable.id })
            .from(firmsTable)
            .where(eq(firmsTable.diaServerCode, serverCode));
        if (!firm) {
            throw new Error("Firm could not be found with the given server code in loadProducts");
        }
        finalFirmId = firm.firmId;
    }
    const fetchedProducts = await dia(db, { module: "scf", serverCode }, finalRequest);
    return await saveProducts(db, fetchedProducts.result, finalFirmId);
}
export const findProductByAnyBarcode = (db, firmId, barcode) => {
    return db.query.productsTable.findFirst({
        where: (p, { and, eq, exists }) => and(eq(p.firmId, firmId), exists(db
            .select()
            .from(barcodesTable)
            .where(and(eq(barcodesTable.productId, p.id), eq(barcodesTable.barcode, barcode))))),
        with: { equivalentBarcodes: true },
    });
};
