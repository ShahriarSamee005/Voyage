# Credits, sources & AI-use notes — Voyage

Keep this file current; it feeds the required "how we used SI/AI tools" note in the Space Apps submission (rules §12).

## Real NASA imagery (Photo Gallery + Data Beamed Home)

All shown unaltered (resized only) and labelled "NASA MISSION IMAGE". Full table with links: `content-prep/nasa-images.md` in the docs repo.

| Rover | Images |
|---|---|
| Sojourner | PIA00611, PIA00649, PIA00766 — NASA/JPL |
| Spirit | PIA07371 (NASA/JPL/Cornell), PIA04184 (NASA/JPL-Caltech/Cornell), PIA09491 (NASA/JPL/Cornell) |
| Opportunity | PIA07372 (NASA/JPL/Cornell), PIA05564 (NASA/JPL), PIA22909 (NASA/JPL-Caltech/Cornell/ASU) |

**Rover Hub portraits** (what each rover looked like; cropped and resized only):

| Rover | Image |
|---|---|
| Sojourner | PIA04422 "Rovers and Sojourner" — Sojourner's flight spare at JPL, 2003 (NASA/JPL) |
| Spirit | PIA04849 "Rover 2" — Spirit (MER-2) with its solar panels deployed at Kennedy Space Center, 2003 (NASA) |
| Opportunity | PIA15279 — a Mars Exploration Rover test rover, identical to Opportunity, in JPL's Mars Yard (NASA/JPL-Caltech) |

**Full Story launch photos** (resized only): PIA04754 (Mars Pathfinder, NASA), KSC-03PD-1893 (Spirit, NASA), KSC-03PP-2099 (Opportunity, NASA).

**3D model** (Rover Hub → 3D Model, Spirit and Opportunity): NASA's official Mars Exploration Rover model, "Spirit and Opportunity Rover, 3D Model" on science.nasa.gov (`24883_MER_static.glb`), credit NASA/JPL-Caltech. Geometry unchanged; textures resized and re-encoded (`npm run rover-models`, source kept in `assets-src/models/`). NASA publishes no official Sojourner model, so Sojourner's 3D view embeds "Sojourner Mars Rover" by Jan Walter Sluka (https://sketchfab.com/3d-models/sojourner-mars-rover-7f135874ddd34f8f98904b53a2c178e1) through Sketchfab's own embed player — the model is not downloadable (Sketchfab Standard license), so it is not copied into the game; the player shows the author's name and the game adds a credit line. It needs an internet connection.

Mission facts are checked against NASA/JPL pages (science.nasa.gov, jpl.nasa.gov, NSSDCA); dates are UTC.

## AI / generated content

| What | Tool | Notes |
|---|---|---|
| Narration voices (opening, landing, ending) | ElevenLabs text-to-speech (eleven_v4) | Voices "Martin – Calm, Clear Narrator" (Mission Control) and "Mina – Soothing Storyteller" (player rover). Free-plan content must credit **elevenlabs.io**; non-commercial use. Text is the team-approved script, verbatim. |
| Rover chat | Google Gemini (`gemini-3.5-flash-lite`) via `/api/chat` | Answers only from each rover's verified fact sheet; offline scripted fallback. |
| Pixel-art sprites & screen concepts | AI image generation (supplied by the team in `assets/`) | Processed into transparent frames; not used as factual sources. |
| Atlas V rocket (liftoff + rocket mini-game) and launch pad | AI image generation (supplied by the team) | The game uses exact 1/4-size copies in `public/assets/rocket/`; otherwise unedited. Emblems on the rocket are fictional, not NASA or ULA logos. |
| Asteroids in the rocket mini-game (small and medium) | AI image generation (supplied by the team) | The game uses resized copies in `public/assets/rocket/` with the empty border and a faint background haze removed; otherwise unedited. Illustrative, not real asteroids. |
| Rocket mini-game Easter eggs: spent Delta II stage, 2001 Mars Odyssey, Phobos | AI image generation (supplied by the team) | Trimmed WebP copies in `public/assets/rocket/eggs/`. Illustrative art; each one gets an on-screen label with a short fact, checked against NASA sources. |
| Landing cinematic art: aeroshell, parachute, sky crane, Pathfinder airbags and lander (petals opening) | AI image generation (supplied by the team) | Trimmed, resized WebP copies in `public/assets/landing/` (`npm run landing-art`); otherwise unedited. Illustrative — the real record is the labelled NASA photo PIA00611. |
| Rover Hub background, top bar and card frames | AI image generation (supplied by the team in `public/assets/HUD assets/`) | WebP copies in `public/assets/hub/`, used as 9-slice frames; icons drawn in code. |
| Cinematic scenery (Earth and its continents, launch-site sky, clouds, hills and grass, satellite) | Drawn procedurally in code | Simplified and illustrative. |
| Music & sound effects | Synthesized live in code (Web Audio API) | Original; no third-party audio files. |
| Code | AI-assisted development (Claude) | Reviewed and tested by the team. |

## Fonts

Geist and Geist Mono (SIL OFL), Orbitron (SIL OFL) — self-hosted via `next/font`.

## Space Apps 2026 AI rules — how we comply

- **AI content is marked on screen:** a small, low-contrast corner tag reads "AI-generated art" on every screen that shows AI art (title, destination terminal, launch, rocket mini-game, landing, surface, ending), "AI-generated interface art" on the Rover Hub frames, and "AI voice" in the corner of every narration box read by an ElevenLabs voice. Rover chat replies are marked "AI-generated answers". The AI content is also acknowledged in the title screen's Credits panel, in this file, in `SUBMISSION.md`, and in the page's `ai-generated-content` meta tag. Real NASA photos are labelled in-game ("NASA MISSION IMAGE" / "REAL NASA IMAGE"), so they are never confused with generated art.
- **AI audio and code are acknowledged in text and metadata:**
  - Text: this file, the title screen's Credits panel, and the end screen.
  - Metadata: the page's `ai-generated-content` meta tag, and ID3 tags on every narration MP3 (`npm run tag-voice`).
- **No NASA branding in generated content:** the player rover now uses the team's updated sprite sheet (Nov 14), which carries a lightning-bolt emblem instead of the NASA "meatball". Mission Control and the Voyage mission are fictional and imply no NASA endorsement.
