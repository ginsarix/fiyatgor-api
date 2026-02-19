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
    diaApiKey: z.string().min(1),
    diaFirmCode: z.number().int().positive(),
});
export const jobValidation = z.object({
    frequency: z.number().int().positive(),
    unit: z.enum(["hour", "day", "month"]),
});
