"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Milestone, Rover, RoverId } from "@/content/types";
import {
  IconBook,
  IconFlag,
  IconMicroscope,
  IconMountain,
  IconParachute,
  IconPause,
  IconPlay,
  IconRocket,
  IconSignalOff,
  IconSparkle,
  IconStorm,
  IconTriangle,
  IconWheels,
} from "./icons";

/**
 * Full Story (Rover Hub, middle card): the mission told as five illustrated chapters.
 * A lifespan bar (planned vs actual) and key numbers up top; a big chapter "stage" with a real
 * NASA photo or an animated infographic; a mission track along the bottom that auto-plays.
 * Every number here comes from the rover's verified fact sheet (src/content/rovers/*.ts).
 */

type ChapterArt =
  | { kind: "photo"; src: string; credit: string; fit?: "top" | "center" }
  | { kind: "signal"; date: string; sol?: string; note: string; bg?: string }
  | { kind: "odometer"; km: number; note: string };

interface StoryExtras {
  planned: number;
  actual: number;
  unit: string;
  actualLabel: string; // "83" / "2,200+"
  times: string; // "12×"
  stats: { value: string; label: string }[];
  art: ChapterArt[]; // one per timeline milestone, same order
}

const NASA = "/assets/nasa-photos";
const STORY: Record<RoverId, StoryExtras> = {
  sojourner: {
    planned: 7,
    actual: 83,
    unit: "DAYS",
    actualLabel: "83",
    times: "12×",
    stats: [
      { value: "~100 m", label: "DRIVEN ON MARS" },
      { value: "10.6 kg", label: "MICROWAVE-SIZED" },
    ],
    art: [
      { kind: "photo", src: `${NASA}/sojourner/pathfinder-launch.webp`, credit: "NASA · PIA04754", fit: "top" },
      { kind: "photo", src: `${NASA}/sojourner/sojourner-on-mars.jpg`, credit: "NASA/JPL · PIA00611" },
      { kind: "photo", src: `${NASA}/sojourner/sojourner-barnacle-bill.jpg`, credit: "NASA/JPL · PIA00649" },
      { kind: "photo", src: `${NASA}/sojourner/sojourner-yogi.jpg`, credit: "NASA/JPL · PIA00766" },
      { kind: "signal", date: "SEP 27, 1997", sol: "SOL 83", note: "The lander's battery most likely ran down in the cold." },
    ],
  },
  spirit: {
    planned: 90,
    actual: 2200,
    unit: "SOLS",
    actualLabel: "2,200+",
    times: "24×",
    stats: [
      { value: "124,000+", label: "IMAGES SENT" },
      { value: "90%+", label: "SILICA IN SOIL" },
    ],
    art: [
      { kind: "photo", src: `${NASA}/spirit/spirit-launch.webp`, credit: "NASA · KSC-03PD-1893", fit: "top" },
      { kind: "photo", src: `${NASA}/spirit/spirit-self-portrait.jpg`, credit: "NASA/JPL/Cornell · PIA07371" },
      { kind: "photo", src: `${NASA}/spirit/spirit-husband-hill-summit.jpg`, credit: "NASA/JPL-Caltech/Cornell · PIA04184" },
      { kind: "photo", src: `${NASA}/spirit/spirit-silica-soil.jpg`, credit: "NASA/JPL/Cornell · PIA09491" },
      { kind: "signal", date: "MAR 22, 2010", note: "Stuck at Troy, tilted away from the winter Sun." },
    ],
  },
  opportunity: {
    planned: 90,
    actual: 5111,
    unit: "SOLS",
    actualLabel: "5,111",
    times: "55×",
    stats: [
      { value: "45.16 km", label: "DRIVEN ON MARS" },
      { value: "217,000+", label: "IMAGES SENT" },
    ],
    art: [
      { kind: "photo", src: `${NASA}/opportunity/opportunity-launch.webp`, credit: "NASA · KSC-03PP-2099", fit: "top" },
      { kind: "photo", src: `${NASA}/opportunity/opportunity-self-portrait.jpg`, credit: "NASA/JPL/Cornell · PIA07372" },
      { kind: "photo", src: `${NASA}/opportunity/opportunity-blueberries.jpg`, credit: "NASA/JPL · PIA05564" },
      { kind: "odometer", km: 42.195, note: "The first marathon on another world" },
      {
        kind: "signal",
        date: "JUN 10, 2018",
        sol: "SOL 5,111",
        note: "A planet-wide dust storm blocked out the Sun.",
        bg: `${NASA}/opportunity/opportunity-last-panorama.jpg`,
      },
    ],
  },
};

