"use client";

import { useEffect, useRef, useState } from "react";
import { actions } from "@/game/state/runStore";
import { audio } from "@/game/audio/engine";
import { useRun } from "./useRun";

const btn =
  "w-full rounded border px-5 py-2.5 font-mono text-[15px] tracking-widest focus-visible:outline-2 focus-visible:outline-offset-2";

/** Basic pause: Resume / Return to Title, with a confirmation because runs are never saved (rules §4). */
export function PauseMenu() {
  const pauseOpen = useRun((s) => s.pauseOpen);
  const confirmOpen = useRun((s) => s.confirmReturnOpen);
  const firstRef = useRef<HTMLButtonElement>(null);
  const [, rerender] = useState(0);
  const muted = audio.isMuted; // read on render; the M key may also change it
  const setMuted = (m: boolean) => {
    audio.setMuted(m);
    rerender((n) => n + 1);
  };
  useEffect(() => firstRef.current?.focus({ preventScroll: true }), [pauseOpen, confirmOpen]);

  if (!pauseOpen && !confirmOpen) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/55">
      <div role="dialog" aria-modal className="w-[380px] rounded-md border border-ui-border bg-ui-background px-8 py-7 shadow-2xl">
        {!confirmOpen ? (
          <>
            <h2 className="mb-6 text-center font-mono text-[22px] tracking-[0.3em] text-ui-text">PAUSED</h2>
            <div className="space-y-3">
              <button ref={firstRef} type="button" onClick={actions.resume} className={`${btn} border-ui-amber bg-ui-amber/15 text-ui-amber outline-ui-amber`}>
                RESUME
              </button>
              <button
                type="button"
                onClick={() => setMuted(!muted)}
                className={`${btn} border-ui-border text-ui-text outline-ui-cyan hover:border-ui-cyan`}
              >
                SOUND: {muted ? "OFF" : "ON"} <span className="text-ui-muted">(M)</span>
              </button>
              <button type="button" onClick={actions.requestReturnToTitle} className={`${btn} border-ui-border text-ui-text outline-ui-cyan hover:border-ui-cyan`}>
                RETURN TO TITLE
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-3 font-mono text-[18px] tracking-widest text-ui-warning">RETURN TO TITLE?</h2>
            <p className="mb-6 text-[16px] leading-relaxed text-ui-muted">
              This run isn&apos;t saved. Your discoveries, coins and progress will be lost.
            </p>
            <div className="flex gap-3">
              <button ref={firstRef} type="button" onClick={actions.cancelReturnToTitle} className={`${btn} border-ui-border text-ui-text outline-ui-cyan`}>
                CANCEL
              </button>
              <button type="button" onClick={actions.confirmReturnToTitle} className={`${btn} border-ui-danger bg-ui-danger/15 text-ui-danger outline-ui-danger`}>
                LEAVE RUN
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
