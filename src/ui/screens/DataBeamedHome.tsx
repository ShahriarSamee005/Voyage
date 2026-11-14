"use client";

import { useEffect, useRef } from "react";
import { marsRovers } from "@/content";
import { actions } from "@/game/state/runStore";
import { useRun } from "../useRun";

// "Data Beamed Home" (PRD §4.1 #14): hybrid mission debrief + one real NASA photo per rover,
// with a one-line epitaph and verified dates. Genuine imagery is labelled and credited.

// End-screen picks (content-prep/nasa-images.md): Sojourner & Yogi, Spirit's silica soil, Opportunity's last panorama.
const END_IMAGE: Record<string, string> = {
  sojourner: "/assets/nasa-photos/sojourner/sojourner-yogi.jpg",
  spirit: "/assets/nasa-photos/spirit/spirit-silica-soil.jpg",
  opportunity: "/assets/nasa-photos/opportunity/opportunity-last-panorama.jpg",
};

export function DataBeamedHome() {
  const discovered = useRun((s) => s.discoveredRovers.length);
  const againRef = useRef<HTMLButtonElement>(null);
  useEffect(() => againRef.current?.focus({ preventScroll: true }), []);

  return (
    <div className="pointer-events-auto flex h-full w-full flex-col bg-[#070d17] px-12 py-9">
      <header className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[13px] tracking-[0.4em] text-ui-amber">MISSION DEBRIEF</div>
          <h2 className="mt-1 font-display text-[40px] font-black tracking-[0.15em]">DATA BEAMED HOME</h2>
        </div>
        <div className="text-right font-mono text-[14px] text-ui-muted">
          ROVER ARCHIVES RECOVERED <span className="ml-2 text-[20px] text-ui-cyan">{discovered}/3</span>
        </div>
      </header>

      <div className="mt-7 grid flex-1 grid-cols-3 gap-6">
        {marsRovers.map((r) => {
          const src = END_IMAGE[r.id];
          const img = r.gallery.find((g) => g.src === src) ?? r.gallery[0];
          return (
            <article key={r.id} className="flex flex-col overflow-hidden rounded-lg border border-ui-border/70 bg-ui-background">
              <div className="relative h-[230px] bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.title} className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2 rounded bg-black/75 px-2 py-0.5 font-mono text-[11px] tracking-widest text-ui-amber">
                  NASA MISSION IMAGE
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-[22px] font-bold tracking-widest">{r.name.toUpperCase()}</h3>
                  <span className="font-mono text-[15px] text-ui-cyan">{r.epitaph.dates}</span>
                </div>
                <p className="mt-3 text-[16px] italic leading-relaxed text-ui-text/90">&ldquo;{r.epitaph.line}&rdquo;</p>
                <p className="mt-auto pt-4 font-mono text-[11px] leading-snug text-ui-muted">
                  {img.title} · {img.date} · {img.credit}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="mt-7 flex items-center justify-between">
        <div className="max-w-[680px] text-[14px] text-ui-muted">
          <p>The machines stopped, but their discoveries still matter. Every photo above was taken on Mars by NASA.</p>
          <p className="mt-1 font-mono text-[11px] leading-snug">
            Photos: NASA/JPL, NASA/JPL-Caltech, Cornell, ASU · Narration voices generated with ElevenLabs (elevenlabs.io) ·
            Music &amp; sound synthesized in-game · Rover chat: Google Gemini
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={actions.backToTitle}
            className="rounded border border-ui-border px-6 py-2.5 font-mono text-[14px] tracking-widest text-ui-text hover:border-ui-cyan focus-visible:outline-2 focus-visible:outline-ui-cyan"
          >
            BACK TO TITLE
          </button>
          <button
            ref={againRef}
            type="button"
            onClick={actions.playAgain}
            className="rounded border-2 border-ui-amber bg-ui-amber/20 px-7 py-2.5 font-display text-[15px] font-bold tracking-[0.2em] text-[#ffe2c2] hover:bg-ui-amber/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-amber"
          >
            PLAY AGAIN
          </button>
        </div>
      </footer>
    </div>
  );
}
