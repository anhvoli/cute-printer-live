// Tải ảnh thật của 4 món quà TikTok về client/src/assets/.
// Nguồn: BeetGames — trang tổng hợp icon quà TikTok
// https://beetgames.com/tiktok-gifts/icons/
// Chạy tự động trước mỗi lần build (xem "prebuild" trong package.json).
// Chỉ tải file nào chưa có để không tải lại mỗi lần build.
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "client", "src", "assets");
const BASE = "https://beetgames.com/images/gifts";

const GIFTS = [
  ["rose.webp", "gift-rose.webp"],
  ["finger_heart.webp", "gift-finger_heart.webp"],
  ["doughnut.webp", "gift-doughnut.webp"],
  ["love_you_so_much.webp", "gift-love_you_so_much.webp"],
];

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

await mkdir(OUT, { recursive: true });
for (const [remote, local] of GIFTS) {
  const dest = path.join(OUT, local);
  if (await exists(dest)) continue;
  console.log(`[gifts] downloading ${local} ...`);
  const res = await fetch(`${BASE}/${remote}`);
  if (!res.ok) throw new Error(`Failed to download ${remote}: HTTP ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}
console.log("[gifts] gift images ready in client/src/assets/");
