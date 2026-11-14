// Standalone server for Cute Printer Live — plain Node.js, no Express,
// no native DB modules, no @hatch/space-sdk.
//
// - Serves the built client from client/dist/ (run `npm run build` first).
// - Implements POST /api/actions with the same six actions and the same
//   request/response shapes as server/src/actions.ts (the Muse version).
// - TikTok LIVE bridge: POST /api/tiktok/connect + /disconnect and
//   GET /api/tiktok/stream (SSE) — one TikTok connection at a time, to the
//   active channel. Real TikTok events (chat/gift/join/follow/like/viewers)
//   are normalized and broadcast to every SSE subscriber. Simulation keeps
//   working alongside; it never touches this bridge.
// - Persists channels + settings in data.json at the repo root.
//
// Run: `npm start` (PORT env, default 3000).

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent,
} from "tiktok-live-connector";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIST = path.join(ROOT, "client", "dist");
const DATA_FILE = path.join(ROOT, "data.json");
const PORT = Number(process.env.PORT || 3000);

// Key miễn phí của EulerStream (máy chủ ký tên mà tiktok-live-connector
// dùng để nối websocket). Mạng nhà thường không cần; mạng trung tâm dữ
// liệu hay bị chặn ẩn danh thì cần key: đăng ký miễn phí ở
// https://www.eulerstream.com rồi chạy EULER_API_KEY=xxx npm start.
const EULER_API_KEY =
  process.env.EULER_API_KEY || process.env.TIKTOK_SIGN_API_KEY || "";

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
  // Mật khẩu Admin: có default nên data.json cũ (chưa có trường này)
  // vẫn đọc được; client không bao giờ nhận mật khẩu này qua getState.
  adminPass: z.string().min(4).max(64).default("admin123"),
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
  adminPass: "admin123",
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
    // Không bao giờ trả mật khẩu Admin về client.
    const { adminPass: _adminPass, ...publicSettings } = data.settings;
    return { channels: data.channels, settings: publicSettings };
  },

  // Kiểm tra mật khẩu Admin mà không tiết lộ mật khẩu thật.
  async verifyAdminPass(args) {
    const { pass } = parseArgs(args, z.object({ pass: z.string() }));
    return { ok: pass === data.settings.adminPass };
  },

  async changeAdminPass(args) {
    const { oldPass, newPass } = parseArgs(
      args,
      z.object({
        oldPass: z.string(),
        newPass: z.string().trim().min(4).max(64),
      }),
    );
    if (oldPass !== data.settings.adminPass) {
      fail("Mật khẩu cũ không đúng");
    }
    data.settings.adminPass = newPass;
    await saveData();
    return { ok: true };
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
    // Mật khẩu Admin chỉ đổi qua changeAdminPass, không đổi qua đây:
    // giữ nguyên mật khẩu đang lưu kể cả khi client gửi kèm trường này.
    data.settings = { ...settings, adminPass: data.settings.adminPass };
    await saveData();
    return { ok: true };
  },
};

// ---------------------------------------------------------------------------
// TikTok LIVE bridge (one connection at a time, to the active channel)
// ---------------------------------------------------------------------------
// TikTok has no official API for live chat/gifts; this uses the community
// library tiktok-live-connector (same one the tiktok-printer-live reference
// repo uses). It reads public live rooms — no TikTok login needed.

const tik = {
  channelId: null,
  username: "",
  connection: null,
  roomId: null,
  viewerCount: 0,
  reconnectEnabled: false,
  reconnectCount: 0,
  reconnectWaitMs: 1000,
  reconnectTimer: null,
  manualDisconnect: false,
};

const sseClients = new Set();

function tikStatus() {
  return {
    connected: tik.connection !== null && tik.roomId !== null,
    channelId: tik.channelId,
    username: tik.username,
    roomId: tik.roomId,
    viewerCount: tik.viewerCount,
  };
}

function tikBroadcast(evt) {
  const line = `data: ${JSON.stringify(evt)}\n\n`;
  for (const res of [...sseClients]) {
    try {
      res.write(line);
    } catch {
      sseClients.delete(res);
    }
  }
}

