import type * as Phaser from "phaser";
import type { ScriptSegment } from "@/content/types";
import { actions } from "./state/runStore";
import { audio } from "./audio/engine";
import { voiceClipId } from "./audio/voiceClips";

// Cinematic helpers. Narration lines come VERBATIM from content/scripts (PRD §4.8).
// Each line plays its prerecorded clip when one exists, with the subtitle held for the clip's
// length; if the clip is missing, muted or fails, the subtitle holds for a reading-pace duration
// instead — subtitles always carry the full text and audio never blocks the scene (rules §3).

export function lineSeconds(text: string, extra = 0): number {
  const words = text.trim().split(/\s+/).length;
  return Math.min(8, Math.max(2.6, 1.3 + words * 0.33)) + extra;
}

/** True once a scene has shut down or been destroyed (still-creating scenes are NOT gone). */
export function isGone(scene: Phaser.Scene): boolean {
  return scene.sys.settings.status >= 8; // Phaser.Scenes.SHUTDOWN = 8, DESTROYED = 9
}

export function wait(scene: Phaser.Scene, seconds: number): Promise<void> {
  return new Promise((resolve) => scene.time.delayedCall(seconds * 1000, () => resolve()));
}

/**
 * Start ONE narration line (voice + typed subtitle) and return how long to hold it, in seconds:
 * the clip's length plus a beat, or a reading-pace time when there's no audio. Callers run their
 * visuals over exactly that time, so pictures stay in step with the voice (fix C2).
 * Returns 0 if the scene is already gone.
 */
export async function speakLine(scene: Phaser.Scene, segment: ScriptSegment, index: number, extra = 0): Promise<number> {
  if (isGone(scene)) return 0; // scene was stopped (e.g. run abandoned) — stop narrating
  const text = segment.lines[index];
  // Start the voice first so the typewriter can match its length (fix J2): the text types
  // out over the spoken clip (ending just before the voice does), or at reading pace without it.
  const clip = await audio.playVoice(voiceClipId(segment.id, index));
  if (isGone(scene)) return 0;
  const hold = clip !== null ? clip + 0.45 + extra * 0.6 : lineSeconds(text, extra);
  const revealSeconds = clip !== null ? clip * 0.9 : Math.min(hold * 0.6, text.length / 32);
  actions.setSubtitle({ speaker: segment.speaker, text, revealSeconds });
  return hold;
}

/** Play every line of a segment as voice + subtitle; calls onLine(index) as each line starts. */
export async function playLines(
  scene: Phaser.Scene,
  segment: ScriptSegment,
  opts: { extraSeconds?: number; onLine?: (index: number) => void } = {},
): Promise<void> {
  const extra = opts.extraSeconds ?? 0;
  for (let i = 0; i < segment.lines.length; i++) {
    const hold = await speakLine(scene, segment, i, extra);
    if (isGone(scene)) return;
    opts.onLine?.(i);
    await wait(scene, hold);
  }
  actions.setSubtitle(null);
}

/** Planning estimate for a segment's length (visual pacing); real clip lengths may differ slightly. */
export function totalSeconds(segment: ScriptSegment, extra = 0): number {
  return segment.lines.reduce((sum, l) => sum + lineSeconds(l, extra), 0);
}
