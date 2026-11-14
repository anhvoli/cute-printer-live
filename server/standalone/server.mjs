// Standalone server for Cute Printer Live — plain Node.js, no Express,
// no native DB modules, no @hatch/space-sdk.
//
// - Serves the built client from client/dist/ (run `npm run build` first).
// - Implements POST /api/actions with the same six actions and the same
//   request/response shapes as server/src/actions.ts (the Muse version).
// - Persists channels + settings in data.json at the repo root.
//
// Run: `npm start` (PORT env, default 3000).

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIST = path.join(ROOT, "client", "dist");
const DATA_FILE = path.join(ROOT, "data.json");
const PORT = Number(process.env.PORT || 3000);

// ---------------------------------------------------------------------------
// Validation (mirrors the zod schemas in server/src/actions.ts)
// ---------------------------------------------------------------------------

const channelStatusSchema = z.enum(["connected", "waiting", "disconnected"]);
const channelSchema = z.object({
  id: z.number(),
  username: z.string(),
  displayName: z.string(),
  status: channelStatusSchema,
  isActive: z.boolean(),
});
const settingsSchema = z.object({
  soundAll: z.boolean(),
  giftSound: z.boolean(),
  thankVoice: z.boolean(),
  thankText: z.string(),
  bannerText: z.string(),
  voice: z.enum(["female", "male"]),
  voiceRate: z.number(),
  stageName: z.string(),
});
const dataSchema = z.object({
  nextChannelId: z.number().int().positive(),
  channels: z.array(channelSchema),
  settings: settingsSchema,
});

const DEFAULT_SETTINGS = {
  soundAll: true,
  giftSound: true,
  thankVoice: true,
  thankText: "Cảm ơn bạn!",
  bannerText: "Welcome {name} to the Live!",
  voice: "female",
  voiceRate: 1,
  stageName: "",
};

function defaultData() {
  return { nextChannelId: 1, channels: [], settings: { ...DEFAULT_SETTINGS } };
}

function loadData() {
  try {
    const raw = readFileSyncOrNull();
    if (!raw) return defaultData();
    const parsed = dataSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn(`[server] data.json is invalid, starting fresh: ${parsed.error.message}`);
      return defaultData();
    }
    return parsed.data;
  } catch (err) {
    console.warn(`[server] could not read data.json, starting fresh: ${err.message}`);
    return defaultData();
  }
}

// Sync read at startup only; the file is tiny and writes are serialized.
function readFileSyncOrNull() {
  try {
    return readFileSync(DATA_FILE, "utf8");
  } catch {
    return null;
  }
}

let data = loadData();

async function saveData() {
  const tmp = `${DATA_FILE}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, DATA_FILE);
}

function fail(message) {
  const err = new Error(message);
  err.status = 400;
  throw err;
}

function parseArgs(args, schema) {
  const result = schema.safeParse(args ?? {});
  if (!result.success) {
    fail(`Invalid request: ${result.error.issues.map((i) => `${i.path.join(".") || "(body)"} ${i.message}`).join("; ")}`);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Actions (same behavior as server/src/actions.ts)
// ---------------------------------------------------------------------------

const actions = {
  async getState() {
    return { channels: data.channels, settings: data.settings };
  },

  async addChannel(args) {
    const { username, displayName } = parseArgs(
      args,
      z.object({
        username: z.string().trim().min(1).max(60),
        displayName: z.string().trim().min(1).max(80),
      }),
    );
    const clean = username.replace(/^@+/, "");
    const channel = {
      id: data.nextChannelId++,
      username: clean,
      displayName,
      status: "disconnected",
      isActive: data.channels.length === 0,
    };
    data.channels.push(channel);
    await saveData();
    return { id: channel.id };
  },

  async setChannelStatus(args) {
    const { id, status } = parseArgs(
      args,
      z.object({ id: z.number().int().positive(), status: channelStatusSchema }),
    );
    const channel = data.channels.find((c) => c.id === id);
    if (channel) {
      channel.status = status;
      await saveData();
    }
    return { ok: true };
  },

  async setActiveChannel(args) {
    const { id } = parseArgs(args, z.object({ id: z.number().int().positive() }));
    const channel = data.channels.find((c) => c.id === id);
    if (channel) {
      for (const c of data.channels) c.isActive = false;
      channel.isActive = true;
      await saveData();
    }
    return { ok: true };
  },

  async deleteChannel(args) {
    const { id } = parseArgs(args, z.object({ id: z.number().int().positive() }));
    const index = data.channels.findIndex((c) => c.id === id);
    if (index !== -1) {
      data.channels.splice(index, 1);
      if (data.channels.length > 0 && !data.channels.some((c) => c.isActive)) {
        data.channels[0].isActive = true;
      }
      await saveData();
    }
    return { ok: true };
  },

  async updateSettings(args) {
    const settings = parseArgs(args, settingsSchema);
    data.settings = settings;
    await saveData();
    return { ok: true };
  },
};

// ---------------------------------------------------------------------------
// Static file serving (client/dist) + JSON API
// ---------------------------------------------------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function serveStatic(req, res, pathname) {
  // Resolve inside DIST only — never escape it.
  const decoded = decodeURIComponent(pathname);
  const joined = path.normalize(path.join(DIST, decoded));
  let file = joined;
  if (joined !== DIST && !joined.startsWith(DIST + path.sep)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, "index.html");
  } catch {
    // Unknown path: SPA fallback to index.html (hash routing lives there).
    file = path.join(DIST, "index.html");
  }
  try {
    const body = await readFile(file);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": body.length,
    });
    res.end(body);
  } catch {
    if (file === path.join(DIST, "index.html")) {
      // No built client yet (fresh clone without `npm run build`):
      // explain in plain language instead of a bare JSON 404.
      const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Cute Printer Live — chưa build</title></head><body style="font-family:sans-serif;max-width:560px;margin:40px auto;padding:0 16px"><h1>Chưa build xong client</h1><p>Server đã chạy, nhưng chưa có bản build của trang web (<code>client/dist/index.html</code>). Hãy chạy:</p><pre style="background:#f4f4f4;padding:12px;border-radius:8px">npm run build</pre><p>rồi mở lại trang này. (Chạy <code>npm start</code> bình thường sẽ tự build trước.)</p></body></html>`;
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": Buffer.byteLength(html),
      });
      res.end(html);
      return;
    }
    sendJson(res, 404, { error: "Not found" });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (pathname === "/api/actions") {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw || "{}");
      } catch {
        sendJson(res, 400, { error: "Invalid JSON body" });
        return;
      }
      const handler = actions[payload?.action];
      if (typeof handler !== "function") {
        sendJson(res, 404, { error: `Unknown action: ${String(payload?.action)}` });
        return;
      }
      const result = await handler(payload?.args ?? {});
      sendJson(res, 200, result);
      return;
    }

    if (pathname.startsWith("/api/")) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    await serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    sendJson(res, err.status || 500, { error: err.message || "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Cute Printer Live running at http://localhost:${PORT}`);
  console.log(`  Game:  http://localhost:${PORT}/#/game`);
  console.log(`  Admin: http://localhost:${PORT}/#/admin`);
  console.log(`  Data:  ${DATA_FILE}`);
});