async function tikSetChannelStatus(id, status) {
  const ch = data.channels.find((c) => c.id === id);
  if (ch) {
    ch.status = status;
    await saveData();
  }
}

// The connector passes proto-decoded messages; the user is usually nested
// under `user`, but fall back to top-level fields just in case.
function tikUser(msg) {
  const u = msg?.user ?? msg ?? {};
  return {
    name: u.nickname || u.uniqueId || "TikTok",
    username: u.uniqueId || "",
  };
}

function wireTikTokEvents(connection) {
  const isCurrent = () => tik.connection === connection;

  connection.on(WebcastEvent.CHAT, (msg) => {
    try {
      if (!isCurrent() || !tik.roomId) return;
      const u = tikUser(msg);
      tikBroadcast({
        type: "chat",
        name: u.name,
        username: u.username,
        text: msg?.comment ?? "",
      });
    } catch (err) {
      console.error("[tiktok] chat handler:", err);
    }
  });

  connection.on(WebcastEvent.GIFT, (msg) => {
    try {
      if (!isCurrent() || !tik.roomId) return;
      // Streakable gifts arrive once per repeat: only forward the final
      // repeat (repeatEnd === 1) so one combo never prints many times.
      // Non-streakable gifts have repeatEnd 1 (or missing) right away.
      if (msg?.repeatEnd !== undefined && msg.repeatEnd !== 1) return;
      const u = tikUser(msg);
      const details = msg?.giftDetails ?? {};
      tikBroadcast({
        type: "gift",
        name: u.name,
        username: u.username,
        giftName: details.giftName ?? msg?.giftName ?? "Quà TikTok",
        giftId: msg?.giftId ?? 0,
        diamondCount: details.diamondCount ?? msg?.diamondCount ?? 0,
        count: Math.max(1, msg?.repeatCount || 1),
        giftImageUrl:
          details.giftImage?.giftPictureUrl ?? msg?.giftPictureUrl ?? "",
      });
    } catch (err) {
      console.error("[tiktok] gift handler:", err);
    }
  });

  connection.on(WebcastEvent.MEMBER, (msg) => {
    try {
      if (!isCurrent() || !tik.roomId) return;
      const u = tikUser(msg);
      tikBroadcast({ type: "join", name: u.name, username: u.username });
    } catch (err) {
      console.error("[tiktok] member handler:", err);
    }
  });

  connection.on(WebcastEvent.SOCIAL, (msg) => {
    try {
      if (!isCurrent() || !tik.roomId) return;
      if (!String(msg?.displayType ?? "").toLowerCase().includes("follow")) return;
      const u = tikUser(msg);
      tikBroadcast({ type: "follow", name: u.name, username: u.username });
    } catch (err) {
      console.error("[tiktok] social handler:", err);
    }
  });

  connection.on(WebcastEvent.LIKE, (msg) => {
    try {
      if (!isCurrent() || !tik.roomId) return;
      const u = tikUser(msg);
      tikBroadcast({
        type: "like",
        name: u.name,
        username: u.username,
        count: Math.max(1, msg?.likeCount || 1),
      });
    } catch (err) {
      console.error("[tiktok] like handler:", err);
    }
  });

  connection.on(WebcastEvent.ROOM_USER, (msg) => {
    try {
      if (!isCurrent() || !tik.roomId) return;
      const count = msg?.viewerCount;
      if (typeof count === "number") {
        tik.viewerCount = count;
        tikBroadcast({ type: "viewers", count });
      }
    } catch (err) {
      console.error("[tiktok] room_user handler:", err);
    }
  });

  connection.on(WebcastEvent.STREAM_END, () => {
    try {
      if (!isCurrent()) return;
      console.log(`[tiktok] stream ended for @${tik.username}`);
      tik.reconnectEnabled = false;
      tik.roomId = null;
      tik.viewerCount = 0;
      tikBroadcast({ type: "streamEnd" });
      if (tik.channelId) {
        void tikSetChannelStatus(tik.channelId, "disconnected").then(() =>
          tikBroadcast({ type: "status", ...tikStatus() }),
        );
      } else {
        tikBroadcast({ type: "status", ...tikStatus() });
      }
    } catch (err) {
      console.error("[tiktok] stream_end handler:", err);
    }
  });

  connection.on(ControlEvent.DISCONNECTED, () => {
    try {
      if (!isCurrent()) return;
      console.log(`[tiktok] disconnected from @${tik.username}`);
      scheduleTikReconnect();
    } catch (err) {
      console.error("[tiktok] disconnected handler:", err);
    }
  });

  connection.on(ControlEvent.ERROR, (err) => {
    console.error(`[tiktok] connection error for @${tik.username}:`, err?.message ?? err);
  });
}

