// Prerecorded narration clips that exist in /public/assets/audio/voice (one MP3 per approved line).
// Clip id = `${segment.id}-${lineNumber}` (e.g. "opening-1"). Lines without a clip fall back to
// reading-pace subtitles, so missing or failed audio never blocks a cinematic (rules §3).
// Voices: ElevenLabs — Mission Control: "Martin – Calm, Clear Narrator"; player rover: "Mina – Soothing Storyteller".
// All 17 approved lines are recorded and tagged (`npm run tag-voice`).
export const VOICE_CLIPS = new Set<string>([
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
