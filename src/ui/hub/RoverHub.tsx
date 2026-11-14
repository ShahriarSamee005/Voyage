"use client";

import { useEffect, useRef } from "react";
import { marsRovers } from "@/content";
import { actions } from "@/game/state/runStore";
import { useRun } from "../useRun";
import { MyRoverView } from "./MyRoverView";
import { ArchiveView } from "./ArchiveView";

/**
 * The ONE player-owned terminal (PRD §4.6). Gameplay is paused while open.
 * My Rover and Rover Archives are mutually exclusive main views (rules §4).
 */
export function RoverHub() {
  const hubView = useRun((s) => s.hubView);
  const selected = useRun((s) => s.selectedArchive);
  const discovered = useRun((s) => s.discoveredRovers);
  const canContinue = useRun((s) => actions.canContinue(s));
  const rootRef = useRef<HTMLDivElement>(null);

  // Move keyboard focus into the terminal when it opens; return it to the page when it closes.
  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
    return () => (document.activeElement as HTMLElement | null)?.blur();
  }, []);

  const showingArchive = hubView === "rover_archives" && selected !== null;

  return (
    <div className="pointer-events-auto absolute inset-0 bg-black/45">
      <div
        ref={rootRef}
        role="dialog"
        aria-label="Rover Hub"
        className="absolute inset-x-10 inset-y-8 flex flex-col rounded-lg border-2 border-ui-border bg-ui-background/[0.97] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-ui-border/60 px-6 py-3">
          <h2 className="font-mono text-[20px] tracking-[0.25em]">
            VOYAGE <span className="text-ui-muted">/</span> <span className="text-ui-amber">ROVER HUB</span>
          </h2>
          <span className="rounded border border-ui-amber/60 px-3 py-1 font-mono text-[12px] tracking-widest text-ui-amber">
            ❚❚ EXPLORATION PAUSED
          </span>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav aria-label="Hub sections" className="flex w-[230px] shrink-0 flex-col gap-2 border-r border-ui-border/60 p-4">
            <NavButton
              active={hubView === "my_rover"}
              onClick={actions.showMyRover}
              title="MY ROVER"
              subtitle="Current status"
              autofocus={hubView === "my_rover"}
            />
            <div className="mt-3 px-1 font-mono text-[12px] tracking-widest text-ui-muted">ROVER ARCHIVES</div>
            {marsRovers.map((r) => {
              const unlocked = discovered.includes(r.id);
              return (
                <NavButton
                  key={r.id}
                  active={showingArchive && selected === r.id}
                  disabled={!unlocked}
                  onClick={() => actions.selectArchive(r.id)}
                  title={r.name.toUpperCase()}
                  subtitle={unlocked ? r.epitaph.dates : "🔒 Not yet discovered"}
                  autofocus={showingArchive && selected === r.id}
                />
              );
            })}
          </nav>

          <main className="min-w-0 flex-1 overflow-hidden">
            {showingArchive ? <ArchiveView roverId={selected} /> : <MyRoverView />}
          </main>
        </div>

        <footer className="flex items-center justify-between border-t border-ui-border/60 px-6 py-3">
          <button
            type="button"
            onClick={actions.closeHub}
            className="rounded border border-ui-cyan/70 px-5 py-2 font-mono text-[14px] tracking-widest text-ui-cyan hover:bg-ui-cyan/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-cyan"
          >
            ← RETURN <span className="ml-1 text-ui-muted">T / ESC</span>
          </button>
          {canContinue && (
            <button
              type="button"
              onClick={actions.continueEncounter}
              className="rounded border border-ui-amber bg-ui-amber/15 px-6 py-2 font-mono text-[14px] tracking-widest text-ui-amber hover:bg-ui-amber/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-amber"
            >
              ▶ CONTINUE
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function NavButton(props: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  autofocus?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      aria-current={props.active ? "page" : undefined}
      data-autofocus={props.autofocus ? "" : undefined}
      className={`rounded-md border px-4 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-cyan ${
        props.active
          ? "border-ui-cyan bg-ui-cyan/15 text-ui-cyan"
          : props.disabled
            ? "cursor-not-allowed border-ui-border/40 text-ui-muted/60"
            : "border-ui-border/70 text-ui-text hover:border-ui-cyan/70"
      }`}
    >
      <div className="font-mono text-[15px] tracking-widest">{props.title}</div>
      <div className="text-[13px] text-ui-muted">{props.subtitle}</div>
    </button>
  );
}
