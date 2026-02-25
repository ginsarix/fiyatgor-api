import { z } from "zod";

export const serverCodeValidation = z
  .string()
  .min(1, { error: "Sunucu kodu boş olamaz" });

export const authFormValidation = z.object({
  email: z.email().min(1, { error: "E-posta boş olamaz" }),
  password: z.string().min(1, { error: "Parola boş olamaz" }),
});

export const firmFormValidation = z.object({
  name: z.string().min(1),
  diaServerCode: z.string().min(1),
  diaUsername: z.string().min(1),
  diaPassword: z.string().min(1),
  diaApiKey: z.string().nullish(),
  diaFirmCode: z.number().int().positive(),
  diaPeriodCode: z.number().int().nonnegative().nullish(),
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
