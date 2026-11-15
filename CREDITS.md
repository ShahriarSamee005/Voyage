# Credits, sources & AI-use notes — Voyage

Keep this file current; it feeds the required "how we used SI/AI tools" note in the Space Apps submission (rules §12).

## Real NASA imagery (Photo Gallery + Data Beamed Home)

All shown unaltered (resized only) and labelled "NASA MISSION IMAGE". Full table with links: `content-prep/nasa-images.md` in the docs repo.

| Rover | Images |
|---|---|
| Sojourner | PIA00611, PIA00649, PIA00766 — NASA/JPL |
| Spirit | PIA07371 (NASA/JPL/Cornell), PIA04184 (NASA/JPL-Caltech/Cornell), PIA09491 (NASA/JPL/Cornell) |
| Opportunity | PIA07372 (NASA/JPL/Cornell), PIA05564 (NASA/JPL), PIA22909 (NASA/JPL-Caltech/Cornell/ASU) |

Mission facts are checked against NASA/JPL pages (science.nasa.gov, jpl.nasa.gov, NSSDCA); dates are UTC.

## AI / generated content

| What | Tool | Notes |
|---|---|---|
| Narration voices (opening, landing, ending) | ElevenLabs text-to-speech (eleven_v4) | Voices "Martin – Calm, Clear Narrator" (Mission Control) and "Mina – Soothing Storyteller" (player rover). Free-plan content must credit **elevenlabs.io**; non-commercial use. Text is the team-approved script, verbatim. |
| Rover chat | Google Gemini (`gemini-3.5-flash-lite`) via `/api/chat` | Answers only from each rover's verified fact sheet; offline scripted fallback. |
| Pixel-art sprites & screen concepts | AI image generation (supplied by the team in `assets/`) | Processed into transparent frames; not used as factual sources. |
| Atlas V rocket (liftoff + rocket mini-game) and launch pad | AI image generation (supplied by the team) | The game uses exact 1/4-size copies in `public/assets/rocket/`; otherwise unedited. Emblems on the rocket are fictional, not NASA or ULA logos. |
| Asteroids in the rocket mini-game (small and medium) | AI image generation (supplied by the team) | The game uses resized copies in `public/assets/rocket/` with the empty border and a faint background haze removed; otherwise unedited. Illustrative, not real asteroids. |
| Landing cinematic art: aeroshell, parachute, sky crane, Pathfinder airbags and lander (petals opening) | AI image generation (supplied by the team) | Trimmed, resized WebP copies in `public/assets/landing/` (`npm run landing-art`); otherwise unedited. Illustrative — the real record is the labelled NASA photo PIA00611. |
| Cinematic scenery (Earth and its continents, launch-site sky, clouds, hills and grass, satellite) | Drawn procedurally in code | Simplified and illustrative. |
| Music & sound effects | Synthesized live in code (Web Audio API) | Original; no third-party audio files. |
| Code | AI-assisted development (Claude) | Reviewed and tested by the team. |

## Fonts

Geist and Geist Mono (SIL OFL), Orbitron (SIL OFL) — self-hosted via `next/font`.

## Space Apps 2026 AI rules — how we comply

- **AI images carry a visible watermark:** "PIXEL ART: AI-GENERATED" is shown on the rover terminal and throughout gameplay, wherever the AI sprites appear. The title screen is kept clean by team choice (Nov 15); its AI-art note is in the title's Credits panel. Real NASA photos are labelled separately ("NASA MISSION IMAGE" / "REAL NASA IMAGE").
- **AI audio and code are acknowledged in text and metadata:**
  - Text: this file, the title screen's Credits panel, and the end screen.
  - Metadata: the page's `ai-generated-content` meta tag, and ID3 tags on every narration MP3 (`npm run tag-voice`).
- **No NASA branding in generated content:** the player rover now uses the team's updated sprite sheet (Nov 14), which carries a lightning-bolt emblem instead of the NASA "meatball". Mission Control and the Voyage mission are fictional and imply no NASA endorsement.
