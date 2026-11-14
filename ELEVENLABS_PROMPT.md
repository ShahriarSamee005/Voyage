I need you to generate voiceover clips for my game using the ElevenLabs connector. Please follow these instructions exactly.

## Context
This is narration for "Voyage", an educational browser game for NASA Space Apps Challenge 2026. The text is an approved script. **Use every line exactly as written** — same words, punctuation, em dash and "..." pauses. Do not paraphrase, add or remove words, or add audio tags such as [whispering].

## Settings (same for every clip)
- Tool: ElevenLabs text-to-speech (`creative_generate_speech`)
- Model: `eleven_v4`
- Takes: `generations_count: 1` — one take per line
- Put all clips in ONE flow: create it with the first line, then pass that same `flow_id` to every later call.
- Before generating, run the first line once with `estimate_only: true`, tell me the total estimated credits for all 12 lines, then start.

## Voices
- **Mission Control** → "Martin - Calm, Clear Narrator", voice_id `akQnlreIUIoJxrTrosJj` (calm, steady, professional)
- **Player rover** → "Mina - Soothing Storyteller", voice_id `gZL79pBTvaNfNPOCXh6n` (gentle, slow, reflective)

Use these exact voice IDs. Do not pick a different voice, even one with a similar name.

## Lines to generate (12)

| id | voice | text |
|---|---|---|
| opening-2 | Martin | Your mission is to reach Mars and locate three explorers left behind: Sojourner, Spirit, and Opportunity. |
| opening-6 | Martin | You are cleared for launch. |
| landing-1 | Martin | Approaching Mars. |
| landing-2 | Martin | In 1997, Mars Pathfinder carried Sojourner—the first rover to explore this planet. |
| landing-4 | Martin | Years later, our own lander is approaching the same red world. |
| landing-5 | Martin | The technology has changed. But the reason we explore remains the same: to discover what lies beyond. |
| landing-6 | Martin | Prepare for touchdown. |
| ending-1 | Mina | That little light... Earth. |
| ending-2 | Mina | It's so small from here. |
| ending-3 | Mina | Hard to believe that's where my journey began. |
| ending-4 | Mina | I came all this way to remember the ones who were left behind. |
| ending-5 | Mina | Maybe... someday... someone will remember me, too. |

(Already done — do NOT regenerate: opening-1, opening-3, opening-4, opening-5, landing-3.)

## How to run
1. Generate the lines **one at a time**, in the table order. Don't fire several in parallel.
2. If ElevenLabs answers "Free generations are busy" (or any rate-limit error):
   - stop immediately and don't retry in the same reply;
   - tell me which ids are done and which are still pending;
   - I'll say "continue" later and you pick up from the first pending id.
3. Never regenerate a line that already succeeded — it costs credits again.

## What I need back
When every line is done (or when you have to stop), give me a table with, for each line:
- the **id** (this becomes the file name, e.g. `landing-1.mp3`)
- the voice used
- the duration in seconds
- the **direct download link to the MP3**

Also give me the flow URL so I can open the takes in ElevenLabs.
