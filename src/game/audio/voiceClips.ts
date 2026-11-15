// Prerecorded narration clips that exist in /public/assets/audio/voice (one MP3 per approved line).
// Clip id = `${segment.id}-${lineNumber}` (e.g. "opening-1"). Lines without a clip fall back to
// reading-pace subtitles, so missing or failed audio never blocks a cinematic (rules §3).
// Voices: ElevenLabs — Mission Control: "Martin – Calm, Clear Narrator"; player rover: "Mina – Soothing Storyteller".
// All 29 approved lines are recorded and tagged (`npm run tag-voice`): the 17 cinematic lines,
// plus Phase I (Nov 15) — 9 discovery remarks (Mina, `discovery-<rover>-N`, played by the
// Mission-log dialogue) and 3 space-travel lines (Martin, `space-N`, trajectory mini-game).
export const VOICE_CLIPS = new Set<string>([
  "space-1",
  "space-2",
  "space-3",
  "discovery-sojourner-1",
  "discovery-sojourner-2",
  "discovery-sojourner-3",
  "discovery-spirit-1",
  "discovery-spirit-2",
  "discovery-spirit-3",
  "discovery-opportunity-1",
  "discovery-opportunity-2",
  "discovery-opportunity-3",
  "opening-1",
  "opening-2",
  "opening-3",
  "opening-4",
  "opening-5",
  "opening-6",
  "landing-1",
  "landing-2",
  "landing-3",
  "landing-4",
  "landing-5",
  "landing-6",
  "ending-1",
  "ending-2",
  "ending-3",
  "ending-4",
  "ending-5",
]);

export const voiceClipId = (segmentId: string, lineIndex: number) => `${segmentId}-${lineIndex + 1}`;
