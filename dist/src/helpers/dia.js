import axios, { isAxiosError } from "axios";
import { eq } from "drizzle-orm";
import { URL_BASE } from "../constants/dia.js";
import { firmsTable } from "../db/schemas/firms.js";
import { aesDecrypt } from "../utils/aes-256-gcm.js";
import { getDiaSession, setDiaSession } from "./redis.js";
export const createDiaUrl = (serverCode, module) => `https://${serverCode}.${URL_BASE}/${module}/json`;
async function login(db, serverCode, sessionId) {
    const requestUrl = createDiaUrl(serverCode, "sis");
    if (sessionId) {
        try {
            const pingResponse = await axios.post(requestUrl, { sis_ping: { session_id: sessionId } });
            if (pingResponse.data.code === "200")
                return { result: "successful-ping" };
        }
        catch (error) {
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
    const loginRequest = {
        login: {
            username,
            password: aesDecrypt(password),
            disconnect_same_user: "true",
            params: { apikey: apiKey },
        },
    };
    const loginResponse = await axios.post(requestUrl, loginRequest);
    const loginResData = loginResponse.data;
    await setDiaSession(firmId, loginResData.msg);
    return { result: "login", loginResponse: loginResData };
}
/**
 * @returns the data of the response
 */
export async function dia(db, url, request) {
    const requestUrl = createDiaUrl(url.serverCode, url.module);
    const serviceKey = Object.keys(request)[0];
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
        if (sessionId)
            finalRequest[serviceKey].session_id = sessionId;
    }
    const loginRes = await login(db, url.serverCode, finalRequest?.[serviceKey].session_id || undefined);
    const loginResSessionId = loginRes.loginResponse?.msg;
    if (loginResSessionId)
        finalRequest[serviceKey].session_id = loginResSessionId;
    try {
        const response = await axios.post(requestUrl, finalRequest);
        return response.data;
    }
    catch (error) {
        if (isAxiosError(error)) {
            console.log(`Dia error occurred, response data: ${JSON.stringify(error.response?.data)}, request: ${JSON.stringify(finalRequest, undefined, 2)}`);
        }
        throw error;
    }
}
