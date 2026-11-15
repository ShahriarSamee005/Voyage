"use client";

import { useEffect, useRef } from "react";
import { actions } from "@/game/state/runStore";

// Rover terminal / destination select (team layout, Nov 15), placed per "terminal layout
// reference.png": the team's terminal-room art, the Destination Select panel above the console,
// Back at the bottom left, and Confirm / Launch in the panel's empty right-hand slot.
// Mars is playable; the Moon card is shown locked as a future mission (no Moon gameplay).
//
// The panel art has a generic mission blurb baked in ("~30–60 min", "past habitability",
// "collect samples") that doesn't match this game, so that one block is covered with the panel's
// own colour and the real mission text (design.md §5.2: rover recovery only; a run is ~10 min).

const ART = "/assets/dashboards/web";
// Panel art is 1536×901 (trimmed). Positions below are fractions of that image.
const PANEL = { left: 160, top: 6, width: 960 };
const PANEL_H = Math.round((PANEL.width * 901) / 1536);

export function DestinationSelect() {
  const launchRef = useRef<HTMLButtonElement>(null);
  useEffect(() => launchRef.current?.focus({ preventScroll: true }), []);

  return (
    <div className="pointer-events-auto relative h-full w-full overflow-hidden bg-[#1b1630]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ART}/terminal_bg.webp`} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <h2 className="sr-only">Rover terminal — destination select</h2>

      <div className="absolute" style={{ left: PANEL.left, top: PANEL.top, width: PANEL.width, height: PANEL_H }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ART}/terminal_panel.webp`}
          alt="Destinations: Mars, playable and selected. The Moon, locked, a future mission."
          className="absolute inset-0 h-full w-full"
        />

        {/* Real mission summary over the baked placeholder blurb. */}
        <div
          className="absolute flex flex-col justify-center bg-[#051428] pl-[3px] pr-1"
          style={{ left: "58.2%", top: "51.2%", width: "37.4%", height: "23.6%" }}
        >
          <p className="text-[14px] leading-[1.35] text-[#e8f1f8]">
            Find three explorers left behind — <strong>Sojourner</strong>, <strong>Spirit</strong> and{" "}
            <strong>Opportunity</strong> — and learn how each mission ended.
          </p>
          <dl className="mt-2 grid grid-cols-[112px_1fr] gap-y-0.5 text-[13px] leading-snug">
            <dt className="font-mono text-[11.5px] tracking-wider text-[#5fd8ec]">ROVERS:</dt>
            <dd className="text-[#e8f1f8]">3 to find</dd>
            <dt className="font-mono text-[11.5px] tracking-wider text-[#5fd8ec]">HAZARDS:</dt>
            <dd className="whitespace-nowrap text-[#e8f1f8]">Low power · soft soil · dust storm</dd>
            <dt className="font-mono text-[11.5px] tracking-wider text-[#5fd8ec]">MISSION TIME:</dt>
            <dd className="text-[#e8f1f8]">About 10 minutes</dd>
          </dl>
        </div>

        <button
          ref={launchRef}
          type="button"
          onClick={actions.launchMission}
          aria-label="Confirm and launch mission"
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md outline-none transition hover:brightness-125 focus-visible:brightness-125 focus-visible:[filter:drop-shadow(0_0_6px_#b9ffe0)]"
          style={{ left: "75.6%", top: "81%", width: "39.5%" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ART}/btn_launch.webp`} alt="" className="block w-full" />
        </button>
      </div>

      <button
        type="button"
        onClick={actions.backToTitle}
        aria-label="Back to title"
        className="absolute bottom-[16px] left-[12px] w-[140px] outline-none transition hover:brightness-125 focus-visible:brightness-125 focus-visible:[filter:drop-shadow(0_0_6px_#9ff4ff)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ART}/btn_back.webp`} alt="" className="block w-full" />
      </button>
    </div>
  );
}
