"use client";

import { useEffect, useRef } from "react";
import { actions } from "@/game/state/runStore";
import type { Dialogue } from "@/game/state/types";

const SPEAKER: Record<Dialogue["speaker"], string> = {
  player_rover: "VOYAGE ROVER",
  mission_control: "MISSION CONTROL",
  system: "MISSION LOG",
};

/** Lower-third dialogue panel (design.md §8.2). Shown only when needed; owns input while open. */
export function DialoguePanel({ dialogue }: { dialogue: Dialogue }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => buttonRef.current?.focus({ preventScroll: true }), [dialogue]);

  return (
    <div className="pointer-events-auto absolute bottom-8 left-1/2 w-[860px] -translate-x-1/2 rounded-md border border-ui-border bg-ui-background/95 px-7 py-5 shadow-2xl">
      <div className="mb-2 flex items-baseline gap-3 font-mono text-[13px] tracking-widest">
        <span className="text-ui-amber">{SPEAKER[dialogue.speaker]}</span>
        <span className="text-ui-muted">{"// "}{dialogue.title.toUpperCase()}</span>
      </div>
      <div className="space-y-2 text-[18px] leading-relaxed">
        {dialogue.lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => actions.dismissDialogue()}
          className="rounded border border-ui-amber bg-ui-amber/15 px-5 py-2 font-mono text-[14px] tracking-widest text-ui-amber hover:bg-ui-amber/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-amber"
        >
          {dialogue.actionLabel.toUpperCase()} ▸
        </button>
      </div>
    </div>
  );
}
