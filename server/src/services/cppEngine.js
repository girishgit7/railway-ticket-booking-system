import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { open, readFile, unlink, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "../..");
const projectRoot = path.resolve(serverRoot, "..");
const binDir = path.join(serverRoot, "bin");
const executable = path.join(binDir, process.platform === "win32" ? "railway_engine.exe" : "railway_engine");
const source = path.join(serverRoot, "engine", "railway_api.cpp");
const lockPath = path.join(projectRoot, ".railway-engine.lock");

function ensureBuilt() {
  if (existsSync(executable)) return;
  mkdirSync(binDir, { recursive: true });
  const result = spawnSync("g++", ["-std=c++17", "-O2", source, "-o", executable], { cwd: projectRoot, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(`C++ engine build failed. Install a C++17 g++ compiler and retry. ${result.stderr || result.error?.message || ""}`);
  }
}

let operationQueue = Promise.resolve();

function runCppUnlocked(args) {
  ensureBuilt();
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ["--api", ...args.map(String)], { cwd: projectRoot, windowsHide: true });
    let stdout = "", stderr = "";
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; if (stdout.length > 2_000_000) child.kill(); });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        try { resolve(JSON.parse(stdout)); } catch { reject(new Error("C++ engine returned invalid JSON")); }
      } else {
        const message = stderr.trim() || `C++ engine exited with code ${code}`;
        const httpMatch = message.match(/^HTTP (400|404|409):\s*(.*)$/);
        const error = new Error(httpMatch?.[2] || message);
        error.status = httpMatch ? Number(httpMatch[1]) : 400;
        reject(error);
      }
    });
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function acquireFileLock(timeoutMs = 20_000) {
  const started = Date.now();
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(16).slice(2)}`;

  while (Date.now() - started < timeoutMs) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.writeFile(JSON.stringify({ pid: process.pid, token, createdAt: Date.now() }));
      await handle.close();
      return async () => {
        try {
          const current = JSON.parse(await readFile(lockPath, "utf8"));
          if (current.token === token) await unlink(lockPath);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;

      // Recover a lock left behind by a crashed Node process. Never remove a
      // lock merely because it is old while its owner process is still alive.
      try {
        const owner = JSON.parse(await readFile(lockPath, "utf8"));
        const ownerPid = Number(owner.pid);
        let ownerAlive = Number.isInteger(ownerPid) && ownerPid > 0;
        if (ownerAlive) {
          try { process.kill(ownerPid, 0); }
          catch (probeError) { ownerAlive = probeError.code === "EPERM"; }
        }
        if (!ownerAlive) {
          await unlink(lockPath).catch((unlinkError) => {
            if (unlinkError.code !== "ENOENT") throw unlinkError;
          });
          continue;
        }
      } catch (readError) {
        if (readError.code === "ENOENT") continue;
        // A partially-written lock may be from a process that just crashed.
        const lockStat = await stat(lockPath).catch(() => null);
        if (lockStat && Date.now() - lockStat.mtimeMs > 30_000) {
          await unlink(lockPath).catch(() => undefined);
          continue;
        }
      }
      await sleep(40);
    }
  }

  const error = new Error("The railway booking engine is busy. Please retry shortly.");
  error.status = 503;
  throw error;
}

// The in-process queue protects requests in this Node process; the lock file
// also coordinates multiple Node processes that share this project directory.
export function runCpp(args) {
  const operation = operationQueue.then(async () => {
    const release = await acquireFileLock();
    try { return await runCppUnlocked(args); }
    finally { await release(); }
  });
  operationQueue = operation.catch(() => undefined);
  return operation;
}