function iconFor(m: Milestone, i: number, last: boolean): ReactNode {
  const h = m.heading.toLowerCase();
  const s = 24;
  if (h.includes("launch")) return <IconRocket size={s} />;
  if (h.includes("landing")) return <IconParachute size={s} />;
  if (h.includes("wheels")) return <IconWheels size={s} />;
  if (h.includes("hill")) return <IconMountain size={s} />;
  if (h.includes("marathon")) return <IconFlag size={s} />;
  if (h.includes("storm")) return <IconStorm size={s} />;
  if (last) return <IconSignalOff size={s} />;
  if (h.includes("discover") || h.includes("berr")) return <IconSparkle size={s} />;
  return i % 2 ? <IconMicroscope size={s} /> : <IconSparkle size={s} />;
}

const CHAPTER_MS = 9000;

export function StoryPanel({ rover }: { rover: Rover }) {
  const extras = STORY[rover.id];
  const chapters = rover.timeline;
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(() => typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const lastIndex = chapters.length - 1;

  const pick = (i: number) => {
    setActive(Math.max(0, Math.min(lastIndex, i)));
    setPlaying(false);
  };
  const advance = () => {
    if (active >= lastIndex) setPlaying(false);
    else setActive(active + 1);
  };

  // ← / → step through the chapters (not while typing in the chat box).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      e.preventDefault();
      setActive((a) => Math.max(0, Math.min(lastIndex, a + (e.key === "ArrowRight" ? 1 : -1))));
      setPlaying(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lastIndex]);

  const m = chapters[active];
  const art = extras.art[active];

  return (
    <div className="flex h-full flex-col px-[30px] pb-6 pt-7">
      <div className="flex shrink-0 items-center gap-4 border-b border-ui-cyan/25 pb-3">
        <span className="text-ui-cyan drop-shadow-[0_0_6px_rgba(104,215,233,0.6)]">
          <IconBook size={34} />
        </span>
        <h3 className="whitespace-nowrap font-display text-[23px] font-bold tracking-[0.12em] text-[#e9f6fb]">FULL STORY</h3>
        <span className="ml-auto min-w-0 truncate font-mono text-[12.5px] tracking-[0.16em] text-ui-amber">{"/// "}MISSION JOURNEY</span>
      </div>

      <Lifespan extras={extras} />

      {/* chapter stage */}
      <div key={`${rover.id}-${active}`} className="mt-3 grid min-h-0 flex-1 grid-cols-[1.15fr_1fr] gap-5">
        <ArtFrame art={art} />
        <div className="flex min-h-0 flex-col justify-center">
          <div className="animate-[hub-from-right_0.45s_cubic-bezier(.2,.8,.2,1)_both] font-mono text-[12px] tracking-[0.3em] text-ui-muted">
            CHAPTER {String(active + 1).padStart(2, "0")} <span className="text-ui-cyan/50">/ {String(chapters.length).padStart(2, "0")}</span>
          </div>
          <div className="mt-2 animate-[hub-from-right_0.45s_cubic-bezier(.2,.8,.2,1)_0.06s_both] font-mono text-[16px] tracking-[0.14em] text-ui-amber">
            {m.date.toUpperCase()}
          </div>
          <h4 className="mt-1 animate-[hub-from-right_0.45s_cubic-bezier(.2,.8,.2,1)_0.12s_both] font-display text-[24px] font-bold leading-tight tracking-[0.04em] text-[#f2f8fb]">
            {m.heading}
          </h4>
          <div className="my-3 h-[3px] w-16 animate-[hub-from-right_0.45s_cubic-bezier(.2,.8,.2,1)_0.16s_both] rounded-full bg-ui-cyan shadow-[0_0_10px_#68d7e9]" />
          <p className="animate-[hub-from-right_0.45s_cubic-bezier(.2,.8,.2,1)_0.2s_both] text-[15.5px] leading-relaxed text-ui-text/90">{m.summary}</p>
        </div>
      </div>

      {/* mission track */}
      <div className="mt-4 flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => (playing ? setPlaying(false) : (active >= lastIndex && setActive(0), setPlaying(true)))}
          aria-label={playing ? "Pause the story" : "Play the story"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ui-cyan/60 text-ui-cyan transition hover:bg-ui-cyan/15 focus-visible:outline-2 focus-visible:outline-ui-cyan"
        >
          {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
        </button>
        <ol className="relative flex min-w-0 flex-1 justify-between" aria-label="Mission chapters">
          {/* rail + progress */}
          <span className="absolute left-[24px] right-[24px] top-[23px] h-[3px] rounded-full bg-ui-cyan/15" />
          <span
            className="absolute left-[24px] top-[23px] h-[3px] rounded-full bg-gradient-to-r from-ui-cyan/60 to-ui-cyan shadow-[0_0_8px_#68d7e9] transition-[width] duration-700 ease-out"
            style={{ width: `calc((100% - 48px) * ${active / lastIndex})` }}
          />
          {chapters.map((c, i) => {
            const done = i < active;
            const on = i === active;
            return (
              <li key={i} className="relative z-10 flex w-[96px] flex-col items-center">
                <button
                  type="button"
                  onClick={() => pick(i)}
                  aria-current={on ? "step" : undefined}
                  aria-label={`Chapter ${i + 1}: ${c.heading}, ${c.date}`}
                  className={`relative flex h-[48px] w-[48px] items-center justify-center rounded-full border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-cyan ${
                    on
                      ? "scale-110 border-[#9cf1ff] bg-[#5fd8ec] text-[#04121f] shadow-[0_0_18px_rgba(95,216,236,0.7)]"
                      : done
                        ? "border-ui-cyan bg-[#0d2238] text-ui-cyan hover:bg-ui-cyan/20"
                        : "border-ui-cyan/35 bg-[#081624] text-ui-cyan/60 hover:border-ui-cyan hover:text-ui-cyan"
                  }`}
                >
                  {iconFor(c, i, i === lastIndex)}
                  {on && playing && (
                    <svg className="pointer-events-none absolute -inset-[6px] -rotate-90" viewBox="0 0 60 60" aria-hidden>
                      <circle
                        key={active}
                        cx="30"
                        cy="30"
                        r="28"
                        fill="none"
                        stroke="#f1aa61"
                        strokeWidth="2.5"
                        strokeDasharray="176"
                        strokeDashoffset="176"
                        style={{ animation: `hub-countdown ${CHAPTER_MS}ms linear forwards` }}
                        onAnimationEnd={advance}
                      />
                    </svg>
                  )}
                </button>
                <span className={`mt-1.5 font-mono text-[11px] tracking-widest ${on ? "text-ui-amber" : "text-ui-muted"}`}>{yearOf(c.date)}</span>
                <span className={`line-clamp-2 text-center text-[11px] leading-tight ${on ? "text-[#e9f6fb]" : "text-ui-text/60"}`}>{c.heading}</span>
              </li>
            );
          })}
        </ol>
        <div className="flex shrink-0 flex-col gap-1.5">
          <StepButton dir="right" disabled={active >= lastIndex} onClick={() => pick(active + 1)} />
          <StepButton dir="left" disabled={active <= 0} onClick={() => pick(active - 1)} />
        </div>
      </div>
    </div>
  );
}

export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

function yearOf(date: string): string {
  const years = date.match(/\d{4}/g);
  if (!years) return date;
  return years.length > 1 && years[0] !== years[years.length - 1] ? `${years[0]}–${years[years.length - 1].slice(2)}` : years[0];
}

function StepButton({ dir, disabled, onClick }: { dir: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={dir === "right" ? "Next chapter" : "Previous chapter"}
      className="flex h-[22px] w-[34px] items-center justify-center rounded border border-ui-cyan/50 text-ui-cyan transition hover:bg-ui-cyan/15 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-ui-cyan"
    >
      <IconTriangle size={12} dir={dir} />
    </button>
  );
}

// ---------------------------------------------------------------------------------------------

function useCountUp(target: number, ms = 1400, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / ms));
      setV(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, delay]);
  return v;
}

