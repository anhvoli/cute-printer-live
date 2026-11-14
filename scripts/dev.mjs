// Dev: run the standalone API server (PORT, default 3000) together with the
// Vite dev server on http://localhost:5173 (proxies /api to the API server).
// Run: `npm run dev`
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_PORT = process.env.PORT || "3000";
const isWindows = process.platform === "win32";

const children = [];
function run(name, cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: isWindows,
    env: { ...process.env, ...env },
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    }
  });
  return child;
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("api", process.execPath, ["server/standalone/server.mjs"], { PORT: API_PORT });
run("vite", isWindows ? "npx.cmd" : "npx", ["vite", "--port", "5173"]);

console.log(`Dev servers starting: app at http://localhost:5173, API on :${API_PORT}`);
