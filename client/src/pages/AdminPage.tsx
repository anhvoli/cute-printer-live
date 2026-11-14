// Admin page: dark control deck styled after the Thắp Sáng Bản Đồ control
// page (slate-950 bg, slate-900 cards, amber primary buttons). Left column:
// control cards. Right column: silent 9:16 stage preview.

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiResponse } from "../api";
import { PrinterStage } from "../components/PrinterStage";
import {
GIFTS,
eventChat,
eventFollow,
eventGift,
eventJoin,
eventLike,
randomViewer,
speakText,
type LiveEngine,
} from "../lib/live";

type State = ApiResponse<typeof api, "getState">;
type Channel = State["channels"][number];
type Settings = State["settings"];

const cardCls =
  "rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg";
const labelCls =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";
const inputCls =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400";
const primaryBtn =
  "rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50";
const ghostBtn =
  "rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 active:scale-[0.98] disabled:opacity-50";
const dangerBtn =
  "rounded-xl bg-rose-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 active:scale-[0.98] disabled:opacity-50";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex min-h-[44px] w-full items-center justify-between gap-3 py-1 text-left"
    >
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-amber-500" : "bg-slate-700"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

function StatusBadge({ status }: { status: Channel["status"] }) {
  if (status === "connected") {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400 ring-1 ring-emerald-500/40">
        ● Đã kết nối
      </span>
    );
  }
  if (status === "waiting") {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-400 ring-1 ring-amber-500/40">
        ● Đang chờ
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px] font-bold text-slate-400 ring-1 ring-slate-500/40">
      ● Chưa kết nối
    </span>
  );
}

