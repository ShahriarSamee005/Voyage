// Prerecorded narration clips that exist in /public/assets/audio/voice (one MP3 per approved line).
// Clip id = `${segment.id}-${lineNumber}` (e.g. "opening-1"). Lines without a clip fall back to
// reading-pace subtitles, so missing or failed audio never blocks a cinematic (rules §3).
// Voices: ElevenLabs — Mission Control: "Martin – Calm, Clear Narrator"; player rover: "Mina – Soothing Storyteller".
export const VOICE_CLIPS = new Set<string>([
  "opening-1",
  "opening-4",
  "opening-5",
  // remaining lines: generate, download to /public/assets/audio/voice/<id>.mp3, then list here
]);

export const voiceClipId = (segmentId: string, lineIndex: number) => `${segmentId}-${lineIndex + 1}`;
