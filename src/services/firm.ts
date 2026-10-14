import { eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { diaUnreachableWarning } from "../constants/messages.js";
import { type DiaCredentials, verifyDiaCredentials } from "../helpers/dia.js";
import { deleteDiaSession, setDiaSession } from "../helpers/redis.js";
import { firmsTable, type SelectableFirm } from "../db/schemas/firms.js";
import { aesDecrypt, aesEncrypt } from "../utils/aes-256-gcm.js";

export async function getFirmByFirmCode(db: DB, firmCode: string) {
  return await db
    .select()
    .from(firmsTable)
    .where(eq(firmsTable.firmCode, firmCode));
}

export async function getFirmByServerCode(db: DB, serverCode: string) {
  return await db
    .select()
    .from(firmsTable)
    .where(eq(firmsTable.diaServerCode, serverCode));
}

export async function getFirmIdByFirmCode(db: DB, firmCode: string) {
  const [firm] = await db
    .select({ id: firmsTable.id, discountsEnabled: firmsTable.discountsEnabled })
    .from(firmsTable)
    .where(eq(firmsTable.firmCode, firmCode));

  return firm ?? null;
}

export async function getFirmIdByServerCode(db: DB, serverCode: string) {
  const [firm] = await db
    .select({ id: firmsTable.id, discountsEnabled: firmsTable.discountsEnabled })
    .from(firmsTable)
    .where(eq(firmsTable.diaServerCode, serverCode));

  return firm ?? null;
}

export async function getFirmById(db: DB, id: number) {
  const [firm] = await db
    .select()
    .from(firmsTable)
    .where(eq(firmsTable.id, id));

  return firm;
}

// DIA passwords are stored encrypted, every firm write that may carry one should go through this
export function withEncryptedDiaPassword<
  T extends { diaPassword?: string | null },
>(values: T): T {
  if (!values.diaPassword) return values;

  return { ...values, diaPassword: aesEncrypt(values.diaPassword) };
}

type StoredDiaCredentials = Pick<
  SelectableFirm,
  "diaServerCode" | "diaUsername" | "diaPassword" | "diaApiKey"
>;

// the rest of the firm form can come along, only the DIA fields are read
type DiaCredentialsInput = {
  [K in keyof StoredDiaCredentials]?: string | null;
} & Record<string, unknown>;

/**
 * The DIA credentials a firm will end up with after saving {@link input}, if they changed
 *
 * @param stored the firm's current values, `null` for a firm that is being created
 * @returns `null` when there is nothing new to verify, or the resulting credentials are incomplete
 */
export function pendingDiaCredentials(
  stored: StoredDiaCredentials | null,
  input: DiaCredentialsInput,
): { serverCode: string; credentials: DiaCredentials } | null {
  const serverCode =
    input.diaServerCode !== undefined
      ? input.diaServerCode
      : (stored?.diaServerCode ?? null);
  const username =
    input.diaUsername !== undefined
      ? input.diaUsername
      : (stored?.diaUsername ?? null);
  // both firm routes save a missing API key as ""
  const apiKey = input.diaApiKey ?? "";
  // the stored password is never sent back to the client, so any password sent is a new one
  const passwordChanged = !!input.diaPassword;

  const changed =
    !stored ||
    passwordChanged ||
    serverCode !== stored.diaServerCode ||
    username !== stored.diaUsername ||
    apiKey !== stored.diaApiKey;
  if (!changed) return null;

  const password = passwordChanged
    ? input.diaPassword
    : stored?.diaPassword && aesDecrypt(stored.diaPassword);
  if (!serverCode || !username || !password) return null;

  return { serverCode, credentials: { username, password, apiKey } };
}

/**
 * Tries the DIA credentials a save would leave the firm with, call before saving
 * @throws {DiaLoginError} if DIA rejects them
 * @returns `null` if the save doesn't change them
 */
export async function verifyFirmDiaCredentials(
  stored: StoredDiaCredentials | null,
  input: DiaCredentialsInput,
) {
  const pending = pendingDiaCredentials(stored, input);
  if (!pending) return null;

  return await verifyDiaCredentials(pending.serverCode, pending.credentials);
}

/**
 * Call after saving, the cached DIA session belongs to the old credentials
 * @returns the warning to show the user, if any
 */
export async function applyFirmDiaCredentialsVerification(
  firmId: number,
  verification: Awaited<ReturnType<typeof verifyFirmDiaCredentials>>,
) {
  if (verification?.status === "ok") {
    await setDiaSession(firmId, verification.sessionId);
  } else if (verification?.status === "unreachable") {
    // so the next DIA call logs in with the new credentials
    await deleteDiaSession(firmId);
    return diaUnreachableWarning;
  }
}
