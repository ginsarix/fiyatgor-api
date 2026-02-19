import axios, { type AxiosResponse, isAxiosError } from "axios";
import { eq } from "drizzle-orm";
import { URL_BASE } from "../constants/dia.js";
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

export const createDiaUrl = (serverCode: string, module: string) =>
  `https://${serverCode}.${URL_BASE}/${module}/json`;

type LoginResult = "login" | "successful-ping";
async function login(
  db: DB,
  serverCode: string,
  sessionId?: string,
): Promise<{
  result: LoginResult;
  loginResponse?: DiaLoginResponse;
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

  const loginRequest: DiaLoginRequest = {
    login: {
      username,
      password: aesDecrypt(password),
      disconnect_same_user: "true",
      params: { apikey: apiKey },
    },
  };

  const loginResponse = await axios.post<DiaLoginResponse>(
    requestUrl,
    loginRequest,
  );

  const loginResData = loginResponse.data;
  await setDiaSession(firmId, loginResData.msg);

  return { result: "login", loginResponse: loginResData };
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
  const loginResSessionId = loginRes.loginResponse?.msg;
  if (loginResSessionId)
    finalRequest[serviceKey].session_id = loginResSessionId;

  try {
    const response = await axios.post<TResponse>(requestUrl, finalRequest);

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