function scheduleTikReconnect() {
  if (!tik.reconnectEnabled || tik.manualDisconnect) return;
  if (!tik.connection) return;
  if (tik.reconnectCount >= 5) {
    console.log("[tiktok] give up reconnecting after 5 attempts");
    tik.reconnectEnabled = false;
    tik.roomId = null;
    if (tik.channelId) {
      void tikSetChannelStatus(tik.channelId, "disconnected").then(() =>
        tikBroadcast({ type: "status", ...tikStatus() }),
      );
    }
    return;
  }
  const wait = tik.reconnectWaitMs;
  tik.reconnectWaitMs *= 2;
  tik.reconnectCount += 1;
  console.log(`[tiktok] reconnecting in ${wait}ms (attempt ${tik.reconnectCount}/5)`);
  tik.reconnectTimer = setTimeout(() => {
    tik.reconnectTimer = null;
    if (!tik.reconnectEnabled || tik.manualDisconnect || !tik.connection) return;
    tik.connection
      .connect()
      .then((state) => {
        tik.roomId = state?.roomId ?? null;
        tik.reconnectCount = 0;
        tik.reconnectWaitMs = 1000;
        console.log(`[tiktok] reconnected to room ${tik.roomId}`);
        if (tik.channelId) void tikSetChannelStatus(tik.channelId, "connected");
        tikBroadcast({ type: "status", ...tikStatus() });
      })
      .catch(() => scheduleTikReconnect());
  }, wait);
}

function tikFriendlyError(err, username) {
  const msg = String(err?.message ?? err ?? "");
  const name = err?.name ?? "";
  const offline =
    name === "UserOfflineError" ||
    /offline|isn't online|is not online|not online|not live|no room|room not found|live has ended|user is not live|is not live/i.test(msg);
  if (offline) {
    const e = new Error(
      `Kênh @${username} chưa live — mở live trên TikTok rồi bấm lại nhé`,
    );
    e.status = 400;
    return e;
  }
  if (
    name === "ConnectTimeoutError" ||
    msg === "CONNECT_TIMEOUT" ||
    /timeout/i.test(msg)
  ) {
    const e = new Error(
      "Nối TikTok quá lâu — mạng chậm hoặc TikTok không trả lời, thử lại nhé",
    );
    e.status = 400;
    return e;
  }
  if (/rate.?limit|429/i.test(msg)) {
    const e = new Error(
      "TikTok đang giới hạn kết nối — chờ vài phút rồi thử lại nhé",
    );
    e.status = 400;
    return e;
  }
  if (/failed to retrieve room id/i.test(msg)) {
    const e = new Error(
      `Không tìm thấy kênh @${username} trên TikTok hoặc kênh chưa live — kiểm tra lại username rồi thử lại nhé`,
    );
    e.status = 400;
    return e;
  }
  if (/anonymous access is not available|sign server|sign error/i.test(msg)) {
    const e = new Error(
      "TikTok chặn nối từ mạng này (máy chủ ký tên yêu cầu key) — lấy key miễn phí ở eulerstream.com rồi chạy lại với EULER_API_KEY=... npm start; trên mạng nhà anh có thể không cần key",
    );
    e.status = 400;
    return e;
  }
  const e = new Error(
    `Không nối được TikTok (@${username}): ${msg || "lỗi không rõ"} — kiểm tra mạng rồi thử lại nhé`,
  );
  e.status = 400;
  return e;
}

