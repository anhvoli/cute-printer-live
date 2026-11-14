// App shell: hash routing (#/game, #/admin), shared server state
// (channels + settings via react-query) and one live engine instance that
// both pages share — the Admin preview and simulations drive the same
// printer the Game page shows.

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "./api";
import {
  useLiveEngine,
  speakText,
  type LiveEngine,
  type LiveEvent,
} from "./lib/live";
import { subscribeTikTok, toLiveEvent } from "./lib/tiktok";
import { GiftThanker } from "./lib/chatter";
import { speakableName } from "./lib/speakableName";
import { GamePage } from "./pages/GamePage";
import { AdminPage } from "./pages/AdminPage";

export type AppState = ApiResponse<typeof api, "getState">;
export type Settings = AppState["settings"];

type Page = "game" | "admin";

function pageFromHash(): Page {
  return window.location.hash.startsWith("#/admin") ? "admin" : "game";
}

function gamePageUrl(): string {
  if (typeof window === "undefined") return "#/game";
  return `${window.location.href.split("#")[0]}#/game`;
}

export function App() {
  const [page, setPage] = useState<Page>(() =>
    typeof window === "undefined" ? "game" : pageFromHash(),
  );

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((p: Page) => {
    window.location.hash = p === "admin" ? "#/admin" : "#/game";
    setPage(p);
  }, []);

  const state = useQuery({
    queryKey: ["state"],
    queryFn: () => api.getState({}),
  });

  const settings: Settings = state.data?.settings ?? {
    soundAll: true,
    giftSound: true,
    thankVoice: true,
    thankText: "Cảm ơn bạn!",
    bannerText: "Welcome {name} to the Live!",
    voice: "female",
    voiceRate: 1,
    stageName: "",
  };
  const channels = state.data?.channels ?? [];
  const activeChannel = channels.find((c) => c.isActive) ?? channels[0];
  const channelUsername = activeChannel?.username ?? "";

  // Chống spam giọng cảm ơn quà (GiftThanker của Thắp Sáng) — 1 instance
  // cho cả phiên. Engine được gán vào engineRef sau khi tạo xong.
  const giftThankerRef = useRef(new GiftThanker());
  const engineRef = useRef<LiveEngine | null>(null);

  const onGiftPrinted = useCallback(
    (ev: LiveEvent) => {
      // Thank-you voice only ever speaks from the Game page.
      if (page !== "game") return;
      const s = state.data?.settings;
      if (!s || !s.soundAll || !s.thankVoice) return;
      // Chống spam giọng cảm ơn (luật GiftThanker của Thắp Sáng): quà
      // nhỏ của cùng 1 người chỉ cảm ơn 1 lần mỗi 30 giây, quà to
      // (>= 99 xu) luôn cảm ơn; thẻ cảm ơn thì vẫn in cho mọi món quà.
      const waiting = engineRef.current?.giftLinesWaiting() ?? 0;
      if (
        !giftThankerRef.current.shouldThank(
          ev.username,
          ev.giftCoins ?? 0,
          waiting,
        )
      ) {
        return;
      }
      const giftPart = ev.giftName
        ? ` đã tặng ${ev.giftName}${(ev.giftCount ?? 1) > 1 ? ` nhân ${ev.giftCount}` : ""}`
        : "";
      // Màn hình hiện tên gốc; giọng đọc dùng tên đã làm sạch.
      speakText(
        `${s.thankText} ${speakableName(ev.name)}${giftPart}!`,
        s.voice,
        s.voiceRate,
      );
    },
    [page, state.data],
  );

  const engine = useLiveEngine({
    channelUsername,
    bannerTemplate: settings.bannerText,
    soundOn: settings.soundAll,
    giftSoundOn: settings.soundAll && settings.giftSound,
    onGiftPrinted,
  });

  // TikTok thật qua SSE: đăng ký MỘT lần cho cả Game + Admin (engine dùng
  // chung). Nghe named events kiểu Thắp Sáng; status thì tải lại state để
  // badge kênh ở Admin đổi theo. Giả lập không bị ảnh hưởng — nó vẫn tự
  // chạy và đẩy vào cùng engine.
  const queryClient = useQueryClient();
  engineRef.current = engine;
  useEffect(() => {
    const stop = subscribeTikTok({
      onStatus: () => {
        void queryClient.invalidateQueries({ queryKey: ["state"] });
      },
      onChat: (d) => {
        const liveEv = toLiveEvent({
          type: "chat",
          name: d.nickname,
          username: d.username,
          text: d.comment,
        });
        if (liveEv) engineRef.current?.enqueue(liveEv);
      },
      onGift: (d) => {
        const liveEv = toLiveEvent({
          type: "gift",
          name: d.nickname,
          username: d.username,
          giftName: d.giftName,
          giftId: d.giftId,
          diamondCount: d.diamondCount,
          count: d.repeatCount,
          giftImageUrl: d.giftImageUrl,
        });
        if (liveEv) engineRef.current?.enqueue(liveEv);
      },
      onMember: (d) => {
        const liveEv = toLiveEvent({
          type: "join",
          name: d.nickname,
          username: d.username,
        });
        if (liveEv) engineRef.current?.enqueue(liveEv);
      },
      onFollow: (d) => {
        const liveEv = toLiveEvent({
          type: "follow",
          name: d.nickname,
          username: d.username,
        });
        if (liveEv) engineRef.current?.enqueue(liveEv);
      },
      onLike: (d) => {
        const liveEv = toLiveEvent({
          type: "like",
          name: d.nickname,
          username: d.username,
          count: d.likeCount,
        });
        if (liveEv) engineRef.current?.enqueue(liveEv);
      },
      onViewers: (n) => {
        engineRef.current?.setViewers(n);
      },
    });
    return stop;
  }, [queryClient]);

  if (state.isPending) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-950">
        <p className="text-sm font-semibold text-slate-300">
          Đang tải máy in mèo… 🐱
        </p>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center">
        <p className="text-sm font-semibold text-rose-300">
          Không tải được dữ liệu kênh &amp; cài đặt.
        </p>
        <button
          type="button"
          onClick={() => state.refetch()}
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return page === "admin" ? (
    <AdminPage
      state={state.data}
      engine={engine}
      gameUrl={gamePageUrl()}
      onBack={() => go("game")}
    />
  ) : (
    <GamePage engine={engine} settings={state.data.settings} />
  );
}
