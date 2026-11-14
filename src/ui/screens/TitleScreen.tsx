"use client";

import { useEffect, useRef } from "react";
import { actions } from "@/game/state/runStore";

// REF-TITLE composition (design.md §5.1): cinematic Mars vista, dominant VOYAGE wordmark,
// glowing amber Play. Decorative only — no base/outpost implied as a game feature.

function Stars() {
  const stars = Array.from({ length: 70 }, (_, i) => {
    const x = (i * 9301 + 49297) % 1280;
    const y = (i * 233 + 17) % 330;
    return <rect key={i} x={x} y={y} width={i % 7 === 0 ? 3 : 2} height={i % 7 === 0 ? 3 : 2} fill="#f0f4f5" opacity={0.35 + ((i * 37) % 60) / 100} />;
  });
  return <>{stars}</>;
}

export function TitleScreen() {
  const playRef = useRef<HTMLButtonElement>(null);
  useEffect(() => playRef.current?.focus({ preventScroll: true }), []);

  return (
    <div className="pointer-events-auto relative h-full w-full overflow-hidden bg-[#140b14]">
      <svg className="absolute inset-0" width="1280" height="720" viewBox="0 0 1280 720" aria-hidden shapeRendering="crispEdges">
        <defs>
          <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0c0a1a" />
            <stop offset="0.45" stopColor="#3a1c2a" />
            <stop offset="0.75" stopColor="#a4502e" />
            <stop offset="1" stopColor="#e08a4c" />
          </linearGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#dusk)" />
        <Stars />
        {/* tiny bright point: Earth */}
        <circle cx="1080" cy="120" r="4" fill="#cfeeff" />
        <circle cx="1080" cy="120" r="10" fill="#9fd3ff" opacity="0.25" />
        {/* layered mesas and ridges */}
        <path d="M0 470 L120 430 L210 450 L330 400 L420 420 L520 380 L640 410 L760 370 L880 405 L990 380 L1110 420 L1280 390 L1280 720 L0 720 Z" fill="#7a3a28" />
        <path d="M0 520 L90 500 L200 515 L300 480 L430 505 L560 470 L700 500 L840 470 L960 505 L1100 480 L1280 510 L1280 720 L0 720 Z" fill="#9b4a2c" />
        <path d="M0 590 L160 560 L320 585 L520 555 L760 590 L980 560 L1280 585 L1280 720 L0 720 Z" fill="#5a2a1e" />
        <path d="M0 650 L260 625 L520 645 L820 620 L1280 650 L1280 720 L0 720 Z" fill="#3a1b14" />
      </svg>
      {/* the player rover, silhouetted on the near ridge */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/rovers/player/player_W.png"
        alt=""
        className="absolute bottom-[72px] left-[150px] w-[150px] [clip-path:inset(0_0_5%_0)] [image-rendering:pixelated]"
        style={{ filter: "brightness(0.75) saturate(0.9)" }}
      />

      <div className="absolute inset-x-0 top-[120px] flex flex-col items-center">
        <h1 className="font-display text-[118px] font-black leading-none tracking-[0.12em] text-[#f6e6d6] [text-shadow:0_0_28px_rgba(241,170,97,0.45)]">
          VOYAGE
        </h1>
        <p className="mt-4 font-mono text-[15px] tracking-[0.45em] text-ui-amber">EVERY MISSION LEAVES SOMETHING BEHIND</p>
        <button
          ref={playRef}
          type="button"
          onClick={actions.goToDestination}
          className="mt-14 rounded-lg border-2 border-ui-amber bg-ui-amber/20 px-20 py-4 font-display text-[28px] font-bold tracking-[0.3em] text-[#ffe2c2] shadow-[0_0_30px_rgba(241,170,97,0.45)] transition hover:bg-ui-amber/35 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ui-amber"
        >
          ▶ PLAY
        </button>
      </div>

      <div className="absolute bottom-5 left-0 right-0 flex justify-between px-8 font-mono text-[12px] tracking-widest text-ui-muted">
        <span>NASA SPACE APPS CHALLENGE 2026 · TEAM AI&apos;M NOT SURE</span>
        <span>A FICTIONAL MISSION · REAL NASA HISTORY · VOICES: ELEVENLABS.IO</span>
      </div>
    </div>
  );
}
