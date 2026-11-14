# Space Apps 2026 submission — draft

**Challenge:** Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars
**Team:** AI'm not sure (Sylhet, Bangladesh)
**Project name:** Voyage

> Fill the ⟨…⟩ placeholders before submitting. Submission closes **Sun Nov 15, 11:59 PM local time** — click **Submit for Judging**.
> Links must be public with no login (guide: demo + final project hosted on YouTube / Drive / GitHub / Vercel etc.).

---

## High-level summary (short field)

Voyage is a 10-minute browser game that turns NASA's abandoned Mars rovers into a story you play. You pilot a new rover on a fictional mission to find Sojourner, Spirit and Opportunity where they were left behind. At each one you hear its story, survive the same hazard that ended its mission — low power, soft soil, a planet-wide dust storm — and talk to it through an AI chat that answers only from verified NASA facts. Real NASA photographs, a verified mission timeline and an emotional ending make the point of the challenge: the machines stopped, but their discoveries still matter.

## Links

- **Demo (≤ 30 s video):** ⟨YouTube / Drive link⟩
- **Final project (playable):** https://voyage-cyan-three.vercel.app (public — use this alias, not the `*-arifhaxns-projects.vercel.app` URLs, which require a Vercel login)
- **Source code:** https://github.com/ShahriarSamee005/Voyage (make sure the repo is **public** — judges can't sign in)

## Detailed description

### What it does
1. **Launch:** a Mission Control briefing over an Earth liftoff, then a short rocket mini-game (dodge debris, lock your trajectory to Mars).
2. **Arrival:** our fictional lander touches down. A clearly marked **1997 flashback** shows how Mars Pathfinder really landed — parachute, rockets, bouncing airbags — and ends on the real NASA photo of Sojourner on its lander.
3. **Three rover legs**, each a short drive to where a real rover rests:
   - **Sojourner (Ares Vallis)** teaches the power lesson: it went silent when its lander, its only link to Earth, most likely ran down its battery in the cold. Your rover runs on sunlight too.
   - **Spirit (Gusev Crater)**: you get stuck in the same soft, loose soil that trapped Spirit at "Troy" in 2009. Its story unlocks the traction mode you need to escape.
   - **Opportunity (Perseverance Valley)**: you arrive in a dust storm. After you find Opportunity, the storm hits you as it hit Opportunity in 2018. You survive by switching to power-preservation mode — something Opportunity never could.
4. **Rover Hub:** a terminal with each discovered rover's **verified timeline**, **real NASA photo gallery** (with credits), and an **AI chat** where the rover answers in the first person — only from its NASA fact sheet, saying "I don't remember" to anything else.
5. **Ending + "Data Beamed Home":** your own rover's power fades as it looks at Earth, a tiny dot in the Martian sky. Then a debrief shows one real NASA photo per rover, with dates and a short epitaph.

### How it addresses the challenge
- **Hardware + story + science:** each rover is introduced through what it was designed to do, what it discovered (Barnacle Bill's andesite, Spirit's silica and carbonates, Opportunity's hematite "blueberries"), and how and where its mission ended.
- **Learning by doing:** the gameplay mirrors real mission problems — solar power budgets, soft-soil mobility, dust-storm survival.
- **Accuracy as a rule:** every date, fact, caption and epitaph was checked against NASA/JPL pages. The fictional parts (our rover, lander and Mission Control) are clearly separated from the real history, and the 1997 flashback is dated and shown in sepia.
- **For ages 10–17:** about 10 minutes, keyboard only, subtitles always on, no hard fail states.

### How it works (tech)
- Next.js 16 + React 19 + Tailwind (screens, Hub UI) · Phaser 3.90 (game world, cinematics) · TypeScript.
- Static, verified content files (facts, timelines, photo metadata, fallback Q&A) — no database.
- `/api/chat` proxy calls Google Gemini (`gemini-3.5-flash-lite`) with a facts-only prompt. The API key stays server-side, and an offline scripted fallback keeps chat working without a network.
- Narration: prerecorded ElevenLabs voices, synced to subtitles. Music and sound effects are synthesized live with the Web Audio API.
- Deployed on Vercel.

### Intended impact
Most young space fans only hear about active missions. Voyage gives retired hardware a second life as a story, so players finish knowing who Sojourner, Spirit and Opportunity were, what they found, and why their data still matters.

## Tools used

Next.js, React, Tailwind CSS, Phaser 3, TypeScript, Vercel, Google Gemini API, ElevenLabs (narration), Web Audio API, ffmpeg, GitHub.

## Space agency data & resources used (citations)

**NASA mission pages (facts):**
- Mars Pathfinder: https://science.nasa.gov/mission/mars-pathfinder/
- Spirit: https://science.nasa.gov/mission/mer-spirit/
- Opportunity: https://science.nasa.gov/mission/mer-opportunity/
- JPL Sojourner: https://www.jpl.nasa.gov/missions/mars-pathfinder-sojourner-rover
- NSSDCA Pathfinder: https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=MESURPR
- JPL news releases used for specific facts:
  - goethite (Dec 2004)
  - silica (May 2007)
  - carbonates (2010)
  - end of the Spirit and Opportunity missions
  - Pathfinder's final transmission

**NASA images (Photojournal, unaltered, resized):**
- Sojourner: PIA00611, PIA00649, PIA00766
- Spirit: PIA07371, PIA04184, PIA09491
- Opportunity: PIA07372, PIA05564, PIA22909

Full table: `content-prep/nasa-images.md`.

## Use of AI (SI) tools — required note

- **AI-generated pixel art** (rover sprites, terrain, props), made by the team with an AI image tool. It is watermarked in-game ("PIXEL ART: AI-GENERATED"). We removed a NASA logo that the generator had put on our fictional rover. AI art is never used as a factual source.
- **Narration voices:** ElevenLabs text-to-speech, reading our approved script. Credited on screen and in the MP3 metadata (elevenlabs.io).
- **Rover chat:** Google Gemini, constrained to curated NASA facts, with an offline fallback.
- **Code:** AI-assisted development (Claude), reviewed and tested by the team.
- **Research help:** AI-assisted searching. Every fact was verified against NASA/JPL primary sources.
- ⟨TEAM TO CONFIRM: the core idea, story and narration scripts were created by the team — note any AI help with drafting⟩

## Team & roles
⟨names / roles — no personal photos, video or voice of under-18 members⟩
