import { z } from "@hono/zod-openapi";

// ─── Primitives ──────────────────────────────────────────────────────────────

export const MessageSchema = z
  .object({ message: z.string() })
  .openapi("Message");

// ─── Session ─────────────────────────────────────────────────────────────────

export const SessionSchema = z
  .object({
    userId: z.number().int(),
    serverCode: z.string(),
    name: z.string(),
    role: z.enum(["admin", "superadmin"]),
  })
  .openapi("Session");

export const SessionResponseSchema = z
  .object({
    session: SessionSchema,
    message: z.string(),
  })
  .openapi("SessionResponse");

// ─── User ────────────────────────────────────────────────────────────────────

export const UserSchema = z
  .object({
    id: z.number().int(),
    firmId: z.number().int(),
    name: z.string(),
    email: z.string(),
    role: z.enum(["admin", "superadmin"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().nullable(),
  })
  .openapi("User");

export const UsersResponseSchema = z
  .object({
    message: z.string(),
    users: z.array(UserSchema),
  })
  .openapi("UsersResponse");

export const UserResponseSchema = z
  .object({
    message: z.string(),
    user: UserSchema,
  })
  .openapi("UserResponse");

export const CreatedUserResponseSchema = z
  .object({
    message: z.string(),
    createdUser: UserSchema,
  })
  .openapi("CreatedUserResponse");

// ─── Firm ────────────────────────────────────────────────────────────────────

export const FirmSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    diaServerCode: z.string(),
    diaFirmCode: z.number().int(),
    diaPeriodCode: z.number().int().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().nullable(),
  })
  .openapi("Firm");

export const FirmFullSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    diaServerCode: z.string(),
    diaUsername: z.string(),
    diaApiKey: z.string(),
    diaFirmCode: z.number().int(),
    diaPeriodCode: z.number().int().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().nullable(),
  })
  .openapi("FirmFull");

export const FirmsResponseSchema = z
  .object({
    message: z.string(),
    firms: z.array(FirmSchema),
  })
  .openapi("FirmsResponse");

export const FirmResponseSchema = z
  .object({
    message: z.string(),
    firm: FirmFullSchema,
  })
  .openapi("FirmResponse");

export const CreatedFirmResponseSchema = z
  .object({
    message: z.string(),
    createdFirm: FirmFullSchema,
  })
  .openapi("CreatedFirmResponse");

export const UpdatedFirmResponseSchema = z
  .object({
    message: z.string(),
    updatedFirm: FirmFullSchema,
  })
  .openapi("UpdatedFirmResponse");

// ─── Job ─────────────────────────────────────────────────────────────────────

export const JobSchema = z
  .object({
    id: z.number().int(),
    firmId: z.number().int(),
    frequency: z.number().int().positive(),
    unit: z.enum(["minute", "hour", "day", "month"]),
    lastRanAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().nullable(),
  })
  .openapi("Job");

export const JobResponseSchema = z
  .object({
    message: z.string(),
    job: JobSchema,
  })
  .openapi("JobResponse");

export const CreatedJobResponseSchema = z
  .object({
    message: z.string(),
    insertedJob: JobSchema,
  })
  .openapi("CreatedJobResponse");

export const UpdatedJobResponseSchema = z
  .object({
    message: z.string(),
    updatedJob: JobSchema,
  })
  .openapi("UpdatedJobResponse");

// ─── Barcode ─────────────────────────────────────────────────────────────────

export const BarcodeSchema = z
  .object({
    id: z.number().int(),
    productId: z.number().int(),
    diaKey: z.number().int(),
    barcode: z.string(),
  })
  .openapi("Barcode");

// ─── Product ─────────────────────────────────────────────────────────────────

export const ProductSchema = z
  .object({
    id: z.number().int(),
    firmId: z.number().int(),
    diaKey: z.number().int(),
    stockCode: z.string(),
    name: z.string(),
    price: z.string().describe("Decimal value as string (precision 18, scale 4)"),
    currency: z.string().length(3).nullable(),
    vat: z.number().int().nullable(),
    stockQuantity: z.number().int(),
    status: z.enum(["active", "passive"]),
    minQuantity: z.number().int(),
    unit: z.string(),
    image: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().nullable(),
  })
  .openapi("Product");

