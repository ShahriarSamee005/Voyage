"use client";

import { useRun } from "./useRun";

const SPEAKER: Record<string, string> = {
  mission_control: "MISSION CONTROL",
  player_rover: "VOYAGE ROVER",
};

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
        <div className="absolute bottom-10 left-1/2 w-[900px] -translate-x-1/2 rounded-md bg-black/80 px-8 py-4 text-center" role="status" aria-live="polite">
          <div className="mb-1 font-mono text-[12px] tracking-[0.35em] text-ui-amber">{SPEAKER[subtitle.speaker]}</div>
          <p className="text-[22px] leading-snug text-ui-text">{subtitle.text}</p>
        </div>
      )}
    </>
  );
}
