import { createHash } from "node:crypto";

export function hash(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}
