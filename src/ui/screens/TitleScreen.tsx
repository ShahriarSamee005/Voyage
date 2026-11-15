"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { actions } from "@/game/state/runStore";
import { audio } from "@/game/audio/engine";

// Title screen (team layout, Nov 15): the team's painted Mars vista (wordmark, base and rover are
// part of the art) with three centred buttons, placed per "Title Screen layout reference.png".
// Team decision (Nov 15): no footer text on this screen — the AI-art note and ElevenLabs credit live in the Credits panel.

const ART = "/assets/dashboards/web";
// Warm the terminal screen's art while the player is on the title, so Play switches instantly.
const PRELOAD = ["terminal_bg.webp", "terminal_panel.webp", "btn_launch.webp", "btn_back.webp"];

const CHAMFER_HEX = "polygon(18px 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 18px 100%, 0 50%)";
const CHAMFER_HEX_IN = "polygon(16px 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 16px 100%, 0 50%)";
const CHAMFER_BOX = "polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)";
const CHAMFER_BOX_IN = "polygon(9px 0, calc(100% - 9px) 0, 100% 9px, 100% calc(100% - 9px), calc(100% - 9px) 100%, 9px 100%, 0 calc(100% - 9px), 0 9px)";

type Panel = null | "settings" | "credits";

export function TitleScreen() {
  const playRef = useRef<HTMLButtonElement>(null);
  const [panel, setPanel] = useState<Panel>(null);

  useEffect(() => {
    for (const f of PRELOAD) new Image().src = `${ART}/${f}`;
  }, []);
  useEffect(() => {
    if (!panel) playRef.current?.focus({ preventScroll: true });
  }, [panel]);

  return (
    <div className="pointer-events-auto relative h-full w-full overflow-hidden bg-[#140b14]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ART}/title_bg.webp`} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
      <h1 className="sr-only">Voyage</h1>

      {/* Play — glowing amber hex plate */}
      <button
        ref={playRef}
        type="button"
        onClick={actions.goToDestination}
        aria-label="Play"
        className="group absolute left-1/2 top-[310px] h-[70px] w-[334px] -translate-x-1/2 outline-none [filter:drop-shadow(0_0_14px_rgba(255,140,60,0.65))] transition hover:[filter:drop-shadow(0_0_22px_rgba(255,150,70,0.9))] focus-visible:[filter:drop-shadow(0_0_6px_#fff)_drop-shadow(0_0_18px_rgba(255,150,70,0.9))]"
      >
        <span className="absolute inset-0 bg-[#ffb36b]" style={{ clipPath: CHAMFER_HEX }} />
        <span
          className="absolute inset-[3px] bg-[linear-gradient(180deg,#a8461a_0%,#7a2c0f_45%,#5e200b_55%,#93401a_100%)] transition group-hover:brightness-125"
          style={{ clipPath: CHAMFER_HEX_IN }}
        />
        <span className="absolute inset-x-[30px] top-[8px] h-px bg-[#ffcf9a]/50" />
        <span className="absolute inset-x-[30px] bottom-[8px] h-px bg-[#ffcf9a]/35" />
        <span className="relative flex h-full items-center justify-center gap-5 font-display text-[32px] font-bold tracking-[0.22em] text-[#fff1e2] [text-shadow:0_0_10px_rgba(255,190,130,0.8)]">
          <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden className="-mt-0.5">
            <path d="M0 0 L22 13 L0 26 Z" fill="currentColor" />
          </svg>
          PLAY
        </span>
      </button>

      <PlateButton top={403} onClick={() => setPanel("settings")} icon={<GearIcon />} label="SETTINGS" />
      <PlateButton top={465} onClick={() => setPanel("credits")} icon={<ListIcon />} label="CREDITS" />

      {panel === "settings" && <SettingsPanel onClose={() => setPanel(null)} />}
      {panel === "credits" && <CreditsPanel onClose={() => setPanel(null)} />}
    </div>
  );
}

