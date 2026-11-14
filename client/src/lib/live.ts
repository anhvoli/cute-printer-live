// Live printer engine: event queue, simulation script, sound + TTS helpers.
// Shared by the Game page (full stage, sound on) and the Admin page
// (silent preview + simulation controls).

import { useCallback, useEffect, useRef, useState } from "react";

// Real TikTok gift artwork (transparent WebP, BeetGames gift icon set —
// https://beetgames.com/tiktok-gifts/icons/), bundled locally, no hotlink.
import roseImg from "../assets/gift-rose.webp";
import fingerHeartImg from "../assets/gift-finger_heart.webp";
import doughnutImg from "../assets/gift-doughnut.webp";
import loveYouSoMuchImg from "../assets/gift-love_you_so_much.webp";

// ---------------------------------------------------------------- types

export type LiveEventKind = "chat" | "join" | "gift" | "follow" | "like";

export interface LiveEvent {
  id: number;
  kind: LiveEventKind;
  name: string;
  username: string;
  color: string;
  text?: string;
  giftName?: string;
  giftEmoji?: string;
  giftImage?: string;
  giftCount?: number;
}

export interface GiftDef {
  name: string;
  emoji: string;
  image: string;
  tier: "NORMAL" | "VIP" | "SUPER VIP";
  boost: number; // hearts the gift adds to the live
}

export const GIFTS: GiftDef[] = [
  { name: "Rose", emoji: "🌹", image: roseImg, tier: "NORMAL", boost: 1 },
  { name: "Finger Heart", emoji: "🫰", image: fingerHeartImg, tier: "VIP", boost: 5 },
  { name: "Doughnut", emoji: "🍩", image: doughnutImg, tier: "SUPER VIP", boost: 25 },
  { name: "Love you so much", emoji: "💖", image: loveYouSoMuchImg, tier: "SUPER VIP", boost: 100 },
];

export interface Viewer {
  name: string;
  username: string;
  color: string;
}

const AVATAR_COLORS = [
  "#f472b6", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa",
  "#fb923c", "#22d3ee", "#f87171", "#4ade80", "#e879f9",
];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length] ?? "#f472b6";
}

export function makeViewer(name: string, username: string): Viewer {
  return { name, username, color: colorFor(username || name) };
}

// ---------------------------------------------------------------- pools

export const VIEWER_POOL: Array<{ name: string; username: string }> = [
  { name: "Bé Na", username: "bena.07" },
  { name: "Minh Anh", username: "minhanh_99" },
  { name: "Trà Sữa", username: "trasua.ngon" },
  { name: "Khánh Ly", username: "khanhly.xinh" },
  { name: "Tiểu Miu", username: "tieu.miu" },
  { name: "Bảo Ngọc", username: "baongoc.kute" },
  { name: "Hoàng Nam", username: "hoangnam.dev" },
  { name: "Phương Thảo", username: "pthao.2003" },
  { name: "Đậu Đậu", username: "daudau.be" },
  { name: "Quỳnh Như", username: "quynhnhu_12" },
  { name: "Tuấn Anh", username: "tuananh.pro" },
  { name: "Mèo Mướp", username: "meo.muop" },
  { name: "Linh Chi", username: "linhchi.ne" },
  { name: "Trúc Linh", username: "truclinh.88" },
  { name: "Gia Hân", username: "giahan.cute" },
  { name: "Đức Huy", username: "duchuy.2k" },
];

export const CHAT_POOL: string[] = [
  "Máy in dễ thương quá đi 😍",
  "Chào mọi người nha!",
  "In tiếp đi chị ơi",
  "Mèo nháy mắt kìa cưng ghê",
  "Hello live, mình mới vào nè",
  "Giấy in ra nhìn đã quá",
  "Quà đâu mọi người ơi",
  "Cái máy in này mua ở đâu vậy ạ?",
  "Nhìn giấy cuộn xuống thích ghê",
  "Chị ơi in tên em với",
  "Live vui quá trời",
  "Mèo ơi in cho mình một dòng nha",
  "Đáng yêu xỉu luôn á",
  "Mình follow rồi nè",
  "Tặng hoa cho mèo nè 🌹",
  "Âm thanh in nghe đã tai ghê",
];

