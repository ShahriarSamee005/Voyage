"use client";

import { useEffect, useRef } from "react";
import { actions } from "@/game/state/runStore";

// Rover terminal / destination select (team layout v2, "terminal-simplified-v2", Nov 15): the
// simplified room art with the Select Destination panel on the back wall, Back at the bottom left,
// and Confirm / Launch in the empty slot under the mission text in the panel's right-hand column.
// Mars is playable; the Moon card is shown locked as a future mission (no Moon gameplay).
// The v2 panel has the real mission text baked in, so nothing is drawn over it.
//
// Motion: the panel drops in, then Launch rises and Back slides in from the left; after that both
// buttons idle with a slow glow (styles in globals.css, switched off for reduced motion).

const ART = "/assets/dashboards/web";
// Panel art is 1520×780. Positions below are fractions of that image.
const PANEL = { left: 160, top: 28, width: 960 };
const PANEL_H = Math.round((PANEL.width * 780) / 1520);

export function DestinationSelect() {
  const launchRef = useRef<HTMLButtonElement>(null);
  useEffect(() => launchRef.current?.focus({ preventScroll: true }), []);

  return (
    <div className="pointer-events-auto relative h-full w-full overflow-hidden bg-[#1b1630]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ART}/terminal_room.webp`} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <h2 className="sr-only">Rover terminal: destination select</h2>

      <div
        className="term-panel-in absolute"
        style={{ left: PANEL.left, top: PANEL.top, width: PANEL.width, height: PANEL_H }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ART}/terminal_select.webp`}
          alt="Select destination. Mars, available and selected. The Moon, locked. Mars expedition: find Sojourner, Spirit and Opportunity. 3 rovers, about 10 minutes. Low power, soft soil, dust storms."
          className="absolute inset-0 h-full w-full"
        />

        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: "79%", top: "77.5%", width: "34.5%" }}>
          <button
            ref={launchRef}
            type="button"
            onClick={actions.launchMission}
            aria-label="Confirm and launch mission"
            className="term-launch-in block w-full rounded-md outline-none transition hover:scale-[1.03] hover:brightness-125 focus-visible:brightness-125 focus-visible:[filter:drop-shadow(0_0_6px_#b9ffe0)] active:scale-[0.98]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ART}/btn_launch.webp`} alt="" className="term-launch-idle block w-full" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={actions.backToTitle}
        aria-label="Back to title"
        className="term-back-in absolute bottom-[16px] left-[12px] w-[140px] outline-none transition hover:brightness-125 focus-visible:brightness-125 focus-visible:[filter:drop-shadow(0_0_6px_#9ff4ff)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ART}/btn_back.webp`} alt="" className="term-back-idle block w-full" />
      </button>
    </div>
  );
}
