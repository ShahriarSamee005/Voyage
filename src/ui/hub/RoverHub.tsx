"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { getRover, marsRovers } from "@/content";
import type { GalleryImage, Rover, RoverId } from "@/content/types";
import { actions } from "@/game/state/runStore";
import type { RunState } from "@/game/state/types";
import { TUNING } from "@/game/tuning";
import { sendChat, useThread } from "@/chat/chatStore";
import { useRun } from "../useRun";
import { AiTag } from "../AiTag";
import { RoverModel3D } from "./RoverModel3D";
import { SketchfabViewer } from "./SketchfabViewer";
import { isTypingTarget, StoryPanel } from "./StoryPanel";
import { BatteryBar } from "../hud/BatteryBar";
import { COMMS_LABEL, SOLAR_LABEL, TOOL_NAMES, TRACTION_LABEL } from "../labels";
import {
  IconBook,
  IconBurger,
  IconChat,
  IconChevron,
  IconClose,
  IconCube,
  IconExpand,
  IconGallery,
  IconGauge,
  IconLock,
  IconPerson,
  IconRover,
  IconSend,
  IconSignal,
  IconTriangle,
} from "./icons";

/**
 * Rover Hub — redesigned to the team's layout (Phase J, Nov 15): background + top bar + three
 * framed cards (team art, 9-slice scaled so they stretch cleanly). Left: the rover's portrait and
 * its sections. Middle: photo gallery (or full story / 3D model). Right: AI chat. Voyage has no
 * photo gallery (team decision, Nov 15): its middle card is its systems status and it has no right
 * card. Side cards collapse to the edges; the middle expands to fill. Cards animate in.
 * Gameplay stays paused while open. Voyage (My Rover) and the rover archives stay separate views
 * (rules §4): Voyage shows status, never archive data; archives show history, never diagnostics.
 */

const ART = "/assets/hub";
type HubId = "voyage" | RoverId;
type Middle = "gallery" | "story" | "model";

interface HubSubject {
  name: string;
  role: string;
  years: string;
  link: string;
  portrait: string;
  portraitTag: string;
  pixel?: boolean;
  gallery: (GalleryImage & { pixel?: boolean })[];
  galleryTag?: string;
  galleryIntro?: string;
  imageLabel: string;
}

// Portraits show what each rover really looked like (real NASA photos of the hardware on Earth;
// neither MER twin was ever photographed whole on Mars).
const ROLE: Record<RoverId, { role: string; link: string; portrait: string; portraitTag: string }> = {
  sojourner: {
    role: "FIRST MARS ROVER",
    link: "SOJOURNER (PATHFINDER)",
    portrait: "/assets/nasa-photos/sojourner/sojourner-rover.webp",
    portraitTag: "FLIGHT SPARE · NASA/JPL",
  },
  spirit: {
    role: "MARS EXPLORATION ROVER",
    link: "SPIRIT (MER-A)",
    portrait: "/assets/nasa-photos/spirit/spirit-rover.webp",
    portraitTag: "SPIRIT AT KENNEDY, 2003 · NASA",
  },
  opportunity: {
    role: "MARS EXPLORATION ROVER",
    link: "OPPORTUNITY (MER-B)",
    portrait: "/assets/nasa-photos/opportunity/opportunity-rover.webp",
    portraitTag: "IDENTICAL TEST TWIN · NASA/JPL",
  },
};

// 3D models. Spirit & Opportunity: NASA's official MER model (`npm run rover-models`; the twins
// were identical). Sojourner: NASA publishes none, so a replica on Sketchfab, shown through
// Sketchfab's own embed (its author allows embedding, not downloading).
interface HubModel {
  src?: string;
  sketchfab?: string;
  credit: string;
  note: string;
  tag: string;
  badge: string;
}
const MODELS: Partial<Record<RoverId, HubModel>> = {
  sojourner: {
    sketchfab: "7f135874ddd34f8f98904b53a2c178e1",
    credit: "3D model: “Sojourner Mars Rover” by Jan Walter Sluka · Sketchfab",
    note: "A detailed replica of Sojourner. NASA has no official 3D model of it. Drag to rotate, scroll to zoom.",
    tag: "SKETCHFAB REPLICA",
    badge: "3D REPLICA",
  },
  spirit: {
    src: "/assets/models/mer.glb",
    tag: "NASA/JPL-CALTECH",
    badge: "REAL NASA 3D MODEL",
    credit: "3D model: NASA/JPL-Caltech",
    note: "Spirit and its twin Opportunity were built to the same design. This is NASA's model of the Mars Exploration Rover.",
  },
  opportunity: {
    src: "/assets/models/mer.glb",
    tag: "NASA/JPL-CALTECH",
    badge: "REAL NASA 3D MODEL",
    credit: "3D model: NASA/JPL-Caltech",
    note: "Opportunity and its twin Spirit were built to the same design. This is NASA's model of the Mars Exploration Rover.",
  },
};

