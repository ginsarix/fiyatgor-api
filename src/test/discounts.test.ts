import { describe, expect, it } from "vitest";
import {
  computeDiscountsFromMatchKeys,
  type ProductForDiscountMatch,
} from "../services/discounts.js";
import type { DiaMatchKeys, DiaSpecialOffer } from "../types/dia-responses.js";

const emptyMatchKeys: DiaMatchKeys = {
  marka: "0",
  ozelkod1: "0",
  ozelkod2: "0",
  ozelkod3: "0",
  ozelkod4: "0",
  ozelkod5: "0",
  ozelkod6: "0",
  ozelkod7: "0",
  ozelkod8: "0",
  ozelkod9: "0",
  ozelkod10: "0",
  ozelkod11: "0",
};

function makeOffer(overrides: Partial<DiaSpecialOffer> = {}): DiaSpecialOffer {
  return {
    _key: "1",
    aciklama: "Test kampanyası",
    durum: "A",
    oncelik: "0.000000",
    bassaat: "00:00:00",
    bastarih: "2020-01-01",
    bitsaat: "23:59:59",
    bittarih: "2030-01-01",
    m_kalemler: [
      {
        _key: 1,
        _key_scf_kart: 0,
        _key_scf_marka_kart_array: null,
        _key_sis_ozelkod1_kart_array: null,
        _key_sis_ozelkod2_kart_array: null,
        _key_sis_ozelkod3_kart_array: null,
        _key_sis_ozelkod4_kart_array: null,
        _key_sis_ozelkod5_kart_array: null,
        _key_sis_ozelkod6_kart_array: null,
        _key_sis_ozelkod7_kart_array: null,
        _key_sis_ozelkod8_kart_array: null,
        _key_sis_ozelkod9_kart_array: null,
        _key_sis_ozelkod10_kart_array: null,
        _key_sis_ozelkod11_kart_array: null,
        fiyatartieksi: "-",
        fiyatyuzde: "10.000000",
        indirim2: "0",
        indirim3: "0",
        indirim4: "0",
        indirim5: "0",
        indirim6: "0",
        indirim7: "0",
        indirim8: "0",
        indirim9: "0",
        indirim10: "0",
        indirim11: "0",
        indirim12: "0",
        indirim13: "0",
        indirim14: "0",
        indirim15: "0",
        indirim16: "0",
        indirim17: "0",
        indirim18: "0",
        indirim19: "0",
        indirim20: "0",
      },
    ],
    ...overrides,
  };
}

describe("computeDiscountsFromMatchKeys", () => {
  it("matches a product directly by its own diaKey and applies the percentage discount", () => {
    const offer = makeOffer({
      m_kalemler: [
        {
          ...makeOffer().m_kalemler[0],
          _key_scf_kart: 42,
        },
      ],
    });

    const products: ProductForDiscountMatch[] = [
      { diaKey: 42, price: "100.0000", diaMatchKeys: emptyMatchKeys },
      { diaKey: 43, price: "100.0000", diaMatchKeys: emptyMatchKeys },
    ];

    const discounts = computeDiscountsFromMatchKeys(products, [offer]);

    expect(discounts.get(42)?.discountedPrice).toBe("90.0000");
    expect(discounts.has(43)).toBe(false);
  });

  it("skips products with no persisted match keys", () => {
    const offer = makeOffer({
      m_kalemler: [{ ...makeOffer().m_kalemler[0], _key_scf_kart: 42 }],
    });

    const products: ProductForDiscountMatch[] = [
      { diaKey: 42, price: "100.0000", diaMatchKeys: null },
    ];

    const discounts = computeDiscountsFromMatchKeys(products, [offer]);

    expect(discounts.size).toBe(0);
  });

  it("matches by brand key when the special-code array contains an active entry", () => {
    const offer = makeOffer({
      m_kalemler: [
        {
          ...makeOffer().m_kalemler[0],
          _key_scf_marka_kart_array: [{ _key: 70272, durum: "A" }],
        },
      ],
    });

    const products: ProductForDiscountMatch[] = [
      {
        diaKey: 1,
        price: "50.0000",
        diaMatchKeys: { ...emptyMatchKeys, marka: "70272" },
      },
    ];

    const discounts = computeDiscountsFromMatchKeys(products, [offer]);

    expect(discounts.get(1)?.discountedPrice).toBe("45.0000");
  });

  it("picks the lowest oncelik when multiple offers match the same product", () => {
    const matchKeys: DiaMatchKeys = { ...emptyMatchKeys, ozelkod1: "5" };

    const highPriorityOffer = makeOffer({
      _key: "1",
      oncelik: "0.000000",
      aciklama: "Öncelikli kampanya",
      m_kalemler: [
        {
          ...makeOffer().m_kalemler[0],
          _key_sis_ozelkod1_kart_array: [{ _key: 5, durum: "A" }],
          fiyatyuzde: "50.000000",
        },
      ],
    });

    const lowPriorityOffer = makeOffer({
      _key: "2",
      oncelik: "1.000000",
      aciklama: "Düşük öncelikli kampanya",
      m_kalemler: [
        {
          ...makeOffer().m_kalemler[0],
          _key_sis_ozelkod1_kart_array: [{ _key: 5, durum: "A" }],
          fiyatyuzde: "10.000000",
        },
      ],
    });

    const products: ProductForDiscountMatch[] = [
      { diaKey: 9, price: "200.0000", diaMatchKeys: matchKeys },
    ];

    const discounts = computeDiscountsFromMatchKeys(products, [
      lowPriorityOffer,
      highPriorityOffer,
    ]);

    expect(discounts.get(9)?.discountDetail).toBe("Öncelikli kampanya");
    expect(discounts.get(9)?.discountedPrice).toBe("100.0000");
  });
});
