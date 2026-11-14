// Tags every narration MP3 with its AI-generation acknowledgment (Space Apps 2026: AI audio needs
// acknowledgment in text AND metadata). Requires ffmpeg on PATH. Safe to re-run after adding clips:
//   node scripts/tag-voice.mjs
import { execFileSync } from "node:child_process";
import { readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "public", "assets", "audio", "voice");
const files = readdirSync(dir).filter((f) => f.endsWith(".mp3"));

for (const file of files) {
  const id = file.replace(/\.mp3$/, "");
  const voice = id.startsWith("ending") ? "Mina – Soothing Storyteller" : "Martin – Calm, Clear Narrator";
  const src = join(dir, file);
  const tmp = join(dir, `${id}.tagging.mp3`);
  execFileSync(
    "ffmpeg",
    [
      "-y", "-loglevel", "error", "-i", src, "-c", "copy", "-map_metadata", "-1",
      "-metadata", `title=Voyage narration ${id}`,
      "-metadata", `artist=AI-generated voice (ElevenLabs: ${voice}) — elevenlabs.io`,
      "-metadata", "comment=AI-generated speech via ElevenLabs (elevenlabs.io). Script text by team AI'm not sure, NASA Space Apps 2026.",
      "-metadata", "copyright=Generated with ElevenLabs; credit elevenlabs.io",
      tmp,
    ],
    { stdio: "inherit" },
  );
  rmSync(src);
  renameSync(tmp, src);
  console.log(`tagged ${file}`);
}
