// TikTok LIVE thật: nhận sự kiện từ server qua SSE (/api/tiktok/stream)
// và chuyển thành event của máy in (live.ts). Chạy song song với giả lập:
// cả hai đều đẩy vào cùng một engine.enqueue nên giấy in nhận cả hai nguồn.

import {
  GIFTS,
  eventChat,
  eventFollow,
  eventGift,
  eventJoin,
  eventLike,
  makeViewer,
  type GiftDef,
  type LiveEvent,
} from "./live";

export type TikTokStreamEvent =
  | {
      type: "status";
      connected: boolean;
      channelId: number | null;
      username: string;
      roomId: string | null;
      viewerCount: number;
    }
  | { type: "streamEnd" }
  | { type: "chat"; name: string; username: string; text: string }
  | {
      type: "gift";
      name: string;
      username: string;
      giftName: string;
      giftId: number;
      diamondCount: number;
      count: number;
      giftImageUrl?: string;
    }
  | { type: "join"; name: string; username: string }
  | { type: "follow"; name: string; username: string }
  | { type: "like"; name: string; username: string; count: number }
  | { type: "viewers"; count: number };

/** Mở một EventSource duy nhất tới /api/tiktok/stream. Trả về hàm đóng. */
export function subscribeTikTok(
  onEvent: (ev: TikTokStreamEvent) => void,
): () => void {
  const es = new EventSource("/api/tiktok/stream");
  es.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data) as TikTokStreamEvent);
    } catch {
      // bỏ qua dòng SSE không phải JSON (ví dụ heartbeat ": ping")
    }
  };
  // EventSource tự nối lại khi rớt mạng; không cần xử lý onerror ở đây.
  return () => es.close();
}

/** Đổi sự kiện TikTok đã chuẩn hóa thành event máy in. Trả null nếu
 *  sự kiện không in được (status/streamEnd/viewers xử lý riêng ở App). */
export function toLiveEvent(ev: TikTokStreamEvent): LiveEvent | null {
  switch (ev.type) {
    case "chat":
      return eventChat(makeViewer(ev.name, ev.username), ev.text);
    case "join":
      return eventJoin(makeViewer(ev.name, ev.username));
    case "follow":
      return eventFollow(makeViewer(ev.name, ev.username));
    case "like":
      return eventLike(makeViewer(ev.name, ev.username), ev.count);
    case "gift": {
      const viewer = makeViewer(ev.name, ev.username);
      const known = GIFTS.find(
        (g) => g.name.trim().toLowerCase() === ev.giftName.trim().toLowerCase(),
      );
      // Quà lạ vẫn in thẻ cảm ơn với ảnh thật của quà (nếu có), emoji 🎁
      // làm fallback; quà lạ KHÔNG cộng vào 4 món của PRINT MENU vì
      // PRINT MENU chỉ liệt kê 4 món GIFTS.
      const def: GiftDef = known ?? {
        name: ev.giftName,
        emoji: "🎁",
        image: ev.giftImageUrl ?? "",
        tier: "NORMAL",
        boost: 1,
      };
      return eventGift(viewer, def, Math.max(1, ev.count || 1));
    }
    default:
      return null;
  }
}