function PlateButton({ top, onClick, icon, label }: { top: number; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group absolute left-1/2 h-[44px] w-[236px] -translate-x-1/2 outline-none [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.5))] focus-visible:[filter:drop-shadow(0_0_5px_#cfe9ff)]"
      style={{ top }}
    >
      <span className="absolute inset-0 bg-[#9aa3b4]/70 transition group-hover:bg-[#d4dbe8]" style={{ clipPath: CHAMFER_BOX }} />
      <span className="absolute inset-[2px] bg-[#23252f]/85 transition group-hover:bg-[#2e3140]/90" style={{ clipPath: CHAMFER_BOX_IN }} />
      <span className="relative flex h-full items-center justify-center gap-3 font-display text-[17px] font-semibold tracking-[0.22em] text-[#c9cfda] transition group-hover:text-white">
        {icon}
        {label}
      </span>
    </button>
  );
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M10.3 1h3.4l.5 3a8 8 0 0 1 2.1 1.2l2.9-1.1 1.7 2.9-2.4 2a8 8 0 0 1 0 2.4l2.4 2-1.7 2.9-2.9-1.1a8 8 0 0 1-2.1 1.2l-.5 3h-3.4l-.5-3a8 8 0 0 1-2.1-1.2l-2.9 1.1-1.7-2.9 2.4-2a8 8 0 0 1 0-2.4l-2.4-2 1.7-2.9 2.9 1.1A8 8 0 0 1 9.8 4l.5-3ZM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden fill="currentColor">
      <path d="M2 0h16a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2Zm2 5v2h12V5H4Zm0 5v2h12v-2H4Zm0 5v2h8v-2H4Z" />
    </svg>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[600px] w-[620px] overflow-y-auto rounded-md border border-ui-border bg-ui-background/95 px-9 py-7 shadow-2xl"
      >
        <h2 className="mb-5 font-display text-[22px] font-bold tracking-[0.25em] text-ui-text">{title}</h2>
        {children}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded border border-ui-border px-5 py-2.5 font-mono text-[15px] tracking-widest text-ui-muted hover:text-ui-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-cyan"
        >
          CLOSE (ESC)
        </button>
      </div>
    </div>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [muted, setMutedState] = useState(audio.isMuted);
  const toggle = () => {
    audio.setMuted(!muted);
    setMutedState(!muted);
  };
  return (
    <Modal title="SETTINGS" onClose={onClose}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={!muted}
        className="flex w-full items-center justify-between rounded border border-ui-border bg-ui-panel px-5 py-3 font-mono text-[16px] tracking-widest focus-visible:outline-2 focus-visible:outline-ui-cyan"
      >
        <span>SOUND</span>
        <span className={muted ? "text-ui-muted" : "text-ui-cyan"}>{muted ? "OFF" : "ON"}</span>
      </button>
      <p className="mt-4 text-[14px] leading-relaxed text-ui-muted">
        Music, sound effects and narration. Subtitles are always on. During play, press M to mute or Esc to pause.
      </p>
    </Modal>
  );
}

function CreditsPanel({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["Made by", "Team AI'm not sure · NASA Space Apps Challenge 2026"],
    ["Real NASA images", "NASA/JPL, NASA/JPL-Caltech, Cornell, ASU (via NASA Photojournal), labelled in game"],
    ["Narration voices", "AI-generated with ElevenLabs (elevenlabs.io)"],
    ["Rover chat", "Google Gemini, answering only from NASA mission facts"],
    ["Art", "Pixel art and screen art are AI-generated; cinematic scenery drawn in code"],
    ["Music & sound", "Synthesized live in code"],
    ["Code", "AI-assisted (Claude), reviewed and tested by the team"],
    ["Fonts", "Geist, Geist Mono, Orbitron (SIL Open Font License)"],
  ];
  return (
    <Modal title="CREDITS" onClose={onClose}>
      <dl className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-3 text-[14px] leading-snug">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-mono text-[12px] tracking-widest text-ui-cyan">{k.toUpperCase()}</dt>
            <dd className="text-ui-text">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-[13px] leading-relaxed text-ui-muted">
        Your rover, lander and Mission Control are fictional. Sojourner, Spirit and Opportunity (their stories and
        photos) are real NASA history. Voyage is not affiliated with or endorsed by NASA.
      </p>
    </Modal>
  );
}