// ---------------------------------------------------------------- helpers

let eventSeq = 0;
function nextId(): number {
  eventSeq += 1;
  return eventSeq;
}

function pick<T>(arr: readonly T[]): T {
  const item = arr[Math.floor(Math.random() * arr.length)];
  return item as T;
}

export function randomViewer(): Viewer {
  const v = pick(VIEWER_POOL);
  return makeViewer(v.name, v.username);
}

export function eventChat(viewer: Viewer, text?: string): LiveEvent {
  return {
    id: nextId(),
    kind: "chat",
    name: viewer.name,
    username: viewer.username,
    color: viewer.color,
    text: text ?? pick(CHAT_POOL),
  };
}

export function eventJoin(viewer: Viewer): LiveEvent {
  return {
    id: nextId(),
    kind: "join",
    name: viewer.name,
    username: viewer.username,
    color: viewer.color,
  };
}

export function eventGift(
  viewer: Viewer,
  gift: GiftDef,
  count: number,
): LiveEvent {
  return {
    id: nextId(),
    kind: "gift",
    name: viewer.name,
    username: viewer.username,
    color: viewer.color,
    giftName: gift.name,
    giftEmoji: gift.emoji,
    giftImage: gift.image,
    giftCount: count,
  };
}

export function eventFollow(viewer: Viewer): LiveEvent {
  return {
    id: nextId(),
    kind: "follow",
    name: viewer.name,
    username: viewer.username,
    color: viewer.color,
  };
}

export function eventLike(viewer: Viewer, count: number): LiveEvent {
  return {
    id: nextId(),
    kind: "like",
    name: viewer.name,
    username: viewer.username,
    color: viewer.color,
    giftCount: count,
  };
}

/** The fixed 16-event opening script, then random events forever. */
function scriptedEvent(index: number): LiveEvent {
  switch (index % 16) {
    case 0: return eventJoin(randomViewer());
    case 1: return eventChat(randomViewer(), "Chào mọi người, live bắt đầu rồi nè!");
    case 2: return eventJoin(randomViewer());
    case 3: return eventChat(randomViewer());
    case 4: return eventGift(randomViewer(), GIFTS[0] as GiftDef, 1);
    case 5: return eventChat(randomViewer());
    case 6: return eventFollow(randomViewer());
    case 7: return eventJoin(randomViewer());
    case 8: return eventChat(randomViewer());
    case 9: return eventGift(randomViewer(), GIFTS[1] as GiftDef, 1);
    case 10: return eventLike(randomViewer(), 25);
    case 11: return eventChat(randomViewer());
    case 12: return eventJoin(randomViewer());
    case 13: return eventGift(randomViewer(), GIFTS[2] as GiftDef, 1);
    case 14: return eventChat(randomViewer());
    default: return eventGift(randomViewer(), GIFTS[3] as GiftDef, 1);
  }
}

function randomEvent(): LiveEvent {
  const r = Math.random();
  if (r < 0.34) return eventChat(randomViewer());
  if (r < 0.55) return eventJoin(randomViewer());
  if (r < 0.78) {
    return eventGift(
      randomViewer(),
      pick(GIFTS),
      Math.random() < 0.3 ? 5 : 1,
    );
  }
  if (r < 0.89) return eventFollow(randomViewer());
  return eventLike(randomViewer(), pick([10, 25, 50, 100]));
}

// ---------------------------------------------------------------- audio

let audioCtx: AudioContext | null = null;

function getAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain = 0.08) {
  const ac = getAudio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur);
}

/** Short mechanical printer buzz-clack. */
export function playPrintSound() {
  tone(180, 0, 0.07, "square", 0.03);
  tone(140, 0.09, 0.07, "square", 0.03);
  tone(220, 0.18, 0.05, "square", 0.025);
}

/** Happy little jingle when a gift lands. */
export function playGiftSound() {
  tone(523.25, 0, 0.12, "sine", 0.09);
  tone(659.25, 0.1, 0.12, "sine", 0.09);
  tone(783.99, 0.2, 0.12, "sine", 0.09);
  tone(1046.5, 0.3, 0.22, "sine", 0.1);
}