export const ProductWithBarcodesSchema = z
  .object({
    id: z.number().int(),
    firmId: z.number().int(),
    diaKey: z.number().int(),
    stockCode: z.string(),
    name: z.string(),
    price: z.string().describe("Decimal value as string (precision 18, scale 4)"),
    currency: z.string().length(3).nullable(),
    vat: z.number().int().nullable(),
    stockQuantity: z.number().int(),
    status: z.enum(["active", "passive"]),
    minQuantity: z.number().int(),
    unit: z.string(),
    image: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().nullable(),
    equivalentBarcodes: z.array(BarcodeSchema),
  })
  .openapi("ProductWithBarcodes");

export const ProductJoinRowSchema = z
  .object({
    products: ProductSchema,
    barcodes: BarcodeSchema.nullable(),
  })
  .openapi("ProductJoinRow");

export const ProductsResponseSchema = z
  .object({
    products: z.array(ProductJoinRowSchema),
    rowCount: z.number().int().nullable(),
    message: z.string(),
  })
  .openapi("ProductsResponse");

export const ProductResponseSchema = z
  .object({
    product: ProductWithBarcodesSchema,
    message: z.string(),
  })
  .openapi("ProductResponse");

// ─── Sync ────────────────────────────────────────────────────────────────────

export const SyncRowCountsSchema = z
  .object({
    insertedProductRowsCount: z.number().int(),
    updatedProductRowsCount: z.number().int(),
    insertedBarcodeRowsCount: z.number().int(),
    updatedBarcodeRowsCount: z.number().int(),
    deletedProductRowsCount: z.number().int(),
  })
  .openapi("SyncRowCounts");

export const SyncResponseSchema = z
  .object({
    message: z.string(),
    newRowCounts: SyncRowCountsSchema,
  })
  .openapi("SyncResponse");

// ─── Request Bodies ──────────────────────────────────────────────────────────

export const LoginBodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .openapi("LoginBody");

export const CreateUserBodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
    name: z.string().min(1),
    firmId: z.number().int().positive(),
    role: z.enum(["admin", "superadmin"]),
  })
  .openapi("CreateUserBody");

export const UpdateUserBodySchema = z
  .object({
    firmId: z.number().int().positive().optional(),
    name: z.string().min(1).optional(),
    email: z.string().min(1).max(255).optional(),
    password: z.string().min(6).optional(),
  })
  .openapi("UpdateUserBody");

export const FirmFormBodySchema = z
  .object({
    name: z.string().min(1),
    diaServerCode: z.string().min(1),
    diaUsername: z.string().min(1),
    diaPassword: z.string().min(1),
    diaApiKey: z.string().min(1),
    diaFirmCode: z.number().int().positive(),
    diaPeriodCode: z.number().int().nonnegative().nullish(),
  })
  .openapi("FirmFormBody");

export const UpdateFirmBodySchema = FirmFormBodySchema.partial().openapi(
  "UpdateFirmBody",
);

export const JobBodySchema = z
  .object({
    frequency: z.number().int().positive(),
    unit: z.enum(["minute", "hour", "day", "month"]),
  })
  .openapi("JobBody");

export const CreateFirmBodySchema = z
  .object({
    firm: FirmFormBodySchema,
    job: JobBodySchema.nullish(),
  })
  .openapi("CreateFirmBody");

// ─── Query Params ─────────────────────────────────────────────────────────────

export const ServerCodeQuerySchema = z.object({
  serverCode: z
    .string()
    .min(1)
    .openapi({ description: "The firm's DIA server code", example: "SRV001" }),
});

export const ProductsQuerySchema = z.object({
  serverCode: z
    .string()
    .min(1)
    .openapi({ description: "The firm's DIA server code", example: "SRV001" }),
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1)
    .openapi({ description: "Page number", example: 1 }),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .openapi({ description: "Items per page (max 100)", example: 20 }),
  search: z
    .string()
    .min(1)
    .optional()
    .openapi({ description: "Search by name or stock code" }),
  sortBy: z
    .enum(["name", "price", "stockCode", "status", "stockQuantity"])
    .default("name")
    .openapi({ description: "Field to sort by" }),
  sortOrder: z
    .enum(["asc", "desc"])
    .default("asc")
    .openapi({ description: "Sort direction" }),
});

// ─── Path Params ──────────────────────────────────────────────────────────────

export const ServerCodeAndBarcodeParamsSchema = z.object({
  serverCode: z
    .string()
    .min(1)
    .openapi({ description: "The firm's DIA server code", example: "SRV001" }),
  barcode: z
    .string()
    .min(1)
    .max(48)
    .openapi({ description: "Product barcode (max 48 chars)", example: "8690000000001" }),
});

export const FirmIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ description: "Firm ID", example: 1 }),
});
