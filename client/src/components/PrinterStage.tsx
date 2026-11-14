// The 9:16 stage, restored to the original HTML design: the stage sits on a
// wooden desk, black pill banner on top, translucent-white frosted-glass
// dashed-border PRINT MENU card at the top-left, the white-and-blue cat-ear printer (offset right) with its face
// in the middle of the body, the white paper feed scrolling out of the
// printer slot, and paper rolls + pencil decor on the desk. All stage sizes
// use cqw so the same component scales in the Admin preview. Used full-size
// on the Game page and shrunk (silent) in the Admin preview.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GIFTS, type LiveEvent } from "../lib/live";

export interface StageSettings {
  thankText: string;
}

function initialOf(name: string): string {
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

function StageAvatar({
  name,
  color,
  sizeCqw,
  fontCqw,
}: {
  name: string;
  color: string;
  sizeCqw: number;
  fontCqw: number;
}) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: `${sizeCqw}cqw`,
        height: `${sizeCqw}cqw`,
        background: color,
        fontSize: `${fontCqw}cqw`,
        fontFamily: "'Baloo 2', sans-serif",
      }}
    >
      {initialOf(name)}
    </span>
  );
}

function ChatBubbleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="inline-block h-[3.6cqw] w-[3.6cqw] shrink-0 align-[-0.5cqw]"
      fill="#8fb0c0"
      aria-hidden
    >
      <path d="M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm4 5v2h8V8H8zm0 4v2h5v-2H8z" />
    </svg>
  );
}

function EventRow({
  ev,
  thankText,
  fresh,
}: {
  ev: LiveEvent;
  thankText: string;
  fresh: boolean;
}) {
  if (ev.kind === "gift") {
    return (
      <div
        className={`relative mt-[3cqw] rounded-[3.4cqw] border-[1.6px] border-[#f6c3d4] bg-white px-[3cqw] pb-[3.2cqw] pt-[3.6cqw] text-center ${fresh ? "stage-ink-in" : ""}`}
      >
        <div
          aria-hidden
          className="mx-auto mb-[2cqw] flex items-center justify-center rounded-full font-extrabold text-white"
          style={{
            width: "13.5cqw",
            height: "13.5cqw",
            background: ev.color,
            border: "1cqw solid #f06ba8",
            boxShadow: "0 0 0 3px #ffd7e8",
            fontSize: "6.4cqw",
            fontFamily: "'Baloo 2', sans-serif",
          }}
        >
          {initialOf(ev.name)}
        </div>
        <p
          className="break-words font-extrabold leading-[1.15] text-[#d81b60]"
          style={{ fontSize: "5.2cqw", fontFamily: "'Baloo 2', sans-serif" }}
        >
          {ev.name}
        </p>
        <p className="mb-[2.6cqw] text-[3.2cqw] text-[#98a4ab]">
          @{ev.username}
        </p>
        <div className="rounded-[2.6cqw] border-[1.4px] border-dashed border-[#e6ccd4] bg-[#fffafc] px-[2cqw] py-[2.6cqw]">
          <p
            className="font-extrabold text-[#e8437d]"
            style={{ fontSize: "4.4cqw", fontFamily: "'Baloo 2', sans-serif" }}
          >
            {thankText}
          </p>
          <p className="mt-[1.2cqw] flex items-center justify-center gap-[1.4cqw] text-[3.5cqw] font-bold text-[#c2185b]">
            {ev.giftImage ? (
              <img
                src={ev.giftImage}
                alt={ev.giftName ?? ""}
                className="h-[4.6cqw] w-[4.6cqw] shrink-0 object-contain"
                draggable={false}
              />
            ) : (
              <span aria-hidden>{ev.giftEmoji}</span>
            )}
            <span>
              {ev.giftName}
              {(ev.giftCount ?? 1) > 1 ? ` x${ev.giftCount}` : ""}
            </span>
          </p>
        </div>
        <span
          aria-hidden
          className="absolute inset-x-[0.5cqw] -bottom-[1.55cqw] border-b border-dashed border-[#c3ced4]"
        />
      </div>
    );
  }

  const isJoinLike = ev.kind === "join" || ev.kind === "follow";
  const msg =
    ev.kind === "join"
      ? "Đã tham gia vào Live!"
      : ev.kind === "follow"
        ? "Đã follow kênh Live! ❤️"
        : ev.kind === "like"
          ? `Đã thả ${ev.giftCount ?? 0} tim ❤️ cho Live!`
          : (ev.text ?? "");

  return (
    <div
      className={`relative mt-[2.4cqw] flex items-start gap-[2.4cqw] rounded-r-[1.6cqw] py-[1.8cqw] pl-[2.6cqw] pr-[2cqw] ${
        isJoinLike
          ? "border-l-[0.9cqw] border-[#43c465] bg-[#effaf1]"
          : "border-l-[0.9cqw] border-[#57b7e8] bg-[#eef7fd]"
      } ${fresh ? "stage-ink-in" : ""}`}
    >
      <StageAvatar name={ev.name} color={ev.color} sizeCqw={6} fontCqw={3} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-[1.4cqw]">
          <span className="break-words text-[3.2cqw] font-bold leading-[1.25] text-[#222]">
            {ev.name}
          </span>
          <ChatBubbleIcon />
        </p>
        <p
          className={`break-words text-[2.9cqw] leading-[1.3] ${
            isJoinLike ? "font-bold text-[#2ea86a]" : "text-[#57a8cf]"
          }`}
        >
          {msg}
        </p>
      </div>
      <span
        aria-hidden
        className="absolute inset-x-[0.5cqw] -bottom-[1.55cqw] border-b border-dashed border-[#c3ced4]"
      />
    </div>
  );
}

