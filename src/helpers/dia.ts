import axios, { type AxiosResponse, isAxiosError } from "axios";
import { eq } from "drizzle-orm";
import { URL_BASE } from "../constants/dia.js";
import { diaLoginErrors } from "../constants/messages.js";
import type { DB } from "../db/index.js";
import { firmsTable } from "../db/schemas/firms.js";
import type {
  DiaLoginRequest,
  DiaPingRequest,
  DiaRequest,
  DiaUrl,
} from "../types/dia-requests.js";
import type {
  DiaLoginResponse,
  DiaPingResponse,
} from "../types/dia-responses.js";
import { aesDecrypt } from "../utils/aes-256-gcm.js";
import { getDiaSession, setDiaSession } from "./redis.js";
import { env } from "../config/env.js";

// the server code is user input and DIA credentials are sent to this URL, encoding it keeps
// characters like "/", "#" or "@" from moving the request to another host
export const createDiaUrl = (serverCode: string, module: string) =>
  `https://${encodeURIComponent(serverCode)}.${URL_BASE}/${module}/json`;

/**
 * Thrown when we can't get a DIA session for a firm, the message is meant for the user
 */
export class DiaLoginError extends Error {
  constructor(
    message: string,
    /** DIA's own reason (e.g. NOUSER), for logs */
    readonly diaMessage?: string,
  ) {
    super(message);
    this.name = "DiaLoginError";
  }
}

export type DiaCredentials = {
  username: string;
  /** plaintext */
  password: string;
  apiKey: string;
};

/**
 * @returns the new DIA session id
 * @throws {DiaLoginError} if DIA rejects the credentials, network errors are thrown as is
 */
export async function diaLogin(
  serverCode: string,
  credentials: DiaCredentials,
) {
  const loginRequest: DiaLoginRequest = {
    login: {
      username: credentials.username,
      password: credentials.password,
      disconnect_same_user: "true",
      params: { apikey: credentials.apiKey },
    },
  };

  const { data } = await axios.post<
    DiaLoginResponse,
    AxiosResponse<DiaLoginResponse>,
    DiaLoginRequest
  >(createDiaUrl(serverCode, "sis"), loginRequest);

  // DIA responds with HTTP 200 even when the login is rejected
  if (data.code !== "200") {
    console.log(`DIA login rejected for ${serverCode}: ${data.msg}`);
    throw new DiaLoginError(diaLoginErrors.rejected, data.msg);
  }

  return data.msg;
}

type LoginResult = "login" | "successful-ping";
async function login(
  db: DB,
  serverCode: string,
  sessionId?: string,
): Promise<{
  result: LoginResult;
  sessionId?: string;
}> {
  const requestUrl = createDiaUrl(serverCode, "sis");

  if (sessionId) {
    try {
      const pingResponse = await axios.post<
        DiaPingResponse,
        AxiosResponse<DiaPingResponse>,
        DiaPingRequest
      >(requestUrl, { sis_ping: { session_id: sessionId } });

      if (pingResponse.data.code === "200")
        return { result: "successful-ping" };
    } catch (error) {
      if (isAxiosError(error)) {
        console.log("Error occurred during dia login, " + error.response?.data);
      }

      throw error;
    }
  }

  const [{ id: firmId, username, password, apiKey }] = await db
    .select({
      id: firmsTable.id,
      username: firmsTable.diaUsername,
      password: firmsTable.diaPassword,
      apiKey: firmsTable.diaApiKey,
    })
    .from(firmsTable)
    .where(eq(firmsTable.diaServerCode, serverCode));

  if (!username || !password || apiKey === null)
    throw new DiaLoginError(diaLoginErrors.missingCredentials);

  const newSessionId = await diaLogin(serverCode, {
    username,
    password: aesDecrypt(password),
    apiKey,
  });

  await setDiaSession(firmId, newSessionId);

  return { result: "login", sessionId: newSessionId };
}

/**
 * @returns the data of the response
 */
export async function dia<
  KService extends string,
  TResponse = unknown,
  TRequest extends DiaRequest<KService> = DiaRequest<KService>,
>(db: DB, url: DiaUrl, request: TRequest) {
  const requestUrl = createDiaUrl(url.serverCode, url.module);

  const serviceKey = Object.keys(request)[0] as KService;

  const finalRequest = request;

  // if session_id wasnt provided in the request, try to find it in session
  if (!request[serviceKey].session_id) {
    const [firm] = await db
      .select({
        id: firmsTable.id,
        username: firmsTable.diaUsername,
        password: firmsTable.diaPassword,
        apiKey: firmsTable.diaApiKey,
      })
      .from(firmsTable)
      .where(eq(firmsTable.diaServerCode, url.serverCode));

    const sessionId = await getDiaSession(firm.id);

    if (sessionId) finalRequest[serviceKey].session_id = sessionId;
  }

  const loginRes = await login(
    db,
    url.serverCode,
    finalRequest?.[serviceKey].session_id || undefined,
  );
  if (loginRes.sessionId)
    finalRequest[serviceKey].session_id = loginRes.sessionId;

  try {
    const response = await axios.post<TResponse>(requestUrl, finalRequest);

    if (env.NODE_ENV === 'development') console.debug(response.data);

    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.log(
        `Dia error occurred, response data: ${JSON.stringify(error.response?.data)}, request: ${JSON.stringify(finalRequest, undefined, 2)}`,
      );
    }

    throw error;
  }
}
