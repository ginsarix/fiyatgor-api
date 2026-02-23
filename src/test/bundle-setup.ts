import { type ChildProcess, spawn } from "node:child_process";
import { config } from "dotenv";

const { parsed: dotenvParsed } = config();

let server: ChildProcess;

export async function setup() {
  server = spawn("node", ["dist/bundle.js"], {
    stdio: "inherit",
    env: { ...process.env, ...dotenvParsed },
  });

  server.on("error", (err) => {
    throw new Error(`Failed to start bundle server: ${err.message}`);
  });

  await waitForServer("http://localhost:3000/");
}

export async function teardown() {
  server?.kill();
}

async function waitForServer(url: string, timeoutMs = 15000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  throw new Error(
    `Bundle server at ${url} did not become ready within ${timeoutMs}ms`,
  );
}
