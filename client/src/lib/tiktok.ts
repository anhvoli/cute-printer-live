// TikTok LIVE thật: nhận sự kiện từ server qua SSE (/api/tiktok/stream)
// và chuyển thành event của máy in (live.ts). Chạy song song với giả lập:
// cả hai đều đẩy vào cùng một engine.enqueue nên giấy in nhận cả hai nguồn.
//
// Cách nghe SSE lấy đúng từ Thắp Sáng Bản Đồ (src/live/useLiveEvents.ts):
// named EventSource listeners (status/chat/gift/member/follow/share/like/
// roomUser), JSON.parse có try/catch từng event, handler luôn là bản mới
// nhất (handler-ref), tự nối lại sau 3s khi rớt mạng.

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

// --- Payload chuẩn hóa server gửi (giống Thắp Sáng) ---

export interface TikTokStatus {
  isConnected: boolean;
  isConnecting: boolean;
  connected: boolean;
  channelId: number | null;
  username: string;
  roomId: string | null;
  viewerCount: number;
  totalLikes: number;
  error: string;
}

export interface TikTokChat {
  username: string;
  nickname: string;
  comment: string;
  avatar: string;
  timestamp: number;
}

export interface TikTokGift {
  username: string;
  nickname: string;
  giftName: string;
  giftId: number;
  diamondCount: number;
  repeatCount: number;
  giftImageUrl?: string;
  avatar: string;
  timestamp: number;
}

export interface TikTokPerson {
  username: string;
  nickname: string;
  avatar: string;
  timestamp: number;
}

export interface TikTokLike {
  username: string;
  nickname: string;
  likeCount: number;
  totalLikes: number;
}

export interface TikTokHandlers {
  onStatus?(s: TikTokStatus): void;
  onChat?(d: TikTokChat): void;
  onGift?(d: TikTokGift): void;
  onMember?(d: TikTokPerson): void;
  onFollow?(d: TikTokPerson): void;
  onShare?(d: TikTokPerson): void;
  onLike?(d: TikTokLike): void;
  onViewers?(n: number): void;
}

export type TikTokStreamEvent =
  | { type: "status"; status: TikTokStatus }
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

/**
 * Mở một EventSource duy nhất tới /api/tiktok/stream. Trả về hàm đóng.
 * Handlers luôn là bản mới nhất; rớt mạng thì tự nối lại sau 3s.
 */
export function subscribeTikTok(handlers: TikTokHandlers): () => void {
  let source: EventSource | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  // Handler luôn là bản mới nhất (không lo state cũ).
  const ref = { current: handlers };
  ref.current = handlers;

  const on = <T>(name: string, fn: (data: T) => void) =>
    source!.addEventListener(name, (e) => {
      try {
        fn(JSON.parse((e as MessageEvent).data) as T);
      } catch (err) {
        console.warn(`Lỗi xử lý sự kiện TikTok ${name}:`, err);
      }
    });

  const connect = () => {
    source = new EventSource("/api/tiktok/stream");
    on<TikTokStatus>("status", (d) => ref.current.onStatus?.(d));
    on<TikTokChat>("chat", (d) => ref.current.onChat?.(d));
    on<TikTokGift>("gift", (d) => ref.current.onGift?.(d));
    on<TikTokPerson>("member", (d) => ref.current.onMember?.(d));
    on<TikTokPerson>("follow", (d) => ref.current.onFollow?.(d));
    on<TikTokPerson>("share", (d) => ref.current.onShare?.(d));
    on<TikTokLike>("like", (d) => ref.current.onLike?.(d));
    on<{ viewerCount: number }>("roomUser", (d) =>
      ref.current.onViewers?.(d.viewerCount),
    );
    source.onerror = () => {
      source?.close();
      if (!closed) retry = setTimeout(connect, 3000);
    };
  };

  connect();
  return () => {
    closed = true;
    clearTimeout(retry);
    source?.close();
  };
}

/** Đổi sự kiện TikTok đã chuẩn hóa thành event máy in. Trả null nếu
 *  sự kiện không in được (status/viewers xử lý riêng ở App). */
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
      // PRINT MENU chỉ liệt kê 4 món GIFTS. Giá xu lấy đúng diamondCount
      // TikTok báo về để GiftThanker biết quà to hay nhỏ.
      const def: GiftDef = known ?? {
        name: ev.giftName,
        emoji: "🎁",
        image: ev.giftImageUrl ?? "",
        tier: "NORMAL",
        boost: 1,
        coins: ev.diamondCount,
      };
      return eventGift(
        viewer,
        def,
        Math.max(1, ev.count || 1),
        ev.diamondCount,
      );
    }
    default:
      return null;
  }
}