export function speakText(text: string, voice: "female" | "male", rate: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "vi-VN";
  utter.rate = rate;
  const voices = synth.getVoices().filter((v) => v.lang.startsWith("vi"));
  const female =
    voices.find((v) => /hoai|my|female|nữ|linh/i.test(v.name)) ?? voices[0];
  const male =
    voices.find((v) => /nam|minh|male/i.test(v.name)) ??
    voices[1] ??
    voices[0];
  const chosen = voice === "female" ? female : male;
  if (chosen) utter.voice = chosen;
  utter.pitch = voice === "female" ? 1.15 : 0.85;
  synth.speak(utter);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// ---------------------------------------------------------------- engine

export type BlinkMode = "idle" | "printing" | "wink";

export interface LiveEngine {
  events: LiveEvent[];
  printingId: number | null;
  printingGift: boolean;
  banner: string;
  viewers: number;
  hearts: number;
  giftCounts: Record<string, number>;
  simRunning: boolean;
  autoRunning: boolean;
  autoProgress: { done: number; total: number } | null;
  enqueue: (ev: LiveEvent | LiveEvent[]) => void;
  startSim: () => void;
  stopSim: () => void;
  startAuto: (total: number) => void;
  stopAuto: () => void;
  reset: () => void;
}

// How long one print cycle lasts. It must cover the stage's full paper
// slide + ink-in animation (900ms, cubic-bezier(.25,.8,.3,1)) so a row is
// completely printed before the queue starts the next one — rows never
// overlap or make the paper jump. The row itself is committed to the paper
// the instant its cycle starts (see processQueue); this timer only paces
// the queue so rows land strictly one at a time.
const PRINT_MS = 950;
const MAX_EVENTS = 60;

export function useLiveEngine(opts: {
  channelUsername: string;
  bannerTemplate: string;
  soundOn: boolean;
  giftSoundOn: boolean;
  onGiftPrinted?: (ev: LiveEvent) => void;
}): LiveEngine {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [printingGift, setPrintingGift] = useState(false);
  const [banner, setBanner] = useState("");
  const [viewers, setViewers] = useState(128);
  const [hearts, setHearts] = useState(1024);
  const [giftCounts, setGiftCounts] = useState<Record<string, number>>({});
  const [simRunning, setSimRunning] = useState(true);
  const [autoProgress, setAutoProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const queueRef = useRef<LiveEvent[]>([]);
  const busyRef = useRef(false);
  const printTimerRef = useRef<number | null>(null);
  const simTimerRef = useRef<number | null>(null);
  const scriptIdxRef = useRef(0);
  const autoTimerRef = useRef<number | null>(null);
  const autoRef = useRef<{ done: number; total: number } | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const onGiftRef = useRef(opts.onGiftPrinted);
  onGiftRef.current = opts.onGiftPrinted;

  const bannerFor = useCallback((ev: LiveEvent): string => {
    const o = optsRef.current;
    if (ev.kind === "join") {
      return o.bannerTemplate.includes("{name}")
        ? o.bannerTemplate.replaceAll("{name}", ev.name)
        : o.bannerTemplate;
    }
    if (ev.kind === "gift") {
      return `WOW! ${ev.name} sent ${ev.giftName ?? "gift"} x${ev.giftCount ?? 1}!`;
    }
    if (ev.kind === "follow") return `${ev.name} just followed the Live!`;
    if (ev.kind === "like") {
      return `${ev.name} sent ${ev.giftCount ?? 0} hearts to the Live!`;
    }
    return "";
  }, []);

  const processQueue = useCallback(() => {
    if (busyRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    busyRef.current = true;
    // Commit the row to the paper IMMEDIATELY — the event appears at the
    // top of the paper (and counters/banner update) in the same tick the
    // event fires. The PRINT_MS timer below only holds the printer's
    // shaking/glow state before the next queued row starts; it must never
    // delay the row itself, or the banner would change while the paper
    // still shows the waiting line.
    setEvents((prev) => [next, ...prev].slice(0, MAX_EVENTS));
    setPrintingId(next.id);
    setPrintingGift(next.kind === "gift");
    if (optsRef.current.soundOn) playPrintSound();
    if (next.kind === "gift" && optsRef.current.giftSoundOn) playGiftSound();
    const b = bannerFor(next);
    if (b) setBanner(b);
    if (next.kind === "join") {
      setViewers((v) => v + 1);
    }
    if (next.kind === "gift") {
      const def = GIFTS.find((g) => g.name === next.giftName);
      setHearts((h) => h + (def?.boost ?? 1) * (next.giftCount ?? 1));
      if (next.giftName) {
        const name = next.giftName;
        const count = next.giftCount ?? 1;
        setGiftCounts((prev) => ({
          ...prev,
          [name]: (prev[name] ?? 0) + count,
        }));
      }
      onGiftRef.current?.(next);
    }
    if (next.kind === "like") {
      setHearts((h) => h + (next.giftCount ?? 0));
    }
    printTimerRef.current = window.setTimeout(() => {
      printTimerRef.current = null;
      setPrintingId(null);
      setPrintingGift(false);
      busyRef.current = false;
      processQueue();
    }, PRINT_MS);
  }, [bannerFor]);

  const enqueue = useCallback(
    (ev: LiveEvent | LiveEvent[]) => {
      if (Array.isArray(ev)) queueRef.current.push(...ev);
      else queueRef.current.push(ev);
      processQueue();
    },
    [processQueue],
  );

  // Connected banner whenever the on-air channel changes.
  const channelRef = useRef("");
  useEffect(() => {
    if (opts.channelUsername && opts.channelUsername !== channelRef.current) {
      channelRef.current = opts.channelUsername;
      setBanner(`Connected to @${opts.channelUsername} Live!`);
    }
  }, [opts.channelUsername]);

  // Simulated live loop: 16-event script, then random events.
  useEffect(() => {
    if (!simRunning) {
      if (simTimerRef.current) window.clearTimeout(simTimerRef.current);
      simTimerRef.current = null;
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const idx = scriptIdxRef.current;
      scriptIdxRef.current += 1;
      enqueue(idx < 16 ? scriptedEvent(idx) : randomEvent());
      simTimerRef.current = window.setTimeout(
        tick,
        1500 + Math.random() * 1300,
      );
    };
    // First event fires almost immediately so the paper shows its first
    // printed row well under a second after the page opens.
    simTimerRef.current = window.setTimeout(tick, 120);
    return () => {
      cancelled = true;
      if (simTimerRef.current) window.clearTimeout(simTimerRef.current);
    };
  }, [simRunning, enqueue]);

  const startAuto = useCallback(
    (total: number) => {
      if (autoTimerRef.current) window.clearInterval(autoTimerRef.current);
      autoRef.current = { done: 0, total };
      setAutoProgress({ done: 0, total });
      autoTimerRef.current = window.setInterval(() => {
        const cur = autoRef.current;
        if (!cur) return;
        enqueue(randomEvent());
        cur.done += 1;
        setAutoProgress({ done: cur.done, total: cur.total });
        if (cur.done >= cur.total) {
          if (autoTimerRef.current) window.clearInterval(autoTimerRef.current);
          autoTimerRef.current = null;
          autoRef.current = null;
          setAutoProgress(null);
        }
      }, 650);
    },
    [enqueue],
  );

  const stopAuto = useCallback(() => {
    if (autoTimerRef.current) window.clearInterval(autoTimerRef.current);
    autoTimerRef.current = null;
    autoRef.current = null;
    setAutoProgress(null);
  }, []);

  const reset = useCallback(() => {
    queueRef.current = [];
    if (printTimerRef.current) window.clearTimeout(printTimerRef.current);
    printTimerRef.current = null;
    busyRef.current = false;
    scriptIdxRef.current = 0;
    setEvents([]);
    setPrintingId(null);
    setPrintingGift(false);
    setViewers(128);
    setHearts(1024);
    setGiftCounts({});
    stopSpeaking();
    const u = optsRef.current.channelUsername;
    setBanner(u ? `Connected to @${u} Live!` : "");
  }, []);

  return {
    events,
    printingId,
    printingGift,
    banner,
    viewers,
    hearts,
    giftCounts,
    simRunning,
    autoRunning: autoProgress !== null,
    autoProgress,
    enqueue,
    startSim: () => setSimRunning(true),
    stopSim: () => setSimRunning(false),
    startAuto,
    stopAuto,
    reset,
  };
}
