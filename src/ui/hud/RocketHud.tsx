"use client";

import { actions } from "@/game/state/runStore";
import { useRun } from "../useRun";

/** Rocket mini-game HUD: trajectory lock progress, controls hint, coins, pause. */
export function RocketHud() {
  const lock = useRun((s) => s.rocketLock ?? 0);
  const coins = useRun((s) => s.coins);
  const active = useRun((s) => s.mode === "explore" && !s.pauseOpen);
  const talking = useRun((s) => s.subtitle !== null);
  if (!active) return null;

  return (
    <>
      <div className="absolute left-1/2 top-6 w-[420px] -translate-x-1/2 rounded-md border border-ui-border/70 bg-ui-background/85 px-5 py-3">
        <div className="mb-1.5 flex justify-between font-mono text-[13px] tracking-widest">
          <span className="text-ui-cyan">TRAJECTORY LOCK · MARS</span>
          <span>{lock}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-sm bg-ui-panel-raised" role="progressbar" aria-valuenow={lock} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-ui-cyan transition-[width] duration-200" style={{ width: `${lock}%` }} />
        </div>
      </div>
      {/* controls hint steps aside while Mission Control's subtitle is on screen */}
      {!talking && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-5 py-2 text-[15px] text-ui-muted">
          Steer <kbd className="font-mono text-ui-text">W/S</kbd> or <kbd className="font-mono text-ui-text">↑/↓</kbd> · stay inside the corridor · dodge debris
        </div>
      )}
      <div className="absolute left-5 top-6 rounded-md border border-ui-border/70 bg-ui-background/85 px-4 py-2 font-mono text-[14px] text-ui-amber">◉ {coins}</div>
      <button
        type="button"
        onClick={() => actions.openPause()}
        aria-label="Pause"
        className="pointer-events-auto absolute bottom-6 right-5 rounded-md border border-ui-border/70 bg-ui-background/85 px-4 py-2.5 font-mono text-[14px] hover:border-ui-cyan focus-visible:outline-2 focus-visible:outline-ui-cyan"
      >
        ❚❚ <span className="ml-1 text-ui-muted">ESC</span>
      </button>
    </>
  );
}