function Lifespan({ extras }: { extras: StoryExtras }) {
  const n = useCountUp(extras.actual, 1600, 250);
  const plannedPct = Math.max(1.2, (extras.planned / extras.actual) * 100);
  const shown = n >= extras.actual - 0.5 ? extras.actualLabel : Math.round(n).toLocaleString("en-US");
  return (
    <div className="mt-3 flex shrink-0 items-stretch overflow-hidden rounded-md border border-ui-cyan/30 bg-[#081827]/85">
      <div className="min-w-0 flex-1 px-4 py-2.5">
        <div className="flex items-baseline justify-between gap-3 whitespace-nowrap">
          <span className="font-mono text-[11px] tracking-[0.25em] text-ui-muted">MISSION LIFESPAN</span>
          <span className="font-display text-[13px] font-bold tracking-[0.1em] text-ui-amber">{extras.times} LONGER</span>
        </div>
        <div className="mt-2 grid grid-cols-[62px_1fr_auto] items-center gap-x-3 gap-y-1.5 whitespace-nowrap font-mono text-[11px] tracking-widest">
          <span className="text-ui-muted">PLANNED</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-white/5">
            <span className="block h-full rounded-full bg-ui-amber/80" style={{ width: `${plannedPct}%` }} />
          </span>
          <span className="min-w-[92px] text-right text-ui-text/80">
            {extras.planned} {extras.unit}
          </span>
          <span className="text-ui-cyan">ACTUAL</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-white/5">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-ui-cyan/70 to-[#9cf1ff] shadow-[0_0_10px_#68d7e9]"
              style={{ width: `${(n / extras.actual) * 100}%` }}
            />
          </span>
          <span className="min-w-[92px] text-right text-[#e9f6fb]">
            {shown} {extras.unit}
          </span>
        </div>
      </div>
      <div className="flex w-[138px] shrink-0 flex-col justify-center gap-1.5 border-l border-ui-cyan/25 px-3">
        {extras.stats.map((s, i) => (
          <div key={s.label} className="animate-[hub-rise_0.5s_cubic-bezier(.2,.8,.2,1)_both]" style={{ animationDelay: `${200 + i * 120}ms` }}>
            <div className="font-display text-[16px] font-bold leading-none text-[#e9f6fb]">{s.value}</div>
            <div className="mt-0.5 truncate font-mono text-[9px] tracking-[0.16em] text-ui-cyan/80">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtFrame({ art }: { art: ChapterArt }) {
  return (
    <div className="relative min-h-0 animate-[hub-from-left_0.5s_cubic-bezier(.2,.8,.2,1)_both] overflow-hidden rounded-lg border-2 border-ui-cyan/45 bg-[#05101b] shadow-[0_0_24px_rgba(104,215,233,0.15)]">
      {art.kind === "photo" && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={art.src}
            alt=""
            className={`absolute inset-0 h-full w-full animate-[hub-kenburns_14s_ease-out_both] object-cover ${art.fit === "top" ? "object-top" : "object-center"}`}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 font-mono text-[10px] tracking-widest text-ui-amber">NASA MISSION IMAGE</span>
          <span className="absolute bottom-2 left-2 font-mono text-[10px] tracking-wider text-white/75">{art.credit}</span>
        </>
      )}
      {art.kind === "signal" && <SignalLost art={art} />}
      {art.kind === "odometer" && <Odometer art={art} />}
      <Corners />
    </div>
  );
}

function Corners() {
  return (
    <>
      {["left-1.5 top-1.5 border-l-2 border-t-2", "right-1.5 top-1.5 border-r-2 border-t-2", "bottom-1.5 left-1.5 border-b-2 border-l-2", "bottom-1.5 right-1.5 border-b-2 border-r-2"].map((c) => (
        <span key={c} className={`pointer-events-none absolute h-4 w-4 border-[#9cf1ff]/80 ${c}`} />
      ))}
    </>
  );
}

function SignalLost({ art }: { art: Extract<ChapterArt, { kind: "signal" }> }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,#1a0f0c_0%,#05080d_75%)] px-6 text-center">
      {art.bg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art.bg} alt="" className="absolute inset-0 h-full w-full animate-[hub-kenburns_14s_ease-out_both] object-cover opacity-35 [filter:sepia(0.8)_saturate(1.4)_blur(1px)]" />
      )}
      <div className="relative flex h-[120px] w-[120px] items-center justify-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-ui-danger/70"
            style={{ animation: `hub-ring 3s ease-out ${i}s infinite both` }}
          />
        ))}
        <span className="relative flex h-[64px] w-[64px] items-center justify-center rounded-full border-2 border-ui-danger bg-black/60 text-ui-danger shadow-[0_0_20px_rgba(217,107,85,0.6)]">
          <IconSignalOff size={32} />
        </span>
      </div>
      <div className="relative mt-4 font-display text-[20px] font-bold tracking-[0.25em] text-[#f2f8fb]">LAST SIGNAL</div>
      <div className="relative mt-1 whitespace-nowrap font-mono text-[13px] tracking-[0.16em] text-ui-amber">
        {art.date}
        {art.sol && <span className="text-ui-text/70"> · {art.sol}</span>}
      </div>
      <p className="relative mt-2 max-w-[90%] text-[13.5px] text-ui-text/80">{art.note}</p>
      {/* flat-lining telemetry */}
      <svg className="relative mt-3 h-8 w-[85%]" viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden>
        <path
          d="M0 15 L40 15 L48 4 L56 26 L64 9 L72 21 L80 15 L130 15 L136 9 L142 21 L148 15 L300 15"
          fill="none"
          stroke="#d96b55"
          strokeWidth="2"
          strokeDasharray="420"
          style={{ animation: "hub-draw 2.4s ease-out both" }}
        />
      </svg>
    </div>
  );
}

