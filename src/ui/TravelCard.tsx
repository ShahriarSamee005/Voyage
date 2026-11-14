"use client";

import type { TravelCard as Travel } from "@/game/state/types";

/** Jump-cut between legs (PRD §4.3): the real rovers are far apart, so the long drive is skipped. */
export function TravelCard({ travel }: { travel: Travel }) {
  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center bg-black/95" role="status">
      <div className="font-mono text-[13px] tracking-[0.4em] text-ui-muted">JUMP-CUT</div>
      <div className="mt-4 flex items-center gap-6 font-mono text-[26px] tracking-[0.15em]">
        <span className="text-ui-muted">{travel.from.toUpperCase()}</span>
        <span className="text-ui-amber">→</span>
        <span className="text-ui-text">{travel.to.toUpperCase()}</span>
      </div>
      <p className="mt-6 max-w-[620px] text-center text-[16px] leading-relaxed text-ui-muted">
        The real rovers rest far apart on Mars. This jump skips the long drive and drops you near the next one.
      </p>
    </div>
  );
}
