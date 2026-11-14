# Voyage

A ~10-minute browser game about NASA's abandoned Mars rovers — **Sojourner, Spirit and Opportunity**.
NASA Space Apps Challenge 2026 · *Abandoned but not Forgotten* · team **AI'm not sure**.

**Play it:** https://voyage-cyan-three.vercel.app (desktop browser, keyboard)

Fly to Mars, find each rover where it was left behind, hear its story, survive the hazard that ended its mission, talk to it (AI chat limited to verified NASA facts), and beam its story home.

- Submission draft: [SUBMISSION.md](./SUBMISSION.md)
- Credits & AI-use notes: [CREDITS.md](./CREDITS.md)
- Demo-video plan: [VIDEO_SCRIPT.md](./VIDEO_SCRIPT.md)
- Narration recording list: [NARRATION.md](./NARRATION.md)
- Specs (PRD, tech spec, design, rules, tracker): team docs repo

## Play

Keyboard only, in a desktop browser.

| Key | Action |
|---|---|
| WASD / arrows | Drive (surface) · steer (rocket) |
| E | Scan a rover · use the unlocked tool |
| T | Open/close the Rover Hub |
| C | Quick charge (spend coins) |
| Esc / P | Pause |
| M | Sound on/off |

Cinematics can't be skipped, and subtitles are always on.

## Run locally

```bash
npm install
cp .env.example .env.local   # then set GEMINI_API_KEY=... (server-side only)
npm run dev                  # http://localhost:3000
```

The game is fully playable without a key; the chat then answers from each rover's offline Q&A.

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind 4
- **Phaser 3.90.0** (pinned — `npm i phaser` would install Phaser 4)
- Gemini through `/api/chat`, deployed on Vercel

## Code map

```
src/
  app/                  page, layout (+ AI metadata), /api/chat route
  content/              verified static content — rovers (facts, timeline, gallery, Q&A, epitaph), scripts (verbatim PRD §4.8)
  server/               Gemini provider + facts-only prompt (server-side only)
  chat/                 askRover(): live → offline fallback; per-rover threads
  game/
    scenes/             Boot (loader + stage director), Opening, Rocket, Landing, Surface, Ending
    state/              runStore: single run state + mission actions (no persistence)
    audio/              synthesized music/SFX engine, state-driven director, narration clips
    legs.ts, tuning.ts  per-leg layout/weather; all provisional balance numbers
  ui/                   React overlay: HUD, Rover Hub, dialogue, pause, title/destination/end screens
public/assets/          sprites, tiles, NASA photos, narration MP3s
scripts/tag-voice.mjs   writes AI acknowledgment into narration MP3 metadata
```

## Rules we hold to

- Every fact, date, photo caption and epitaph is checked against NASA/JPL sources. Dates are UTC.
- Narration is verbatim from PRD §4.8.
- AI pixel art is watermarked in-game. Real NASA photos are unaltered and credited. Generated art contains no NASA branding.
- `GEMINI_API_KEY` is never `NEXT_PUBLIC_` and is never committed.
