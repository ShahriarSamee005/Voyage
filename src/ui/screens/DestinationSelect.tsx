"use client";

import { useEffect, useRef } from "react";
import { actions } from "@/game/state/runStore";

// REF-DEST (design.md §5.2): rover-terminal destination select. Mars playable; Moon shown locked
// as "next mission" (nice-to-have card, no Moon gameplay). Copy describes rover recovery only —
// no colony, mining or habitability objective.

export function DestinationSelect() {
  const launchRef = useRef<HTMLButtonElement>(null);
  useEffect(() => launchRef.current?.focus({ preventScroll: true }), []);

  return (
    <div className="pointer-events-auto relative flex h-full w-full items-center justify-center bg-[radial-gradient(ellipse_at_center,#10263a_0%,#0c1828_60%,#070d17_100%)]">
      <div className="w-[1120px] rounded-xl border-2 border-ui-border bg-ui-background/95 p-8 shadow-2xl">
        <header className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-[26px] font-bold tracking-[0.25em] text-ui-text">DESTINATION SELECT</h2>
          <span className="font-mono text-[13px] tracking-widest text-ui-muted">ROVER TERMINAL · SELECT A PLANET</span>
        </header>

        <div className="flex gap-6">
          <div className="flex gap-4">
            <div className="flex w-[230px] flex-col items-center rounded-lg border-2 border-ui-cyan bg-ui-cyan/10 p-5" aria-current="true">
              <div className="h-[130px] w-[130px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#e08a4c,#b65d3a_55%,#5a2a1e)] shadow-[0_0_30px_rgba(214,121,70,0.35)]" />
              <div className="mt-4 font-display text-[22px] font-bold tracking-widest">MARS</div>
              <span className="mt-2 rounded border border-ui-cyan px-3 py-0.5 font-mono text-[12px] tracking-widest text-ui-cyan">PLAYABLE</span>
            </div>
            <div className="flex w-[230px] flex-col items-center rounded-lg border-2 border-ui-border/50 p-5 opacity-60" aria-disabled="true">
              <div className="flex h-[130px] w-[130px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_35%,#bfc3c7,#80868c_60%,#3c4045)] text-[40px]">
                🔒
              </div>
              <div className="mt-4 font-display text-[22px] font-bold tracking-widest">MOON</div>
              <span className="mt-2 rounded border border-ui-border px-3 py-0.5 font-mono text-[12px] tracking-widest text-ui-muted">LOCKED · NEXT MISSION</span>
            </div>
          </div>

          <div className="flex flex-1 flex-col rounded-lg border border-ui-border/70 bg-ui-panel p-6">
            <div className="font-mono text-[13px] tracking-widest text-ui-amber">CURRENT MISSION: MARS</div>
            <p className="mt-3 text-[17px] leading-relaxed">
              Find three explorers left behind — <strong>Sojourner</strong>, <strong>Spirit</strong> and{" "}
              <strong>Opportunity</strong>. Inspect each rover, learn how its mission ended, and bring their stories and
              discoveries back to Earth.
            </p>
            <dl className="mt-5 grid grid-cols-[150px_1fr] gap-y-2 font-mono text-[14px]">
              <dt className="text-ui-muted">ROVERS TO FIND</dt>
              <dd>3</dd>
              <dt className="text-ui-muted">HAZARDS</dt>
              <dd>Low power · soft soil · dust storm</dd>
              <dt className="text-ui-muted">PLAY TIME</dt>
              <dd>About 10 minutes</dd>
            </dl>
            <p className="mt-5 text-[13px] text-ui-muted">
              Your rover, lander and Mission Control are fictional. The rovers you find — and their stories and photos — are real NASA history.
            </p>
            <div className="mt-auto flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={actions.backToTitle}
                className="whitespace-nowrap rounded border border-ui-border px-5 py-2.5 font-mono text-[14px] tracking-widest text-ui-muted hover:text-ui-text focus-visible:outline-2 focus-visible:outline-ui-cyan"
              >
                ← BACK
              </button>
              <button
                ref={launchRef}
                type="button"
                onClick={actions.launchMission}
                className="whitespace-nowrap rounded border-2 border-ui-amber bg-ui-amber/20 px-7 py-2.5 font-display text-[15px] font-bold tracking-[0.2em] text-[#ffe2c2] hover:bg-ui-amber/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-amber"
              >
                CONFIRM / LAUNCH MISSION »
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
