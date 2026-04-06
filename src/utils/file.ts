import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

const uploadDir = path.join(process.cwd(), "uploads");

export function getFilePath(filename: string): string {
  return path.join(process.cwd(), "uploads", filename);
}

export async function createFile(file: File, ext: string) {
  await mkdir(uploadDir, { recursive: true });

  const baseName = path.parse(file.name).name; // remove ext
  const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");

  const uniqueName = `${safeName}_${nanoid(8)}.${ext}`;

  const filePath = getFilePath(uniqueName);

  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  return uniqueName;
}