function Odometer({ art }: { art: Extract<ChapterArt, { kind: "odometer" }> }) {
  const km = useCountUp(art.km, 2600, 200);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_120%,#6d2f1c_0%,#1a0d0a_55%,#05080d_100%)] px-6 text-center">
      <svg className="absolute inset-x-6 top-6 h-[45%] w-[calc(100%-48px)]" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden>
        <path
          d="M10 100 C40 90 50 60 80 70 S120 105 150 80 S190 30 220 45 S265 70 290 20"
          fill="none"
          stroke="#68d7e9"
          strokeWidth="2.5"
          strokeDasharray="6 5"
          opacity="0.35"
        />
        <path
          d="M10 100 C40 90 50 60 80 70 S120 105 150 80 S190 30 220 45 S265 70 290 20"
          fill="none"
          stroke="#9cf1ff"
          strokeWidth="3"
          strokeDasharray="420"
          style={{ animation: "hub-draw 2.6s ease-out 0.2s both", filter: "drop-shadow(0 0 4px #68d7e9)" }}
        />
        <circle cx="290" cy="20" r="5" fill="#f1aa61" style={{ animation: "hub-fade 0.4s ease-out 2.6s both" }} />
      </svg>
      <div className="relative mt-[22%] font-mono text-[46px] font-bold leading-none tracking-wider text-[#f2f8fb] [text-shadow:0_0_18px_rgba(104,215,233,0.6)]">
        {km.toFixed(3)}
        <span className="ml-2 text-[20px] text-ui-cyan">KM</span>
      </div>
      <div className="relative mt-2 font-display text-[14px] font-bold tracking-[0.25em] text-ui-amber">MARATHON DISTANCE</div>
      <p className="relative mt-1 text-[13.5px] text-ui-text/80">{art.note}</p>
    </div>
  );
}
