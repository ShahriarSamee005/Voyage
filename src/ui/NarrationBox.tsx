"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Dialogue } from "@/game/state/types";

// One styled comms panel for ALL narration text (fix J1/J2): cinematic subtitles and in-game
// dialogue both render through it. Chamfered terminal frame matching the rover-terminal art,
// a speaker tab with an icon and accent colour per voice, and a typewriter reveal.
// Subtitles stay always-on and carry the full text (rules §3): the whole line is laid out
// from the first frame (untyped part invisible, so the box never jumps) and screen readers
// get the full text at once.

export type NarrationSpeaker = Dialogue["speaker"]; // "mission_control" | "player_rover" | "system"

const VOICE: Record<NarrationSpeaker, { label: string; accent: string; glow: string; icon: ReactNode }> = {
  mission_control: { label: "MISSION CONTROL", accent: "#f1aa61", glow: "rgba(241,170,97,0.35)", icon: <SignalIcon /> },
  player_rover: { label: "VOYAGE ROVER", accent: "#5fd8ec", glow: "rgba(95,216,236,0.35)", icon: <RoverIcon /> },
  system: { label: "MISSION LOG", accent: "#9fb3c8", glow: "rgba(159,179,200,0.25)", icon: <LogIcon /> },
};

const FRAME = "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)";
const FRAME_IN = "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)";

export function NarrationBox({
  speaker,
  tag,
  live = false,
  className = "",
  children,
  footer,
}: {
  speaker: NarrationSpeaker;
  /** Optional context after the speaker name, e.g. "Mission log". */
  tag?: string;
  /** Pulsing "on air" light — true while text is still being revealed. */
  live?: boolean;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const v = VOICE[speaker];
  return (
    <div className={`relative pt-3 ${className}`} style={{ filter: `drop-shadow(0 0 14px ${v.glow}) drop-shadow(0 6px 18px rgba(0,0,0,0.6))` }}>
      {/* frame: accent edge + deep-navy glass with faint scanlines */}
      <div className="absolute inset-x-0 bottom-0 top-3" style={{ clipPath: FRAME, background: v.accent, opacity: 0.75 }} />
      <div
        className="absolute inset-x-[2px] bottom-[2px] top-[14px]"
        style={{
          clipPath: FRAME_IN,
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px), linear-gradient(180deg, rgba(9,22,40,0.96), rgba(4,11,22,0.96))",
        }}
      />
      <div className="absolute bottom-[14px] left-[2px] top-[30px] w-[3px]" style={{ background: v.accent, opacity: 0.8 }} />

      {/* speaker tab sitting on the top edge */}
      <div
        className="absolute left-6 top-0 flex h-6 items-center gap-2 px-3 font-mono text-[12px] font-semibold tracking-[0.3em] text-[#06101d]"
        style={{ background: v.accent, clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }}
      >
        {v.icon}
        {v.label}
        {tag && <span className="font-normal tracking-[0.2em] opacity-75">{"// "}{tag.toUpperCase()}</span>}
        <span
          className={`ml-1 inline-block h-2 w-2 rounded-full bg-[#06101d] ${live ? "animate-pulse" : "opacity-30"}`}
          aria-hidden
        />
      </div>

      <div className="relative px-8 pb-4 pt-5">
        {children}
        {footer}
      </div>
    </div>
  );
}

/**
 * Typewriter text: reveals `text` over `seconds`, then calls onDone. The full text is always laid
 * out (untyped remainder invisible) so lines never re-wrap, and is given to screen readers whole.
 * `complete` shows everything at once (skip, or reduced-motion users).
 */
export function TypedText({
  text,
  seconds,
  complete = false,
  accent,
  onDone,
}: {
  text: string;
  seconds: number;
  complete?: boolean;
  accent: string;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState(0);
  const reduce = usePrefersReducedMotion();
  const instant = complete || reduce || seconds <= 0;
  const count = instant ? text.length : shown;

  useEffect(() => {
    if (instant) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const n = Math.min(text.length, Math.ceil(((now - start) / 1000 / seconds) * text.length));
      setShown(n);
      if (n < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, seconds, instant]);

  const done = count >= text.length;
  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, count)}
        {!done && (
          <span className="relative">
            <span className="absolute -left-px top-[0.12em] h-[1.05em] w-[0.5em] animate-pulse" style={{ background: accent }} />
          </span>
        )}
        <span className="invisible">{text.slice(count)}</span>
      </span>
    </>
  );
}

export const accentFor = (speaker: NarrationSpeaker) => VOICE[speaker].accent;

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    mq.addEventListener("change", update);
    const id = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(id);
      mq.removeEventListener("change", update);
    };
  }, []);
  return reduce;
}

function SignalIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor" aria-hidden>
      <rect x="0" y="8" width="2.5" height="4" />
      <rect x="3.8" y="5" width="2.5" height="7" />
      <rect x="7.6" y="2.5" width="2.5" height="9.5" />
      <rect x="11.4" y="0" width="2.5" height="12" />
    </svg>
  );
}

function RoverIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden>
      <rect x="9" y="0" width="2" height="4" />
      <rect x="7" y="0" width="5" height="2" />
      <rect x="2" y="4" width="12" height="4" />
      <circle cx="3.5" cy="10" r="2" />
      <circle cx="8" cy="10" r="2" />
      <circle cx="12.5" cy="10" r="2" />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <path d="M1 0h10v12H1zM3 3v1.5h6V3zm0 3v1.5h6V6zm0 3v1.5h4V9z" fillRule="evenodd" />
    </svg>
  );
}
