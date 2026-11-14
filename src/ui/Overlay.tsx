"use client";

import { useEffect } from "react";
import { actions } from "@/game/state/runStore";
import { resetChats } from "@/chat/chatStore";
import { useRun } from "./useRun";
import { Hud } from "./hud/Hud";
import { RocketHud } from "./hud/RocketHud";
import { DialoguePanel } from "./DialoguePanel";
import { PauseMenu } from "./PauseMenu";
import { RoverHub } from "./hub/RoverHub";
import { TravelCard } from "./TravelCard";
import { CinematicLayer } from "./CinematicLayer";

/** Everything React draws over the game canvas, in 1280×720 logical pixels. */
export function Overlay() {
  const runId = useRun((s) => s.runId);
  const stage = useRun((s) => s.stage);
  const hubOpen = useRun((s) => s.hubOpen);
  const dialogue = useRun((s) => s.dialogue);
  const toast = useRun((s) => s.toast);
  const travel = useRun((s) => s.travel);

  // A new run discards chat threads too (no persistence).
  useEffect(() => resetChats(), [runId]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => actions.clearToast(), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div className="relative h-full w-full font-sans text-ui-text">
      {/* HUD only on the Mars surface, and hidden whenever the Hub is open (rules §4). */}
      {stage === "surface" && !hubOpen && <Hud />}
      {stage === "rocket" && <RocketHud />}
      <CinematicLayer />
      {toast && !hubOpen && (
        <div className="absolute left-1/2 top-28 -translate-x-1/2 rounded-full border border-ui-cyan/60 bg-ui-background/90 px-5 py-2 font-mono text-[15px] tracking-wide text-ui-cyan">
          {toast}
        </div>
      )}
      {dialogue && <DialoguePanel dialogue={dialogue} />}
      {hubOpen && <RoverHub />}
      {travel && <TravelCard travel={travel} />}
      <PauseMenu />
    </div>
  );
}
