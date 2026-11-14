// App shell: hash routing (#/game, #/admin), shared server state
// (channels + settings via react-query) and one live engine instance that
// both pages share — the Admin preview and simulations drive the same
// printer the Game page shows.

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "./api";
import { useLiveEngine, speakText, type LiveEvent } from "./lib/live";
import { subscribeTikTok, toLiveEvent } from "./lib/tiktok";
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

  const onGiftPrinted = useCallback(
    (ev: LiveEvent) => {
      // Thank-you voice only ever speaks from the Game page.
      if (page !== "game") return;
      const s = state.data?.settings;
      if (!s || !s.soundAll || !s.thankVoice) return;
      const giftPart = ev.giftName
        ? ` đã tặng ${ev.giftName}${(ev.giftCount ?? 1) > 1 ? ` nhân ${ev.giftCount}` : ""}`
        : "";
      speakText(
        `${s.thankText} ${ev.name}${giftPart}!`,
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
  // chung). Sự kiện viewers cập nhật số người xem; status/streamEnd thì
  // tải lại state để badge kênh ở Admin đổi theo. Giả lập không bị ảnh
  // hưởng — nó vẫn tự chạy và đẩy vào cùng engine.
  const queryClient = useQueryClient();
  const engineRef = useRef(engine);
  engineRef.current = engine;
  useEffect(() => {
    const stop = subscribeTikTok((ev) => {
      const eng = engineRef.current;
      if (ev.type === "viewers") {
        eng.setViewers(ev.count);
        return;
      }
      if (ev.type === "status" || ev.type === "streamEnd") {
        void queryClient.invalidateQueries({ queryKey: ["state"] });
        return;
      }
      const liveEv = toLiveEvent(ev);
      if (liveEv) eng.enqueue(liveEv);
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