async function disconnectTikTokInternal() {
  tik.manualDisconnect = true;
  tik.reconnectEnabled = false;
  if (tik.reconnectTimer) {
    clearTimeout(tik.reconnectTimer);
    tik.reconnectTimer = null;
  }
  const conn = tik.connection;
  tik.connection = null;
  tik.roomId = null;
  tik.viewerCount = 0;
  if (conn) {
    try {
      conn.disconnect();
    } catch {
      // already gone
    }
  }
}

async function connectTikTok(channelId) {
  const channel = data.channels.find((c) => c.id === channelId);
  if (!channel) fail("Không tìm thấy kênh này");
  if (
    tik.connection &&
    tik.channelId === channel.id &&
    tik.roomId !== null
  ) {
    return {
      ok: true,
      roomId: tik.roomId,
      viewerCount: tik.viewerCount,
      already: true,
    };
  }
  await disconnectTikTokInternal();
  tik.manualDisconnect = false;
  tik.reconnectEnabled = true;
  tik.reconnectCount = 0;
  tik.reconnectWaitMs = 1000;
  tik.channelId = channel.id;
  tik.username = channel.username;
  const connection = new TikTokLiveConnection(
    channel.username,
    EULER_API_KEY ? { signApiKey: EULER_API_KEY } : {},
  );
  tik.connection = connection;
  wireTikTokEvents(connection);
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("CONNECT_TIMEOUT")), 25000);
  });
  try {
    const state = await Promise.race([connection.connect(), timeout]);
    if (timer) clearTimeout(timer);
    tik.roomId = state?.roomId ?? null;
    tik.viewerCount =
      typeof state?.viewerCount === "number" ? state.viewerCount : 0;
    await tikSetChannelStatus(channel.id, "connected");
    tikBroadcast({ type: "status", ...tikStatus() });
    console.log(`[tiktok] connected to @${channel.username}, room ${tik.roomId}`);
    return { ok: true, roomId: tik.roomId, viewerCount: tik.viewerCount };
  } catch (err) {
    if (timer) clearTimeout(timer);
    tik.reconnectEnabled = false;
    tik.roomId = null;
    try {
      connection.disconnect();
    } catch {
      // ignore
    }
    if (tik.connection === connection) tik.connection = null;
    await tikSetChannelStatus(channel.id, "disconnected");
    throw tikFriendlyError(err, channel.username);
  }
}

async function disconnectTikTok() {
  const channelId = tik.channelId;
  await disconnectTikTokInternal();
  if (channelId) await tikSetChannelStatus(channelId, "disconnected");
  tik.channelId = null;
  tik.username = "";
  tikBroadcast({ type: "status", ...tikStatus() });
  return { ok: true };
}

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

    // --- TikTok LIVE bridge ---
    if (pathname === "/api/tiktok/connect" && req.method === "POST") {
      const raw = await readBody(req);
      let payload = {};
      try {
        payload = JSON.parse(raw || "{}");
      } catch {
        sendJson(res, 400, { error: "Invalid JSON body" });
        return;
      }
      try {
        const result = await connectTikTok(payload.channelId);
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, err.status || 400, {
          error: err.message || "Không nối được TikTok",
        });
      }
      return;
    }

    if (pathname === "/api/tiktok/disconnect" && req.method === "POST") {
      const result = await disconnectTikTok();
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/tiktok/stream" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write(
        `data: ${JSON.stringify({ type: "status", ...tikStatus() })}\n\n`,
      );
      sseClients.add(res);
      const hb = setInterval(() => {
        try {
          res.write(": ping\n\n");
        } catch {
          // client gone; close handler cleans up
        }
      }, 20000);
      req.on("close", () => {
        clearInterval(hb);
        sseClients.delete(res);
      });
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
  console.log(
    `  TikTok sign key: ${EULER_API_KEY ? "đã có (EULER_API_KEY)" : "chưa có — mạng nhà thường không cần, mạng bị chặn thì lấy key ở eulerstream.com"}`,
  );
});
