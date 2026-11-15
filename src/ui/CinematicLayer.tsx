"use client";

import { useCallback, useState } from "react";
import type { Subtitle } from "@/game/state/types";
import { useRun } from "./useRun";
import { NarrationBox, TypedText, accentFor } from "./NarrationBox";

/** One narration line: styled comms panel, text typed out in step with the voice clip. */
function SubtitleLine({ subtitle }: { subtitle: Subtitle }) {
  const [typing, setTyping] = useState(true);
  const done = useCallback(() => setTyping(false), []);
  return (
    <NarrationBox speaker={subtitle.speaker} live={typing}>
      <p className="min-h-[2.9em] text-[22px] leading-[1.45] text-[#e9f1f7]">
        <TypedText text={subtitle.text} seconds={subtitle.revealSeconds} accent={accentFor(subtitle.speaker)} onDone={done} />
      </p>
    </NarrationBox>
  );
}

/**
 * Cinematic presentation over the canvas:
 *  - fixed, always-visible subtitles while narration plays (no toggle, no skip — rules §3)
 *  - mission tags, shown progressively and independent of the subtitles (design.md §8.2)
 *  - a dated banner that marks the 1997 flashback as the past (PRD §4.4)
 */
export function CinematicLayer() {
  const subtitle = useRun((s) => s.subtitle);
  const tags = useRun((s) => s.missionTags);
  const banner = useRun((s) => s.banner);

  return (
    <>
      {tags.length > 0 && (
        <ul className="absolute left-10 top-10 space-y-2 font-mono text-[18px] tracking-[0.25em]" aria-label="Mission information">
          {tags.map((t) => (
            <li key={t} className="w-fit animate-[fadein_0.8s_ease-out] rounded bg-black/65 px-3 py-1 text-ui-cyan [text-shadow:0_0_12px_rgba(104,215,233,0.45)]">
              {t}
            </li>
          ))}
        </ul>
      )}

      {banner && (
        <div className="absolute left-1/2 top-8 -translate-x-1/2 animate-[fadein_0.6s_ease-out] rounded-md border border-ui-amber/70 bg-black/75 px-7 py-3 text-center">
          <div className="font-mono text-[12px] tracking-[0.4em] text-ui-amber">{banner.label}</div>
          <div className="mt-1 font-display text-[20px] tracking-wider text-ui-text">{banner.title}</div>
          {banner.caption && <div className="mt-1 font-mono text-[12px] text-ui-muted">{banner.caption}</div>}
        </div>
      )}

      {subtitle && (
        <div className="absolute bottom-8 left-1/2 w-[900px] -translate-x-1/2" role="status" aria-live="polite">
          <SubtitleLine key={subtitle.text} subtitle={subtitle} />
        </div>
      )}
    </>
  );
}
