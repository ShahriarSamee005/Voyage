# Phase I voiceovers: recording sheet

Twelve new lines. The game is already wired for them: drop the MP3s in and they play, with the typed subtitles synced to each clip. Until then those lines show as silent typed text.

> All 12 lines are approved. The 3 space-travel lines were approved by the team on Nov 15; the 9 discovery lines are the PRD §4.8 monologues, verbatim.

---

## Prompt to paste into the Claude chat with the ElevenLabs connector

I need you to generate voiceover clips for my game using the ElevenLabs connector. Please follow these instructions exactly.

### Context
This is narration for "Voyage", an educational browser game for NASA Space Apps Challenge 2026. **Use every line exactly as written**: same words, punctuation and "..." pauses. Do not paraphrase, add or remove words, or add audio tags such as [whispering].

### Settings (same for every clip)
- Tool: ElevenLabs text-to-speech (`creative_generate_speech`)
- Model: `eleven_v4`
- Takes: `generations_count: 1`, one take per line
- Put all clips in ONE flow: create it with the first line, then pass that same `flow_id` to every later call.
- Before generating, run the first line once with `estimate_only: true`, tell me the total estimated credits for all 12 lines, then start.

### Voices (same as the rest of the game)
- **Mission Control** → "Martin - Calm, Clear Narrator", voice_id `akQnlreIUIoJxrTrosJj` (calm, steady, professional)
- **Player rover** → "Mina - Soothing Storyteller", voice_id `gZL79pBTvaNfNPOCXh6n` (gentle, slow, reflective)

Use these exact voice IDs.

### Lines to generate (12)

| id | voice | text |
|---|---|---|
| discovery-sojourner-1 | Mina | There you are, Sojourner. |
| discovery-sojourner-2 | Mina | The first rover to explore Mars. Small, but the beginning of something extraordinary. |
| discovery-sojourner-3 | Mina | Let's see what condition you're in... and what you left behind. |
| discovery-spirit-1 | Mina | Spirit... I found you. |
| discovery-spirit-2 | Mina | You crossed this world for years, until the ground wouldn't let you go. |
| discovery-spirit-3 | Mina | Let's examine your condition and find out what happened here. |
| discovery-opportunity-1 | Mina | Opportunity. At last. |
| discovery-opportunity-2 | Mina | You traveled so much farther than anyone expected. Then the dust hid the sunlight, and your signal faded. |
| discovery-opportunity-3 | Mina | Let's see what you discovered before the silence. |
| space-1 | Martin | Voyage, you've left Earth behind. Now line up your path to Mars. |
| space-2 | Martin | We aim for where Mars will be, not where it is now. Stay inside the corridor. |
| space-3 | Martin | Trajectory locked. Next stop: Mars. |

### How to run
1. Generate the lines **one at a time**, in table order. Don't run several in parallel.
2. If ElevenLabs answers "Free generations are busy" (or any rate-limit error), wait and retry that same line. Don't skip it.
3. When done, list each id with its download link.

---

## Installing the clips

1. Save each file as `<id>.mp3`, for example `discovery-spirit-2.mp3`, in `public/assets/audio/voice/`.
2. Run `npm run tag-voice`. It writes the AI-voice acknowledgment into each MP3's metadata, as the Space Apps rules require.
3. Add the ids to `VOICE_CLIPS` in `src/game/audio/voiceClips.ts`. Or ask Claude to install them; it will rename, tag, register and check the sync.

Where they play:
- **Discovery lines:** in the "Mission log" dialogue when you scan each rover (E). Each line types out in step with the voice, the next line waits for the voice to finish, and SHOW ALL ▸▸ stops it.
- **Space-travel lines:**
  - `space-1`: shortly after the trajectory mini-game starts.
  - `space-2`: at 45% trajectory lock.
  - `space-3`: when the lock completes.
  - The "Steer W/S…" hint steps aside while a line is on screen.
