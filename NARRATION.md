# Narration lines to record (ElevenLabs)

Text is **verbatim from PRD §4.8** — paste exactly, including punctuation (the em dash in landing-2 and the "..." in the ending).

**How to save:** one MP3 per line → `voyage/public/assets/audio/voice/<id>.mp3` (e.g. `landing-3.mp3`).
Then run `npm run tag-voice` (adds the required AI acknowledgment to each MP3's metadata) and tell Claude — it registers them in `src/game/audio/voiceClips.ts` and checks the sync.

Already recorded: `opening-1`, `opening-4`, `opening-5`.

## Mission Control — voice "Martin – Calm, Clear Narrator"

| id | Line |
|---|---|
| `opening-2` | Your mission is to reach Mars and locate three explorers left behind: Sojourner, Spirit, and Opportunity. |
| `opening-3` | Inspect each rover, record its condition, and search for surviving data or equipment worth recovering. |
| `opening-6` | You are cleared for launch. |
| `landing-1` | Approaching Mars. |
| `landing-2` | In 1997, Mars Pathfinder carried Sojourner—the first rover to explore this planet. |
| `landing-3` | A parachute and rockets slowed its descent. Giant airbags cushioned the landing as the spacecraft bounced across the Martian surface. |
| `landing-4` | Years later, our own lander is approaching the same red world. |
| `landing-5` | The technology has changed. But the reason we explore remains the same: to discover what lies beyond. |
| `landing-6` | Prepare for touchdown. |

## Player rover — voice "Mina – Soothing Storyteller"

| id | Line |
|---|---|
| `ending-1` | That little light... Earth. |
| `ending-2` | It's so small from here. |
| `ending-3` | Hard to believe that's where my journey began. |
| `ending-4` | I came all this way to remember the ones who were left behind. |
| `ending-5` | Maybe... someday... someone will remember me, too. |

Tip: use the same model for every line (we used **Eleven v4**) so the voices stay consistent; the ending is meant to sound slow, quiet and reflective.
