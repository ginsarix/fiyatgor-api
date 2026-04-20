import { z } from "zod";

export const serverCodeValidation = z
  .string()
  .min(1, { error: "Sunucu kodu boş olamaz" });

export const firmCodeValidation = z
  .string()
  .min(1, { error: "Firma kodu boş olamaz" });

export const authFormValidation = z.object({
  email: z.email().min(1, { error: "E-posta boş olamaz" }),
  password: z.string().min(1, { error: "Parola boş olamaz" }),
});

export const firmFormValidation = z.object({
  firmCode: z.string().min(1),
  name: z.string().min(1),
  diaServerCode: z.string().nullish(),
  diaUsername: z.string().nullish(),
  diaPassword: z.string().nullish(),
  diaApiKey: z.string().nullish(),
  diaFirmCode: z.number().int().positive().nullish(),
  diaPeriodCode: z.number().int().nonnegative().nullish(),

  priceField: z
    .enum([
      "fiyat1",
      "fiyat2",
      "fiyat3",
      "fiyat4",
      "fiyat5",
      "fiyat6",
      "fiyat7",
      "fiyat8",
      "fiyat9",
      "fiyat10",
    ])
    .default("fiyat1"),

  maxProductNameCharacters: z
    .number({
      error: "Ürün adı uzunluğu geçerli bir sayı olmalıdır",
    })
    .int({
      error: "Ürün adı uzunluğu geçerli bir sayı olmalıdır",
    })
    .positive({
      error: "Ürün adı uzunluğu geçerli bir sayı olmalıdır",
    })
    .nullish()
    .default(null),
});

export const userFormValidation = z.object({
  firmId: z.number().int().positive(),
  name: z.string().min(1),
  email: z.string().min(1).max(255),
  password: z.string().min(6),
  role: z.enum(["admin", "superadmin"]).nullish(),
});

export const jobValidation = z.object({
  frequency: z.number().int().positive(),
  unit: z.enum(["minute", "hour", "day", "month"]),
});

export const stockRowSchema = z.object({
  stockCode: z.string().min(1, { error: "Stok Kart Kodu boş olamaz" }),
  name: z.string().min(1, { error: "Ürün adı boş olamaz" }),
  price: z.string().default("0"),
  currency: z.string().default("TRY"),
  vat: z.coerce.number().default(0),
  minQuantity: z.coerce.number().default(1),
  unit: z.string().default("AD"),
  barcodes: z.string().array().max(5),
});