// Voyage is fictional and has no photo gallery: its hub view is its systems status.
const VOYAGE: HubSubject = {
  name: "Voyage",
  role: "YOUR ROVER",
  years: "PRESENT DAY",
  link: "VOYAGE (YOU)",
  portrait: "/assets/rovers/player/player_SE.png",
  portraitTag: "AI ART",
  pixel: true,
  imageLabel: "AI-GENERATED ART",
  gallery: [],
};

function subjectFor(id: HubId): HubSubject {
  if (id === "voyage") return VOYAGE;
  const r = getRover(id);
  return {
    name: r.name,
    role: ROLE[id].role,
    years: r.epitaph.dates.replace("–", " – "),
    link: ROLE[id].link,
    portrait: ROLE[id].portrait,
    portraitTag: ROLE[id].portraitTag,
    gallery: r.gallery,
    galleryTag: "NASA ARCHIVE",
    galleryIntro: `Real NASA images from ${r.name}'s mission on Mars.`,
    imageLabel: "NASA MISSION IMAGE",
  };
}

// ---------------------------------------------------------------------------------------------

export function RoverHub() {
  const hubView = useRun((s) => s.hubView);
  const selected = useRun((s) => s.selectedArchive);
  const section = useRun((s) => s.archiveSection);
  const current: HubId = hubView === "rover_archives" && selected ? selected : "voyage";
  const subject = subjectFor(current);

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [photo, setPhoto] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Keyboard focus into the hub on open; back to the page on close.
  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
    return () => (document.activeElement as HTMLElement | null)?.blur();
  }, []);

  // A different rover starts on its first photo.
  const [shownFor, setShownFor] = useState(current);
  if (shownFor !== current) {
    setShownFor(current);
    setPhoto(0);
  }

  const model = current === "voyage" ? undefined : MODELS[current];
  const middle: Middle =
    current !== "voyage" && section === "story" ? "story" : model && section === "model" ? "model" : "gallery";
  const openChat = useCallback(() => {
    actions.setArchiveSection("chat");
    setRightOpen(true);
    window.setTimeout(() => chatInputRef.current?.focus({ preventScroll: true }), 350);
  }, []);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Rover Hub"
      className="pointer-events-auto absolute inset-0 animate-[hub-fade_0.35s_ease-out_both] overflow-hidden font-sans text-ui-text"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ART}/background.webp`} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {/* The hub's background and card frames are AI art; photos and models inside keep their NASA labels. */}
      <AiTag label="AI-generated interface art" className="bottom-0 right-10 z-30" />

      <TopBar subject={subject} current={current} />

      <div className="absolute inset-x-3 bottom-2 top-[76px] flex gap-3">
        {/* LEFT — portrait + sections */}
        <div
          className="h-full shrink-0 animate-[hub-from-left_0.55s_cubic-bezier(.2,.8,.2,1)_0.12s_both] transition-[width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ width: leftOpen ? 292 : 60 }}
        >
          <Frame src="card_left" open={leftOpen}>
            {leftOpen ? (
              <LeftPanel
                subject={subject}
                current={current}
                middle={middle}
                section={section}
                hasModel={!!model}
                onCollapse={() => setLeftOpen(false)}
                onChat={openChat}
              />
            ) : (
              <CollapsedTab label="ROVER MENU" side="left" onOpen={() => setLeftOpen(true)} />
            )}
          </Frame>
        </div>

        {/* MIDDLE — gallery / story */}
        <div className="h-full min-w-0 flex-1 animate-[hub-rise_0.6s_cubic-bezier(.2,.8,.2,1)_0.22s_both]">
          <Frame src="card_middle" open>
            {current === "voyage" ? (
              <StatusPanel />
            ) : middle === "story" ? (
              <StoryPanel key={current} rover={getRover(current)} />
            ) : middle === "model" && model ? (
              <ModelPanel name={getRover(current).name} model={model} />
            ) : (
              <GalleryPanel subject={subject} index={photo} setIndex={setPhoto} onFullscreen={() => setFullscreen(true)} />
            )}
          </Frame>
        </div>

        {/* RIGHT — AI chat (rover archives only; Voyage's status fills the middle) */}
        {current !== "voyage" && (
        <div
          className="h-full shrink-0 animate-[hub-from-right_0.55s_cubic-bezier(.2,.8,.2,1)_0.32s_both] transition-[width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ width: rightOpen ? 360 : 60 }}
        >
          <Frame src="card_right" open={rightOpen}>
            {rightOpen ? (
              <ChatPanel rover={getRover(current)} inputRef={chatInputRef} onCollapse={() => setRightOpen(false)} />
            ) : (
              <CollapsedTab label="AI CHAT" side="right" onOpen={() => setRightOpen(true)} />
            )}
          </Frame>
        </div>
        )}
      </div>

      {fullscreen && (
        <FullscreenViewer subject={subject} index={photo} setIndex={setPhoto} onClose={() => setFullscreen(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Frames: the team's card art as 9-slice borders, so corners stay crisp at any size.

const SLICE: Record<string, number> = { card_left: 60, card_middle: 60, card_right: 60, top_bar: 28 };

function Frame({ src, open, children, style }: { src: string; open: boolean; children: ReactNode; style?: CSSProperties }) {
  const bw = src === "top_bar" ? 22 : open ? 44 : 26;
  return (
    <div className="relative h-full w-full" style={style}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ borderStyle: "solid", borderWidth: bw, borderImage: `url(${ART}/${src}.webp) ${SLICE[src]} fill / ${bw}px stretch` }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

function CollapsedTab({ label, side, onOpen }: { label: string; side: "left" | "right"; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Expand ${label.toLowerCase()}`}
      className="group flex h-full w-full flex-col items-center gap-4 pt-6 text-ui-cyan outline-none focus-visible:[filter:drop-shadow(0_0_6px_#68d7e9)]"
    >
      <span className="rounded border border-ui-cyan/60 p-1 transition group-hover:bg-ui-cyan/20">
        <IconChevron size={18} dir={side === "left" ? "right" : "left"} />
      </span>
      <span className="font-mono text-[13px] tracking-[0.35em] text-ui-cyan/80 [writing-mode:vertical-rl]">{label}</span>
    </button>
  );
}

function CollapseButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Collapse panel"
      className="rounded border border-ui-cyan/50 p-1 text-ui-cyan/80 transition hover:bg-ui-cyan/15 hover:text-ui-cyan focus-visible:outline-2 focus-visible:outline-ui-cyan"
    >
      <IconChevron size={14} dir={side} />
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// Top bar: burger rover menu · logo · link · mission data · continue · close

function TopBar({ subject, current }: { subject: HubSubject; current: HubId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const discovered = useRun((s) => s.discoveredRovers);
  const canContinue = useRun((s) => actions.canContinue(s));
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    // Esc closes just the menu, not the whole hub.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [menuOpen]);

  const pick = (id: HubId) => {
    setMenuOpen(false);
    if (id === "voyage") actions.showMyRover();
    else actions.selectArchive(id);
  };

  return (
    <div className="absolute inset-x-3 top-[6px] z-20 h-[62px] animate-[hub-drop_0.5s_cubic-bezier(.2,.8,.2,1)_0.04s_both]">
      <Frame src="top_bar" open>
        <div className="flex h-full items-center gap-4 px-5">
          {/* burger + rover menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label="Choose a rover"
              className={`flex h-10 w-10 items-center justify-center rounded border text-ui-cyan transition focus-visible:outline-2 focus-visible:outline-ui-cyan ${
                menuOpen ? "border-ui-cyan bg-ui-cyan/20" : "border-ui-cyan/50 hover:bg-ui-cyan/10"
              }`}
            >
              <IconBurger size={22} />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-[52px] w-[300px] animate-[hub-drop_0.25s_ease-out_both] rounded-md border border-ui-cyan/60 bg-[#06111f]/[0.97] p-2 shadow-[0_10px_40px_rgba(0,0,0,0.6),0_0_18px_rgba(104,215,233,0.25)]">
                <MenuItem active={current === "voyage"} title="VOYAGE" subtitle="Your rover · systems status" icon={<IconRover size={22} />} onClick={() => pick("voyage")} />
                <div className="mx-2 my-2 border-t border-ui-cyan/25" />
                <div className="px-3 pb-1 font-mono text-[11px] tracking-[0.3em] text-ui-muted">ROVER ARCHIVES</div>
                {marsRovers.map((r) => {
                  const unlocked = discovered.includes(r.id);
                  return (
                    <MenuItem
                      key={r.id}
                      active={current === r.id}
                      disabled={!unlocked}
                      title={r.name.toUpperCase()}
                      subtitle={unlocked ? `${r.mission} · ${r.epitaph.dates}` : "Not yet discovered"}
                      icon={unlocked ? <IconRover size={22} /> : <IconLock size={20} />}
                      onClick={() => pick(r.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* logo */}
          <div className="flex items-center gap-3 border-r border-ui-cyan/25 pr-5">
            <IconRover size={34} className="text-ui-cyan" />
            <div className="leading-none">
              <div className="font-display text-[22px] font-bold tracking-[0.12em] text-[#e9f6fb]">
                VOYAGE <span className="text-[13px] font-normal text-ui-muted">v1.0</span>
              </div>
              <div className="mt-1 font-mono text-[12px] tracking-[0.3em] text-ui-cyan/80">ROVER HUB</div>
            </div>
          </div>

          {/* link */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <IconSignal size={22} className="shrink-0 text-ui-cyan" />
            <span className="font-mono text-[16px] tracking-[0.2em] text-ui-cyan/70">LINK:</span>
            <span className="truncate font-display text-[19px] font-bold tracking-[0.14em] text-[#e9f6fb]">{subject.link}</span>
          </div>

          {/* mission data */}
          <div className="hidden shrink-0 font-mono text-[14px] tracking-[0.2em] text-ui-text/85 xl:block">
            MISSION DATA <span className="text-ui-cyan/60">{"//"}</span> MARS <span className="text-ui-cyan/60">{"//"}</span> {subject.years}
          </div>

          {canContinue && (
            <button
              type="button"
              onClick={actions.continueEncounter}
              className="shrink-0 animate-[hub-ping_1.6s_ease-out_infinite] rounded border border-ui-amber bg-ui-amber/20 px-4 py-2 font-mono text-[14px] tracking-widest text-ui-amber hover:bg-ui-amber/30 focus-visible:outline-2 focus-visible:outline-ui-amber"
            >
              ▶ CONTINUE
            </button>
          )}

          <button
            type="button"
            onClick={actions.closeHub}
            aria-label="Close the Rover Hub (T or Esc)"
            title="Close (T / Esc)"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-ui-cyan/60 text-[#e9f6fb] transition hover:border-ui-cyan hover:bg-ui-cyan/15 focus-visible:outline-2 focus-visible:outline-ui-cyan"
          >
            <IconClose size={20} />
          </button>
        </div>
      </Frame>
    </div>
  );
}

function MenuItem(props: { active: boolean; disabled?: boolean; title: string; subtitle: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      aria-current={props.active ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-ui-cyan ${
        props.active
          ? "bg-ui-cyan text-[#06101d]"
          : props.disabled
            ? "cursor-not-allowed text-ui-muted/60"
            : "text-ui-text hover:bg-ui-cyan/15"
      }`}
    >
      <span className={props.active ? "text-[#06101d]" : props.disabled ? "" : "text-ui-cyan"}>{props.icon}</span>
      <span>
        <span className="block font-display text-[15px] font-bold tracking-[0.15em]">{props.title}</span>
        <span className={`block text-[12px] ${props.active ? "text-[#06101d]/75" : "text-ui-muted"}`}>{props.subtitle}</span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// Left card

function LeftPanel(props: {
  subject: HubSubject;
  current: HubId;
  middle: Middle;
  hasModel: boolean;
  section: RunState["archiveSection"];
  onCollapse: () => void;
  onChat: () => void;
}) {
  const { subject, current } = props;
  const isVoyage = current === "voyage";
  type Item = { id: string; label: string; icon: ReactNode; locked?: boolean; active?: boolean; onClick?: () => void };
  const voyageItems: Item[] = [{ id: "status", label: "SYSTEMS STATUS", icon: <IconGauge size={26} />, active: true }];
  const archiveItems: Item[] = [
    {
      id: "gallery",
      label: "PHOTO GALLERY",
      icon: <IconGallery size={26} />,
      active: props.middle === "gallery" && props.section !== "chat",
      onClick: () => actions.setArchiveSection("gallery"),
    },
    { id: "chat", label: "AI CHAT", icon: <IconChat size={26} />, active: props.section === "chat", onClick: props.onChat },
  ];
  const items: Item[] = [
    ...(isVoyage ? voyageItems : archiveItems),
    isVoyage
      ? { id: "story", label: "FULL STORY", icon: <IconBook size={26} />, locked: true }
      : { id: "story", label: "FULL STORY", icon: <IconBook size={26} />, active: props.middle === "story", onClick: () => actions.setArchiveSection("story") },
    props.hasModel
      ? { id: "model", label: "3D MODEL", icon: <IconCube size={26} />, active: props.middle === "model", onClick: () => actions.setArchiveSection("model") }
      : { id: "model", label: "3D MODEL", icon: <IconCube size={26} />, locked: true },
  ];

  return (
    <div className="flex h-full flex-col px-[22px] pb-6 pt-4">
      <div className="mb-2 flex justify-end">
        <CollapseButton side="left" onClick={props.onCollapse} />
      </div>
      {/* portrait */}
      <div className="relative h-[124px] shrink-0 overflow-hidden rounded border border-ui-cyan/40 bg-[radial-gradient(ellipse_at_50%_80%,#8a3c22,#2a120c_70%)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={subject.portrait}
          src={subject.portrait}
          alt={`${subject.name}`}
          className={`h-full w-full animate-[hub-fade_0.5s_ease-out_both] ${subject.pixel ? "object-contain p-2 [image-rendering:pixelated]" : "object-cover"}`}
        />
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-ui-amber">
          {subject.portraitTag}
        </span>
      </div>
      {/* name block with corner brackets */}
      <div className="relative my-2 shrink-0 px-3 py-1.5 text-center">
        {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c) => (
          <span key={c} className={`absolute h-3 w-3 border-ui-cyan/70 ${c}`} />
        ))}
        <div className="font-display text-[22px] font-bold tracking-[0.06em] text-[#f2f8fb]">{subject.name}</div>
        <div className="mt-1 whitespace-nowrap font-mono text-[11.5px] tracking-[0.14em] text-ui-cyan/85">{subject.role}</div>
        <div className="font-mono text-[12px] tracking-[0.2em] text-ui-text/75">{subject.years}</div>
      </div>
      {/* the sections */}
      <nav aria-label="Rover sections" className="flex min-h-0 flex-1 flex-col justify-between gap-2">
        {items.map((it) => (
          <SectionButton key={it.id} {...it} />
        ))}
      </nav>
    </div>
  );
}

function SectionButton(props: { label: string; icon: ReactNode; locked?: boolean; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={props.locked}
      onClick={props.onClick}
      aria-current={props.active ? "page" : undefined}
      data-autofocus={props.active ? "" : undefined}
      className={`group relative flex min-h-[44px] flex-1 items-center rounded-md border text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-cyan ${
        props.active
          ? "border-[#9cf1ff] bg-[#5fd8ec] text-[#04121f] shadow-[0_0_18px_rgba(95,216,236,0.55)]"
          : props.locked
            ? "cursor-not-allowed border-ui-cyan/20 bg-[#0a1a2c]/70 text-ui-muted"
            : "border-ui-cyan/40 bg-[#0a1a2c]/80 text-[#e9f6fb] hover:border-ui-cyan hover:bg-ui-cyan/10"
      }`}
    >
      <span className={`flex w-[46px] shrink-0 justify-center border-r ${props.active ? "border-[#04121f]/30" : "border-ui-cyan/25"} ${props.locked ? "opacity-60" : props.active ? "" : "text-ui-cyan"}`}>
        {props.icon}
      </span>
      <span className="min-w-0 flex-1 px-2.5">
        <span className="block whitespace-nowrap font-display text-[13px] font-bold tracking-[0.08em]">{props.label}</span>
        {props.locked && <span className="block font-mono text-[10.5px] tracking-[0.2em] text-ui-muted/80">COMING SOON</span>}
      </span>
      {props.locked && <IconLock size={18} className="mr-3 shrink-0 text-ui-muted/70" />}
      {props.active && <IconTriangle size={16} dir="right" className="absolute -right-[13px] text-[#5fd8ec] drop-shadow-[0_0_6px_rgba(95,216,236,0.8)]" />}
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// Middle card: photo gallery

function PanelHeader({ icon, title, tag }: { icon: ReactNode; title: string; tag?: string }) {
  return (
    <div className="flex shrink-0 items-center gap-4 border-b border-ui-cyan/25 pb-3">
      <span className="text-ui-cyan drop-shadow-[0_0_6px_rgba(104,215,233,0.6)]">{icon}</span>
      <h3 className="whitespace-nowrap font-display text-[23px] font-bold tracking-[0.12em] text-[#e9f6fb]">{title}</h3>
      {tag && <span className="ml-auto min-w-0 truncate font-mono text-[12.5px] tracking-[0.16em] text-ui-amber">{"/// "}{tag}</span>}
    </div>
  );
}

function GalleryPanel({ subject, index, setIndex, onFullscreen }: { subject: HubSubject; index: number; setIndex: (i: number) => void; onFullscreen: () => void }) {
  const list = subject.gallery;
  const img = list[Math.min(index, list.length - 1)];
  const go = (d: number) => setIndex((index + d + list.length) % list.length);
  const thumbsRef = useRef<HTMLDivElement>(null);

  // ← / → flip photos here too (the full-screen viewer handles its own keys while open).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      e.preventDefault();
      setIndex((index + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, list.length, setIndex]);
  useEffect(() => {
    thumbsRef.current?.querySelector<HTMLElement>("[aria-current]")?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [index]);

  return (
    <div className="flex h-full flex-col px-[30px] pb-6 pt-7">
      <PanelHeader icon={<IconGallery size={34} />} title="PHOTO GALLERY" tag={subject.galleryTag} />
      <p className="mt-2 shrink-0 text-[15px] text-ui-text/85">{subject.galleryIntro}</p>

      <div className="mt-3 flex min-h-0 flex-1 items-stretch gap-3">
        <ArrowButton dir="left" onClick={() => go(-1)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border-2 border-ui-cyan/45 bg-black/60 shadow-[0_0_20px_rgba(104,215,233,0.15)]">
          <div className="relative min-h-0 flex-1 bg-[#120806]">
            {/* the photo FILLS its window (cropped to fit); fullscreen shows it whole */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={img.src}
              src={img.src}
              alt={img.title}
              className={`absolute inset-0 h-full w-full animate-[hub-fade_0.35s_ease-out_both] ${img.pixel ? "object-contain p-4 [image-rendering:pixelated]" : "object-cover"}`}
            />
            <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 font-mono text-[10px] tracking-widest text-ui-amber">{subject.imageLabel}</span>
            <button
              type="button"
              onClick={onFullscreen}
              aria-label="View full screen"
              title="Full screen"
              className="absolute right-2 top-2 rounded border border-ui-cyan/60 bg-black/60 p-1.5 text-ui-cyan transition hover:bg-ui-cyan/20 focus-visible:outline-2 focus-visible:outline-ui-cyan"
            >
              <IconExpand size={18} />
            </button>
          </div>
          <div className="flex shrink-0 items-baseline justify-between gap-4 border-t border-ui-cyan/30 bg-[#06111f] px-3 py-2">
            <span className="truncate text-[14px] text-[#e9f6fb]">&ldquo;{img.title}&rdquo;</span>
            <span className="shrink-0 font-mono text-[12px] text-ui-text/70">{img.date}</span>
          </div>
        </div>
        <ArrowButton dir="right" onClick={() => go(1)} />
      </div>

      {/* previews of the next images */}
      <div ref={thumbsRef} className="mt-3 flex h-[88px] shrink-0 gap-3 overflow-x-auto px-[46px] [scrollbar-width:none] [&>*:first-child]:ml-auto [&>*:last-child]:mr-auto" aria-label="Photo previews">
        {list.map((g, i) => (
          <button
            key={g.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={g.title}
            aria-current={i === index ? "true" : undefined}
            className={`relative h-full w-[150px] shrink-0 overflow-hidden rounded-md border-2 transition focus-visible:outline-2 focus-visible:outline-ui-cyan ${
              i === index ? "border-[#7fe9f8] shadow-[0_0_14px_rgba(95,216,236,0.7)]" : "border-ui-cyan/30 opacity-75 hover:opacity-100"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.src} alt="" className={`h-full w-full bg-[#120806] ${g.pixel ? "object-contain [image-rendering:pixelated]" : "object-cover"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ArrowButton({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "Previous photo" : "Next photo"}
      className="my-auto flex h-[60px] w-[34px] shrink-0 items-center justify-center rounded-md border-2 border-ui-cyan/60 bg-[#0a1a2c] text-ui-cyan transition hover:bg-ui-cyan/20 hover:shadow-[0_0_12px_rgba(95,216,236,0.5)] focus-visible:outline-2 focus-visible:outline-ui-cyan"
    >
      <IconTriangle size={18} dir={dir} />
    </button>
  );
}

function FullscreenViewer({ subject, index, setIndex, onClose }: { subject: HubSubject; index: number; setIndex: (i: number) => void; onClose: () => void }) {
  const list = subject.gallery;
  const img = list[Math.min(index, list.length - 1)];
  const go = useCallback((d: number) => setIndex((index + d + list.length) % list.length), [index, list.length, setIndex]);

  // Esc closes the viewer only (not the whole hub); arrow keys flip photos.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [go, onClose]);

  return (
    <div className="absolute inset-0 z-50 flex animate-[hub-fade_0.25s_ease-out_both] flex-col bg-black/95" role="dialog" aria-label="Photo, full screen">
      <div className="relative min-h-0 flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={img.src}
          src={img.src}
          alt={img.title}
          className={`absolute inset-0 h-full w-full animate-[hub-fade_0.3s_ease-out_both] object-contain ${img.pixel ? "[image-rendering:pixelated]" : ""}`}
        />
        <span className="absolute left-4 top-4 rounded bg-black/70 px-2 py-1 font-mono text-[11px] tracking-widest text-ui-amber">{subject.imageLabel}</span>
        <button type="button" onClick={onClose} aria-label="Close full screen (Esc)" className="absolute right-4 top-4 rounded border border-ui-cyan/60 bg-black/60 p-2 text-[#e9f6fb] hover:bg-ui-cyan/20">
          <IconClose size={20} />
        </button>
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <ArrowButton dir="left" onClick={() => go(-1)} />
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <ArrowButton dir="right" onClick={() => go(1)} />
        </div>
      </div>
      <div className="shrink-0 border-t border-ui-cyan/30 bg-[#06111f] px-8 py-3">
        <div className="flex items-baseline justify-between gap-6">
          <span className="text-[17px] text-[#e9f6fb]">{img.title}</span>
          <span className="shrink-0 font-mono text-[13px] text-ui-text/70">
            {img.date} · {index + 1} / {list.length}
          </span>
        </div>
        <p className="mt-1 text-[14px] leading-relaxed text-ui-text/85">{img.caption}</p>
        <p className="mt-1 font-mono text-[11px] text-ui-muted">Credit: {img.credit}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Middle card: interactive 3D model

function ModelPanel({ name, model }: { name: string; model: HubModel }) {
  return (
    <div className="flex h-full flex-col px-[30px] pb-6 pt-7">
      <PanelHeader icon={<IconCube size={34} />} title="3D MODEL" tag={model.tag} />
      <p className="mt-2 shrink-0 text-[15px] text-ui-text/85">{model.note}</p>
      <div className="relative mt-3 min-h-0 flex-1 overflow-hidden rounded-md border-2 border-ui-cyan/45 bg-[radial-gradient(ellipse_at_50%_75%,#4a2417_0%,#170c0a_55%,#05080d_100%)] shadow-[0_0_20px_rgba(104,215,233,0.15)]">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(104,215,233,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(104,215,233,0.25)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
        {model.sketchfab ? (
          <SketchfabViewer modelId={model.sketchfab} title={`3D model of ${name}`} />
        ) : (
          model.src && <RoverModel3D src={model.src} label={name} />
        )}
        {!model.sketchfab && (
          <>
            <span className="pointer-events-none absolute left-3 top-3 rounded bg-black/70 px-2 py-1 font-mono text-[10px] tracking-widest text-ui-amber">{model.badge}</span>
            <span className="pointer-events-none absolute left-3 top-[38px] font-mono text-[10px] tracking-wider text-white/70">{model.credit}</span>
          </>
        )}
      </div>
      {model.sketchfab && <p className="mt-1.5 shrink-0 font-mono text-[11px] tracking-wide text-ui-muted">{model.credit}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Right card: AI chat (styled like the reference)

const SUGGESTIONS = ["What was your main mission?", "How did your mission end?"];

function ChatPanel({ rover, inputRef, onCollapse }: { rover: Rover; inputRef: React.RefObject<HTMLInputElement | null>; onCollapse: () => void }) {
  const thread = useThread(rover.id);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [thread.messages.length, thread.pending]);

  const ask = (q: string) => {
    if (!q.trim() || thread.pending) return;
    void sendChat(rover.id, q);
    setDraft("");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(draft);
  };

  return (
    <div className="flex h-full flex-col px-[26px] pb-6 pt-7">
      <div className="flex shrink-0 items-center gap-4 border-b border-ui-cyan/25 pb-3">
        <span className="text-ui-cyan drop-shadow-[0_0_6px_rgba(104,215,233,0.6)]">
          <IconChat size={32} />
        </span>
        <h3 className="font-display text-[24px] font-bold tracking-[0.14em] text-[#e9f6fb]">AI CHAT</h3>
        <span className="ml-auto mr-2 font-mono text-[14px] text-ui-cyan/70">{"///"}</span>
        <CollapseButton side="right" onClick={onCollapse} />
      </div>
      <p className="mt-2 shrink-0 text-[14.5px] leading-snug text-ui-text/85">
        Talk to {rover.name}! Ask about its mission, discoveries, and life on Mars.
      </p>

      <div ref={listRef} className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto hub-scroll border-t border-ui-cyan/20 pr-1 pt-3" aria-live="polite">
        {thread.messages.length === 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[11px] tracking-widest text-ui-muted">TRY ASKING</p>
            {SUGGESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className="block w-full rounded-full border border-ui-cyan/50 bg-[#0d2238] px-4 py-2 text-left text-[14px] text-[#e9f6fb] transition hover:border-ui-cyan hover:bg-ui-cyan/15"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {thread.messages.map((m) =>
          m.from === "player" ? (
            <div key={m.id} className="flex animate-[hub-from-right_0.3s_ease-out_both] items-center justify-end gap-2">
              <IconPerson size={26} className="shrink-0 text-ui-cyan" />
              <div className="max-w-[78%] rounded-full border border-ui-cyan/50 bg-[#0d2238] px-4 py-2 text-[14px] text-[#e9f6fb]">{m.text}</div>
            </div>
          ) : (
            <div key={m.id} className="flex animate-[hub-from-left_0.3s_ease-out_both] items-start gap-2">
              <IconRover size={28} className="mt-1 shrink-0 text-ui-cyan" />
              <div className="max-w-[84%] rounded-lg border border-ui-cyan/35 bg-[#081827] px-4 py-2.5 text-[14px] leading-relaxed text-[#e9f6fb]">
                {m.source === "fallback" && <div className="mb-0.5 font-mono text-[10px] tracking-widest text-ui-amber">OFFLINE LOG</div>}
                {m.text}
              </div>
            </div>
          ),
        )}
        {thread.pending && <p className="font-mono text-[12px] text-ui-muted">{rover.name} is answering…</p>}
      </div>

      <form onSubmit={submit} className="mt-3 flex shrink-0 gap-2">
        <label htmlFor="hub-chat-input" className="sr-only">
          Ask {rover.name} a question
        </label>
        <input
          ref={inputRef}
          id="hub-chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          autoComplete="off"
          placeholder="Ask me something…"
          className="min-w-0 flex-1 rounded-md border-2 border-ui-cyan/45 bg-[#06111f] px-4 py-2.5 font-mono text-[14px] text-[#e9f6fb] placeholder:text-ui-muted/70 focus:border-ui-cyan focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || thread.pending}
          aria-label="Send"
          className="flex w-[52px] shrink-0 items-center justify-center rounded-md bg-[#5fd8ec] text-[#04121f] shadow-[0_0_14px_rgba(95,216,236,0.5)] transition hover:brightness-110 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-cyan"
        >
          <IconSend size={22} />
        </button>
      </form>
      <p className="mt-1.5 shrink-0 font-mono text-[10px] tracking-wide text-ui-muted">✦ AI-generated answers, only from {rover.name}&apos;s verified mission records.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Middle card for Voyage: systems status (status only, no controls — design.md §7.3)

function StatusPanel({ onCollapse }: { onCollapse?: () => void }) {
  const battery = useRun((s) => Math.round(s.batteryChargePercent));
  const solar = useRun((s) => s.solarCondition);
  const panelDamaged = useRun((s) => s.panelDamaged);
  const traction = useRun((s) => s.tractionStatus);
  const comms = useRun((s) => s.communicationStatus);
  const tools = useRun((s) => s.unlockedTools);
  const toolEngaged = useRun((s) => s.toolEngaged);
  const summary = useRun(statusSummary);
  const low = useRun((s) => s.outOfPower || s.batteryChargePercent < TUNING.lowBatteryWarning);

  const row = (label: string, value: ReactNode, tone: "ok" | "warning" | "danger" = "ok") => (
    <div className="rounded-md border border-ui-cyan/30 bg-[#0a1a2c]/80 px-4 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[12px] tracking-widest text-ui-muted">{label}</span>
        <span className={`font-mono text-[15px] ${tone === "danger" ? "text-ui-danger" : tone === "warning" ? "text-ui-warning" : "text-[#e9f6fb]"}`}>{value}</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col px-[26px] pb-6 pt-7">
      <div className="flex shrink-0 items-center gap-4 border-b border-ui-cyan/25 pb-3">
        <span className="text-ui-cyan drop-shadow-[0_0_6px_rgba(104,215,233,0.6)]">
          <IconGauge size={32} />
        </span>
        <h3 className="font-display text-[22px] font-bold tracking-[0.14em] text-[#e9f6fb]">SYSTEMS</h3>
        <span className="ml-auto mr-2 font-mono text-[14px] text-ui-cyan/70">{"///"}</span>
        {onCollapse && <CollapseButton side="right" onClick={onCollapse} />}
      </div>
      <p className="mt-2 shrink-0 text-[14.5px] leading-snug text-ui-text/85">{summary}</p>
      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 hub-scroll">
        <div className="rounded-md border border-ui-cyan/30 bg-[#0a1a2c]/80 px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-mono text-[12px] tracking-widest text-ui-muted">BATTERY CHARGE</span>
            <span className={`font-mono text-[18px] ${low ? "text-ui-danger" : "text-[#e9f6fb]"}`}>{battery}%</span>
          </div>
          <BatteryBar percent={battery} wide alert={low} />
        </div>
        {row("SOLAR CONDITION", panelDamaged ? "Panels damaged" : SOLAR_LABEL[solar], panelDamaged ? "danger" : "ok")}
        {row("TRACTION", TRACTION_LABEL[traction], traction === "stuck" ? "danger" : traction === "reduced" ? "warning" : "ok")}
        {row("COMMUNICATIONS", COMMS_LABEL[comms])}
        <div className="rounded-md border border-ui-cyan/30 bg-[#0a1a2c]/80 px-4 py-2.5">
          <div className="font-mono text-[12px] tracking-widest text-ui-muted">INSTALLED TOOLS</div>
          {tools.length === 0 ? (
            <p className="mt-1 text-[14px] text-ui-text/80">None unlocked yet</p>
          ) : (
            <ul className="mt-1 space-y-1 text-[14px]">
              {tools.map((t) => (
                <li key={t}>
                  {TOOL_NAMES[t] ?? t}: <span className="text-ui-muted">{toolEngaged ? "engaged" : "standby"} (press E in the field)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function statusSummary(s: RunState): string {
  if (s.roverOffline) return "No power. The rover has shut down and can't move or contact Earth.";
  if (s.panelDamaged) return "The solar panels are damaged and can't charge. The battery is running down.";
  if (s.severeStorm && s.toolEngaged) return "Power preservation on. It slows the drain, but no sunlight is getting through.";
  if (s.severeStorm) return "A severe dust storm is blocking the sun and draining power. Engage power preservation (E).";
  if (s.outOfPower) return "Out of power. Stay still so the solar panels can recharge the battery.";
  if (s.tractionStatus === "stuck") return "Wheels are stuck in soft soil. Driving won't free the rover on its own.";
  if (s.batteryChargePercent < TUNING.lowBatteryWarning) return "Battery is low. Stop for a while to recharge from sunlight.";
  if (s.isCharging && s.solarCondition === "dust_storm") return "Charging very slowly. Dust is blocking most of the sunlight.";
  if (s.isCharging && s.solarCondition === "dusty") return "Charging, but dust in the air is slowing it down.";
  if (s.isCharging) return "Stationary and charging from the solar panels.";
  return "All systems normal. Ready to continue exploring.";
}