function CatPrinter({
  printing,
  wink,
}: {
  printing: boolean;
  wink: boolean;
}) {
  const eyeClass = (side: "left" | "right") => {
    if (wink) return side === "right" ? "stage-eye-wink-r" : "stage-eye-wink-l";
    if (printing) return "stage-eye-printing";
    return "stage-eye";
  };

  return (
    <div
      className="absolute left-[58%] top-[10.5%] z-10 w-[57cqw] -translate-x-1/2"
      aria-hidden
    >
      <div key={printing ? "printing" : "idle"} className={printing ? "stage-vibrate" : undefined}>
        <div className="relative">
          {/* ears */}
          <div className="absolute -top-[4.6cqw] left-[6cqw] z-0 h-[11cqw] w-[11cqw] rotate-[-14deg] rounded-[2.6cqw_6.5cqw_2cqw_6.5cqw] bg-[#8fc3e2]">
            <span className="absolute inset-[2.4cqw] rounded-[1.8cqw_4.6cqw_1.4cqw_4.6cqw] bg-[#eaf6fd]" />
          </div>
          <div className="absolute -top-[4.6cqw] right-[6cqw] z-0 h-[11cqw] w-[11cqw] rotate-[14deg] scale-x-[-1] rounded-[2.6cqw_6.5cqw_2cqw_6.5cqw] bg-[#8fc3e2]">
            <span className="absolute inset-[2.4cqw] rounded-[1.8cqw_4.6cqw_1.4cqw_4.6cqw] bg-[#eaf6fd]" />
          </div>
          {/* body */}
          <div
            className="relative z-[1] h-[33cqw] rounded-[6.5cqw_6.5cqw_5cqw_5cqw]"
            style={{
              background:
                "linear-gradient(90deg,#a8d2ea 0%, #eef8fd 12%, #ffffff 50%, #eef8fd 88%, #a8d2ea 100%)",
              boxShadow:
                "0 10px 24px rgba(70,45,20,.28), inset 0 -6px 12px rgba(120,180,220,.25)",
            }}
          >
            {/* face */}
            <span
              className="absolute left-[8.2cqw] top-[11.6cqw] rotate-[-8deg] font-extrabold text-[#33617f]"
              style={{ fontSize: "4.6cqw", fontFamily: "'Baloo 2', sans-serif" }}
            >
              ⌒⌒
            </span>
            <span
              className="absolute right-[8.2cqw] top-[11.6cqw] rotate-[-8deg] scale-x-[-1] font-extrabold text-[#33617f]"
              style={{ fontSize: "4.6cqw", fontFamily: "'Baloo 2', sans-serif" }}
            >
              ⌒⌒
            </span>
            <div
              className={`absolute left-[14.5cqw] top-[12.5cqw] h-[8.6cqw] w-[7.6cqw] rounded-full bg-[#33617f] ${eyeClass("left")}`}
            >
              <span className="absolute left-[1.5cqw] top-[1.4cqw] h-[2.9cqw] w-[2.9cqw] rounded-full bg-white" />
              <span className="absolute bottom-[1.6cqw] right-[1cqw] h-[1.5cqw] w-[1.5cqw] rounded-full bg-[#bfe3f7]" />
            </div>
            <div
              className={`absolute right-[14.5cqw] top-[12.5cqw] h-[8.6cqw] w-[7.6cqw] rounded-full bg-[#33617f] ${eyeClass("right")}`}
            >
              <span className="absolute left-[1.5cqw] top-[1.4cqw] h-[2.9cqw] w-[2.9cqw] rounded-full bg-white" />
              <span className="absolute bottom-[1.6cqw] right-[1cqw] h-[1.5cqw] w-[1.5cqw] rounded-full bg-[#bfe3f7]" />
            </div>
            <span
              className={`absolute left-[9cqw] top-[19cqw] h-[3cqw] w-[6cqw] rounded-full ${wink ? "bg-[rgba(244,110,165,.6)]" : "bg-[rgba(244,140,180,.35)]"}`}
            />
            <span
              className={`absolute right-[9cqw] top-[19cqw] h-[3cqw] w-[6cqw] rounded-full ${wink ? "bg-[rgba(244,110,165,.6)]" : "bg-[rgba(244,140,180,.35)]"}`}
            />
            <span
              className="absolute left-1/2 top-[19.6cqw] -translate-x-1/2 font-bold leading-none text-[#33617f]"
              style={{ fontSize: "6.4cqw", fontFamily: "'Baloo 2', sans-serif" }}
            >
              ω
            </span>
            {/* paper slot */}
            <div
              className="absolute -bottom-[1.2cqw] left-1/2 z-[2] h-[2.6cqw] w-[86%] -translate-x-1/2 rounded-[2cqw]"
              style={{
                background: "linear-gradient(180deg,#20303c,#49616f)",
                boxShadow: "0 3px 6px rgba(0,0,0,.3)",
              }}
            >
              <span
                className={`absolute right-[2.4cqw] top-1/2 h-[1.5cqw] w-[1.5cqw] -translate-y-1/2 rounded-full ${
                  printing
                    ? "bg-[#ffd23e] shadow-[0_0_8px_#ffd23e]"
                    : "bg-[#57e389] shadow-[0_0_6px_#57e389]"
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintMenu({ giftCounts }: { giftCounts?: Record<string, number> }) {
  return (
    <div
      className="absolute left-[2.5%] top-[11.5%] z-[25] w-[24cqw] rounded-[2cqw] border-[0.35cqw] border-dashed border-[#c49a63] bg-white/55 px-[1.9cqw] pb-[1.4cqw] pt-[1.7cqw] shadow-[0_6px_16px_rgba(90,55,15,.28)] backdrop-blur-[6px]"
      style={{ color: "#4a2c14" }}
    >
      <div className="mb-[0.9cqw] flex items-baseline justify-between gap-[1.2cqw]">
        <span
          className="flex items-center gap-[0.9cqw] whitespace-nowrap font-extrabold tracking-[0.2px] text-[#4a2c14]"
          style={{ fontSize: "2cqw", fontFamily: "'Baloo 2', sans-serif" }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[2.3cqw] w-[2.3cqw] shrink-0"
            fill="#e07b24"
            aria-hidden
          >
            <path d="M12.6 2.6 21.4 11.4a2 2 0 0 1 0 2.8l-7.2 7.2a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 4h8.6a2 2 0 0 1 1.4.6zM7.5 5A1.5 1.5 0 1 0 7.5 8 1.5 1.5 0 0 0 7.5 5z" />
          </svg>
          PRINT MENU
        </span>
        <span className="text-[1.55cqw] font-bold text-[#a5713d]">NHẬN</span>
      </div>
      {GIFTS.map((g, i) => {
        const count = giftCounts?.[g.name] ?? 0;
        return (
          <div
            key={g.name}
            className={`flex items-center gap-[1.25cqw] py-[0.85cqw] ${
              i > 0 ? "border-t border-dashed border-[#d9b98a]" : ""
            }`}
          >
            <span className="flex w-[3.6cqw] shrink-0 items-center justify-center">
              <img
                src={g.image}
                alt={g.name}
                className="h-[3.4cqw] w-[3.4cqw] object-contain drop-shadow-[0_1px_2px_rgba(90,55,15,.35)]"
                draggable={false}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[2cqw] font-bold leading-[1.15] text-[#4a2c14]">
                {g.name} x1
              </span>
              <span className="block text-[1.45cqw] font-semibold leading-[1.25] text-[#a98a5f]">
                {g.tier} + 1 BẢN
              </span>
            </span>
            <span
              className="min-w-[4.4cqw] text-right font-extrabold text-[#4a2c14]"
              style={{ fontSize: "2.8cqw", fontFamily: "'Baloo 2', sans-serif" }}
            >
              <span key={count} className="stage-bump">
                {count}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PrinterStage({
  banner,
  events,
  printingId,
  printingGift,
  giftCounts,
  settings,
}: {
  banner: string;
  events: LiveEvent[];
  printingId: number | null;
  printingGift: boolean;
  giftCounts?: Record<string, number>;
  settings: StageSettings;
}) {
  const [wink, setWink] = useState(false);
  const [bannerKey, setBannerKey] = useState(0);
  const prevBanner = useRef(banner);
  const prevGiftId = useRef<number | null>(null);

  useEffect(() => {
    if (banner !== prevBanner.current) {
      prevBanner.current = banner;
      setBannerKey((k) => k + 1);
    }
  }, [banner]);

  useEffect(() => {
    const top = events[0];
    if (top && top.kind === "gift" && top.id !== prevGiftId.current) {
      prevGiftId.current = top.id;
      setWink(true);
      const t = window.setTimeout(() => setWink(false), 1500);
      return () => window.clearTimeout(t);
    }
  }, [events]);

  const printing = printingId !== null;
  const freshId = events[0]?.id;

  // Paper feed slide: when a new row is committed at the top, the whole
  // sheet would jump down instantly. Instead, shift the sheet up by the new
  // row's full pitch (so the fresh row hides inside the printer slot, above
  // the paper's clipped top edge), then glide it back to rest with a
  // compositor-only transform transition — the paper looks like it slides
  // out of the slot, pushing the older rows down smoothly.
  const listRef = useRef<HTMLDivElement>(null);
  const prevTopIdRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const topId = events[0]?.id ?? null;
    const prevTop = prevTopIdRef.current;
    prevTopIdRef.current = topId;
    if (topId === null || topId === prevTop) return;
    const list = listRef.current;
    const first = list?.firstElementChild as HTMLElement | null;
    if (!list || !first) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const second = first.nextElementSibling as HTMLElement | null;
    const pitch = second
      ? second.offsetTop - first.offsetTop
      : first.offsetHeight +
        Number.parseFloat(getComputedStyle(first).marginTop || "0");
    if (!pitch) return;
    list.style.transition = "none";
    list.style.transform = `translateY(${-pitch}px)`;
    // Force the shifted state to paint before starting the glide.
    void list.offsetHeight;
    list.style.transition =
      "transform 900ms cubic-bezier(.25,.8,.3,1)";
    list.style.transform = "translateY(0)";
  }, [events]);

  return (
    <div
      className="relative h-full w-full overflow-hidden [container-type:inline-size]"
      style={{
        borderRadius: "18px",
        boxShadow:
          "0 24px 60px rgba(30,16,4,.35), 0 4px 14px rgba(30,16,4,.25)",
        background:
          "linear-gradient(180deg, rgba(255,244,220,.35), rgba(120,72,30,.12) 55%, rgba(90,52,20,.22)), repeating-linear-gradient(93deg, #c99a5f 0 46px, #bd8c52 46px 48px, #d2a468 48px 96px, #c1915a 96px 98px), #c99a5f",
        fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
        color: "#222",
      }}
    >
      {/* soft blurred room backdrop at the top */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 z-0 h-[16%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(250,246,238,.85), rgba(250,246,238,0))",
          filter: "blur(2px)",
        }}
      />

      {/* paper rolls decor, bottom-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[11%] left-[2%] z-[1] h-[22cqw] w-[30cqw]"
      >
        <span
          className="absolute bottom-[26%] left-[6%] h-[15cqw] w-[9cqw] rotate-[-4deg]"
          style={{
            borderRadius: "50% / 12%",
            background: "linear-gradient(90deg,#fdf6e3,#efe3c2)",
            boxShadow:
              "inset -6px 0 10px rgba(0,0,0,.12), 2px 4px 8px rgba(60,35,10,.25)",
          }}
        />
        <span
          className="absolute bottom-[30%] left-[20%] h-[12cqw] w-[8cqw] rotate-[3deg]"
          style={{
            borderRadius: "50% / 12%",
            background: "linear-gradient(90deg,#fbe9ec,#f3ccd4)",
            boxShadow:
              "inset -6px 0 10px rgba(0,0,0,.12), 2px 4px 8px rgba(60,35,10,.25)",
          }}
        />
        <span
          className="absolute bottom-0 left-[2%] h-[8.5cqw] w-[16cqw] rotate-[84deg]"
          style={{
            borderRadius: "50% / 20%",
            background: "linear-gradient(180deg,#fdf3cf,#f2df9f)",
            boxShadow:
              "inset -6px 0 10px rgba(0,0,0,.12), 2px 4px 8px rgba(60,35,10,.25)",
          }}
        />
      </div>
      {/* pencil decor, bottom-right */}
      <div
        aria-hidden
        className="absolute bottom-[13.5%] right-[4%] z-[1] h-[1.7cqw] w-[20cqw] rotate-[-24deg] rounded-[2cqw] shadow-[0_2px_5px_rgba(60,35,10,.3)]"
        style={{ background: "linear-gradient(180deg,#fff,#f3e9e4)" }}
      >
        <span className="absolute right-[6%] top-[32%] h-[0.55cqw] w-[4.5cqw] rounded-[2px] bg-[#e8437d] opacity-70" />
      </div>

      {/* black live banner */}
      <div className="absolute left-1/2 top-[3.2%] z-30 w-max max-w-[96%] -translate-x-1/2">
        <div
          key={bannerKey}
          className="banner-pop truncate rounded-full bg-[#111] px-[4.5cqw] py-[2cqw] font-bold text-white shadow-[0_6px_18px_rgba(0,0,0,.35)]"
          style={{ fontSize: "3.3cqw", fontFamily: "'Baloo 2', sans-serif" }}
        >
          {banner || "Đang chờ kết nối Live…"}
        </div>
      </div>

      <PrintMenu giftCounts={giftCounts} />

      <CatPrinter printing={printing} wink={wink} />

      {/* paper feed */}
      <div
        className="absolute left-[58%] z-[5] w-[47cqw] -translate-x-1/2"
        style={{
          top: "calc(10.5% + 31.5cqw)",
          bottom: "4%",
          filter: "drop-shadow(0 10px 14px rgba(60,35,10,.35))",
        }}
      >
        <div
          className="relative h-full overflow-hidden rounded-b-[1.2cqw] px-[3cqw] pb-[4cqw]"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,.05), transparent 4%, transparent 96%, rgba(0,0,0,.05)), #fffefb",
          }}
        >
          {printing && (
            <div
              className={`printing-glow pointer-events-none absolute inset-x-0 top-0 z-10 h-[6cqw] bg-gradient-to-b to-transparent ${printingGift ? "from-pink-300/70" : "from-sky-200/70"}`}
            />
          )}
          <div ref={listRef} className="will-change-transform">
            {events.map((ev) => (
              <EventRow
                key={ev.id}
                ev={ev}
                thankText={settings.thankText}
                fresh={ev.id === freshId}
              />
            ))}
            {events.length === 0 && (
              <p className="px-[2cqw] py-[6cqw] text-center text-[2.9cqw] font-semibold text-[#98a4ab]">
                Giấy đang chờ in… sự kiện live sẽ hiện ở đây nè 🐱
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