export function AdminPage({
  state,
  engine,
  gameUrl,
  onBack,
}: {
  state: State;
  engine: LiveEngine;
  gameUrl: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const settings = state.settings;
  const channels = state.channels;
  const active = channels.find((c) => c.isActive) ?? channels[0];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["state"] });

  const addChannel = useMutation({
    mutationFn: (args: { username: string; displayName: string }) =>
      api.addChannel(args),
    onSuccess: invalidate,
  });
  const setStatus = useMutation({
    mutationFn: (args: { id: number; status: Channel["status"] }) =>
      api.setChannelStatus(args),
    onSuccess: invalidate,
  });
  const setActive = useMutation({
    mutationFn: (id: number) => api.setActiveChannel({ id }),
    onSuccess: invalidate,
  });
  const removeChannel = useMutation({
    mutationFn: (id: number) => api.deleteChannel({ id }),
    onSuccess: invalidate,
  });
  const saveSettings = useMutation({
    mutationFn: (s: Settings) => api.updateSettings(s),
    onSuccess: invalidate,
  });

  const patchSettings = (patch: Partial<Settings>) =>
    saveSettings.mutate({ ...settings, ...patch });

  // --- connect card local state
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [copyMsg, setCopyMsg] = useState<"copied" | "manual" | null>(null);
  const linkInputRef = useRef<HTMLInputElement | null>(null);

  // --- voice card local state
  const [stageNameDraft, setStageNameDraft] = useState(settings.stageName);
  const [speakDraft, setSpeakDraft] = useState("");
  useEffect(() => {
    setStageNameDraft(settings.stageName);
  }, [settings.stageName]);

  // --- text card local state
  const [thankDraft, setThankDraft] = useState(settings.thankText);
  const [bannerDraft, setBannerDraft] = useState(settings.bannerText);
  const [textDirty, setTextDirty] = useState(false);
  useEffect(() => {
    if (!textDirty) {
      setThankDraft(settings.thankText);
      setBannerDraft(settings.bannerText);
    }
  }, [settings.thankText, settings.bannerText, textDirty]);

  const copyLink = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(gameUrl);
      ok = true;
    } catch {
      const el = linkInputRef.current;
      if (el) {
        el.focus();
        el.select();
        try {
          ok = document.execCommand("copy");
        } catch {
          ok = false;
        }
      }
    }
    setCopyMsg(ok ? "copied" : "manual");
    window.setTimeout(() => setCopyMsg(null), 3000);
  };

  const submitAdd = () => {
    const username = newUsername.trim();
    if (!username) return;
    addChannel.mutate(
      {
        username,
        displayName: newDisplayName.trim() || username,
      },
      {
        onSuccess: () => {
          setNewUsername("");
          setNewDisplayName("");
        },
      },
    );
  };

  const simViewerGiftStreak = () => {
    const v = randomViewer();
    const gift = GIFTS[Math.floor(Math.random() * 2)] ?? (GIFTS[0] as (typeof GIFTS)[number]);
    engine.enqueue([
      eventGift(v, gift, 1),
      eventGift(v, gift, 1),
      eventGift(v, gift, 1),
    ]);
  };

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-5">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={onBack} className={ghostBtn}>
            ← Về trang Game
          </button>
          <h1 className="text-xl font-extrabold tracking-tight">
            Admin — Máy In Mini Dễ Thương
          </h1>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
            {engine.viewers.toLocaleString("vi-VN")} người xem ·{" "}
            {engine.hearts.toLocaleString("vi-VN")} ❤️
          </span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* ---------------- left column: controls ---------------- */}
          <div className="flex min-w-0 flex-col gap-5">
            {/* Kết nối TikTok LIVE */}
            <section className={cardCls} aria-label="Kết nối TikTok LIVE">
              <h2 className="mb-3 text-base font-bold">
                📺 Kết nối TikTok LIVE
              </h2>

              <div className="mb-4 rounded-xl bg-slate-950/70 p-3 ring-1 ring-slate-800">
                <p className={labelCls}>Link trang game cho TikTok LIVE Studio</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={linkInputRef}
                    aria-label="Link trang game"
                    readOnly
                    value={gameUrl}
                    onFocus={(e) => e.target.select()}
                    className={`${inputCls} min-w-0 flex-1 font-mono text-xs`}
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className={primaryBtn}
                  >
                    Sao chép link
                  </button>
                </div>
                {copyMsg === "copied" && (
                  <p className="mt-2 text-xs font-semibold text-emerald-400">
                    Đã sao chép link trang game ✓
                  </p>
                )}
                {copyMsg === "manual" && (
                  <p className="mt-2 text-xs font-semibold text-amber-400">
                    Chưa copy tự động được — link trong ô đã được bôi đen,
                    hãy sao chép thủ công nhé.
                  </p>
                )}
                <a
                  href={gameUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block break-all text-xs font-medium text-sky-400 underline"
                >
                  {gameUrl}
                </a>
                <p className="mt-2 text-xs text-slate-400">
                  Dán link này vào nguồn Browser Source trong TikTok LIVE
                  Studio, kích thước 1080 × 1920. Chỉ trang game phát tiếng —
                  khung xem trước bên phải luôn im lặng.
                </p>
              </div>

              {active ? (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-300">
                    Kênh đang phát:{" "}
                    <strong className="text-white">
                      {active.displayName}
                    </strong>{" "}
                    <span className="text-slate-400">
                      (@{active.username})
                    </span>
                  </span>
                  <StatusBadge status={active.status} />
                  {active.status === "connected" ? (
                    <button
                      type="button"
                      className={dangerBtn}
                      onClick={() =>
                        setStatus.mutate({ id: active.id, status: "disconnected" })
                      }
                    >
                      Ngắt kết nối
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={primaryBtn}
                      onClick={() =>
                        setStatus.mutate({ id: active.id, status: "connected" })
                      }
                    >
                      Kết nối
                    </button>
                  )}
                  {active.status === "connected" && (
                    <span className="text-xs font-semibold text-emerald-400">
                      Đang live · {engine.viewers.toLocaleString("vi-VN")}{" "}
                      người xem · {engine.hearts.toLocaleString("vi-VN")} tim
                    </span>
                  )}
                </div>
              ) : (
                <p className="mb-4 text-sm text-slate-400">
                  Chưa có kênh nào — thêm kênh TikTok đầu tiên ở dưới nhé.
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-username" className={labelCls}>
                    Username TikTok
                  </label>
                  <input
                    id="new-username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="vd: bymeos"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="new-display" className={labelCls}>
                    Tên hiển thị
                  </label>
                  <input
                    id="new-display"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="vd: Mèo In Mini"
                    className={inputCls}
                  />
                </div>
              </div>
              <button
                type="button"
                className={`${primaryBtn} mt-3`}
                disabled={!newUsername.trim() || addChannel.isPending}
                onClick={submitAdd}
              >
                + Thêm kênh TikTok
              </button>
            </section>

            {/* Kênh live đã thêm */}
            <section className={cardCls} aria-label="Kênh live đã thêm">
              <h2 className="mb-3 text-base font-bold">📡 Kênh live đã thêm</h2>
              {channels.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Chưa có kênh nào. Thêm kênh ở thẻ Kết nối phía trên.
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {channels.map((c) => (
                    <li
                      key={c.id}
                      className={`rounded-xl p-3 ring-1 ${
                        c.isActive
                          ? "bg-amber-500/10 ring-amber-500/50"
                          : "bg-slate-950/60 ring-slate-800"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">
                          {c.displayName}
                        </span>
                        <span className="text-sm text-slate-400">
                          @{c.username}
                        </span>
                        <StatusBadge status={c.status} />
                        {c.isActive && (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-extrabold text-black">
                            ĐANG PHÁT
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {!c.isActive && (
                          <button
                            type="button"
                            className={primaryBtn}
                            onClick={() => setActive.mutate(c.id)}
                          >
                            Chuyển kênh đang phát
                          </button>
                        )}
                        {c.status === "connected" ? (
                          <button
                            type="button"
                            className={ghostBtn}
                            onClick={() =>
                              setStatus.mutate({
                                id: c.id,
                                status: "disconnected",
                              })
                            }
                          >
                            Ngắt
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={ghostBtn}
                            onClick={() =>
                              setStatus.mutate({ id: c.id, status: "connected" })
                            }
                          >
                            {c.status === "waiting"
                              ? "Kết nối"
                              : "Kết nối lại"}
                          </button>
                        )}
                        <button
                          type="button"
                          className={dangerBtn}
                          onClick={() => removeChannel.mutate(c.id)}
                        >
                          Xóa kênh
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Giọng đọc trên stage */}
            <section className={cardCls} aria-label="Giọng đọc trên stage">
              <h2 className="mb-3 text-base font-bold">🎙️ Giọng đọc trên stage</h2>
              <label htmlFor="stage-name" className={labelCls}>
                Tên kênh đọc trên stage
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="stage-name"
                  value={stageNameDraft}
                  onChange={(e) => setStageNameDraft(e.target.value)}
                  placeholder={active ? active.displayName : "Tên kênh của bạn"}
                  className={`${inputCls} min-w-0 flex-1`}
                />
                <button
                  type="button"
                  className={primaryBtn}
                  disabled={
                    stageNameDraft === settings.stageName ||
                    saveSettings.isPending
                  }
                  onClick={() =>
                    patchSettings({ stageName: stageNameDraft })
                  }
                >
                  Lưu tên
                </button>
              </div>

              <label htmlFor="speak-now" className={`${labelCls} mt-4`}>
                Gõ câu đọc ngay
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="speak-now"
                  value={speakDraft}
                  onChange={(e) => setSpeakDraft(e.target.value)}
                  placeholder="vd: Cảm ơn mọi người đã vào live!"
                  className={`${inputCls} min-w-0 flex-1`}
                />
                <button
                  type="button"
                  className={primaryBtn}
                  disabled={!speakDraft.trim()}
                  onClick={() => {
                    speakText(
                      speakDraft.trim(),
                      settings.voice,
                      settings.voiceRate,
                    );
                  }}
                >
                  Đọc ngay
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <span className={labelCls}>Giọng đọc</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-pressed={settings.voice === "female"}
                      className={
                        settings.voice === "female" ? primaryBtn : ghostBtn
                      }
                      onClick={() => patchSettings({ voice: "female" })}
                    >
                      Nữ Hoài My
                    </button>
                    <button
                      type="button"
                      aria-pressed={settings.voice === "male"}
                      className={
                        settings.voice === "male" ? primaryBtn : ghostBtn
                      }
                      onClick={() => patchSettings({ voice: "male" })}
                    >
                      Nam Nam Minh
                    </button>
                  </div>
                </div>
                <div>
                  <span className={labelCls}>Tốc độ đọc</span>
                  <div className="flex flex-wrap gap-2">
                    {[0.85, 1, 1.15, 1.3].map((r) => (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={settings.voiceRate === r}
                        className={
                          settings.voiceRate === r ? primaryBtn : ghostBtn
                        }
                        onClick={() => patchSettings({ voiceRate: r })}
                      >
                        {r}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`${dangerBtn} mt-4`}
                onClick={() => engine.reset()}
              >
                Reset game
              </button>
            </section>

            {/* Chữ trên màn hình & âm thanh */}
            <section
              className={cardCls}
              aria-label="Chữ trên màn hình và âm thanh"
            >
              <h2 className="mb-2 text-base font-bold">
                ✍️ Chữ trên màn hình &amp; âm thanh
              </h2>
              <Toggle
                label="Âm thanh toàn bộ"
                checked={settings.soundAll}
                onChange={(v) => patchSettings({ soundAll: v })}
              />
              <Toggle
                label="Hiệu ứng quà"
                checked={settings.giftSound}
                onChange={(v) => patchSettings({ giftSound: v })}
              />
              <Toggle
                label="Giọng đọc cảm ơn"
                checked={settings.thankVoice}
                onChange={(v) => patchSettings({ thankVoice: v })}
              />

              <label htmlFor="thank-text" className={`${labelCls} mt-3`}>
                Chữ cảm ơn trên thẻ quà
              </label>
              <input
                id="thank-text"
                value={thankDraft}
                onChange={(e) => {
                  setThankDraft(e.target.value);
                  setTextDirty(true);
                }}
                className={inputCls}
              />
              <label htmlFor="banner-text" className={`${labelCls} mt-3`}>
                Chữ banner khi có người vào (dùng {"{name}"} cho tên)
              </label>
              <input
                id="banner-text"
                value={bannerDraft}
                onChange={(e) => {
                  setBannerDraft(e.target.value);
                  setTextDirty(true);
                }}
                className={inputCls}
              />
              <button
                type="button"
                className={`${primaryBtn} mt-3`}
                disabled={!textDirty || saveSettings.isPending}
                onClick={() => {
                  patchSettings({
                    thankText: thankDraft,
                    bannerText: bannerDraft,
                  });
                  setTextDirty(false);
                }}
              >
                Lưu chữ
              </button>
            </section>

            {/* Giả lập */}
            <section className={cardCls} aria-label="Giả lập sự kiện live">
              <h2 className="mb-3 text-base font-bold">🎲 Giả lập</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => engine.enqueue(eventJoin(randomViewer()))}
                >
                  👋 Người vào
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => engine.enqueue(eventChat(randomViewer()))}
                >
                  💬 Comment
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() =>
                    engine.enqueue(
                      eventGift(
                        randomViewer(),
                        GIFTS[0] as (typeof GIFTS)[number],
                        5,
                      ),
                    )
                  }
                >
                  🌹 5 Hoa hồng
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() =>
                    engine.enqueue(
                      eventGift(
                        randomViewer(),
                        GIFTS[3] as (typeof GIFTS)[number],
                        1,
                      ),
                    )
                  }
                >
                  💖 Quà to
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => engine.enqueue(eventFollow(randomViewer()))}
                >
                  ❤️ Follow
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => engine.enqueue(eventLike(randomViewer(), 100))}
                >
                  💯 100 tim
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={simViewerGiftStreak}
                >
                  🎁 1 người tặng 3 lần liền
                </button>
              </div>

              <div className="mt-4 border-t border-slate-800 pt-4">
                <span className={labelCls}>Live tự động</span>
                {engine.autoProgress ? (
                  <div>
                    <div className="mb-2 h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{
                          width: `${(engine.autoProgress.done / engine.autoProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="mb-2 text-sm text-slate-300">
                      Đang chạy: {engine.autoProgress.done}/
                      {engine.autoProgress.total} người
                    </p>
                    <button
                      type="button"
                      className={dangerBtn}
                      onClick={() => engine.stopAuto()}
                    >
                      Dừng
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {[10, 50, 100].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={primaryBtn}
                        onClick={() => engine.startAuto(n)}
                      >
                        ▶ Live tự động {n} người
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-400">
                  Live mô phỏng ở trang game chạy liên tục, không có nút
                  dừng trên sân khấu.
                </p>
              </div>
            </section>
          </div>

          {/* ---------------- right column: silent preview ---------------- */}
          <div className="min-w-0">
            <div className="lg:sticky lg:top-5">
              <p className="mb-2 text-sm font-bold text-slate-300">
                Xem trước (im lặng)
              </p>
              <div className="mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-2xl ring-1 ring-slate-700">
                <PrinterStage
                  banner={engine.banner}
                  events={engine.events}
                  printingId={engine.printingId}
                  printingGift={engine.printingGift}
                  giftCounts={engine.giftCounts}
                  settings={{ thankText: settings.thankText }}
                />
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">
                Khung xem trước dùng chung sự kiện với trang game, không phát
                tiếng.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
