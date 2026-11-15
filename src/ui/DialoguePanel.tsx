"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { actions } from "@/game/state/runStore";
import { audio } from "@/game/audio/engine";
import type { Dialogue } from "@/game/state/types";
import { NarrationBox, TypedText, accentFor } from "./NarrationBox";

/** Unvoiced dialogue types at a comfortable reading pace (characters per second). */
const CHARS_PER_SECOND = 48;

/**
 * Lower-third dialogue (design.md §8.2), in the shared comms panel. Lines type out one after
 * another; the first press of the button (or Enter) finishes the text, the next one continues.
 * Owns input while open. Remounted per dialogue (key) so each one starts fresh.
 */
export function DialoguePanel({ dialogue }: { dialogue: Dialogue }) {
  return <DialogueBody key={`${dialogue.title}|${dialogue.lines[0] ?? ""}`} dialogue={dialogue} />;
}

function DialogueBody({ dialogue }: { dialogue: Dialogue }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [line, setLine] = useState(0); // the line currently typing; === lines.length when all shown
  const [skipped, setSkipped] = useState(false);
  // Timing for the current line: how long it types, and the pause after it (voiced lines wait
  // for the voice to finish so clips never overlap). Null until the line's voice has started.
  const [timing, setTiming] = useState<{ line: number; type: number; after: number } | null>(null);
  useEffect(() => buttonRef.current?.focus({ preventScroll: true }), []);

  const total = dialogue.lines.length;
  const typing = !skipped && line < total;
  const accent = accentFor(dialogue.speaker);

  // Phase I: voiced dialogue — line N plays `${voice}-${N}` (if recorded) and types in step with it.
  useEffect(() => {
    if (skipped || line >= total) return;
    let cancelled = false;
    const text = dialogue.lines[line];
    const id = dialogue.voice ? `${dialogue.voice}-${line + 1}` : null;
    void (id ? audio.playVoice(id) : Promise.resolve(null)).then((clip) => {
      if (cancelled) return;
      setTiming({ line, type: clip ? clip * 0.9 : text.length / CHARS_PER_SECOND, after: clip ? clip * 0.1 + 0.35 : 0 });
    });
    return () => {
      cancelled = true;
    };
  }, [line, skipped, total, dialogue]);
  useEffect(() => () => audio.stopVoice(), []); // closing the dialogue silences it

  const next = useCallback(() => {
    const after = timing?.after ?? 0;
    window.setTimeout(() => setLine((l) => l + 1), after * 1000);
  }, [timing]);

  return (
    <div className="pointer-events-auto absolute bottom-6 left-1/2 w-[880px] -translate-x-1/2">
      <NarrationBox
        speaker={dialogue.speaker}
        tag={dialogue.title}
        live={typing}
        aiVoice={!!dialogue.voice}
        footer={
          <div className="mt-3 flex justify-end">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => {
                if (typing) {
                  audio.stopVoice();
                  setSkipped(true);
                } else actions.dismissDialogue();
              }}
              className="px-5 py-2 font-mono text-[14px] tracking-widest outline-none transition hover:brightness-125 focus-visible:[filter:drop-shadow(0_0_5px_currentColor)]"
              style={{
                color: accent,
                border: `1px solid ${accent}`,
                background: "rgba(255,255,255,0.04)",
                clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
              }}
            >
              {typing ? "SHOW ALL ▸▸" : `${dialogue.actionLabel.toUpperCase()} ▸`}
            </button>
          </div>
        }
      >
        <div className="space-y-2 text-[18px] leading-relaxed text-[#e9f1f7]">
          {dialogue.lines.map((text, i) => (
            <p key={i}>
              {i < line || skipped ? (
                text
              ) : i === line && timing?.line === line ? (
                <TypedText text={text} seconds={timing.type} accent={accent} onDone={next} />
              ) : (
                // not reached yet: laid out but invisible, so the panel never changes size
                <span className="invisible" aria-hidden>
                  {text}
                </span>
              )}
            </p>
          ))}
        </div>
      </NarrationBox>
    </div>
  );
}
