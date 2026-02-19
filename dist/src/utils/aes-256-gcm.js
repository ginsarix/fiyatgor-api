import crypto from "node:crypto";
import { env } from "../config/env.js";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits
export function aesEncrypt(plaintext) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, env.DIA_PWD_SECRET_KEY, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag(); // 16 bytes
    // together: iv | authTag | ciphertext
    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}
export function aesDecrypt(data) {
    const buf = Buffer.from(data, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
    const ciphertext = buf.subarray(IV_LENGTH + 16);
    const decipher = crypto.createDecipheriv(ALGORITHM, env.DIA_PWD_SECRET_KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]).toString("utf8");
}
