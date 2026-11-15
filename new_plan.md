# Improvement Plan — *Voyage* (post–Phase 6 polish → submission)

**Project:** NASA Space Apps Challenge 2026 — team "AI'm not sure"
**Status:** Build complete through Phase 6 (the original Build Phases 0–7 are done; this plan supersedes it for the polish pass). · last updated 2026-11-15

> Drives the fixes in [improvements.md](./improvements.md). Vision beyond the demo lives in [roadmap.md](./roadmap.md).
> Related: [prd.md](./prd.md) · [appflow.md](./appflow.md) · [design.md](./design.md) · [techspec.md](./techspec.md) · [schema.md](./schema.md) · [tracker.md](./tracker.md) · [rules.md](./rules.md)

---

## Reality check (read first)

It's **Nov 15 — submission is ~today.** Do the phases in order and **stop climbing when you run out of time** — a polished core beats a half-built new system.
- **Must land before submission:** Phases A–D (bugs + the worst "AI-slop" polish).
- **Do when assets/decisions arrive:** Phases E–J.
- **Stretch only if core is solid + time remains:** Phase K (exploration slice).
- **Protect the submission window** (Phase SUB) no matter what — reserve the last ~1.5–2 hours.

**Legend:** 🟢 unblocked · 🟡 asset-gated (waiting on your resources) · 🔵 decision-gated. Gates = the check that must pass before moving on. Diagnose before fixing.

---

## Phase A — Critical bugs (do first) 🟢
The three things that look *broken*.
- **A4** — rocket stuck at the atmosphere boundary → make Earth recede so it reads as leaving.
- **D4** — objective text box hides the guidance arrow near the bottom → reposition/avoid overlap.
- **E3** — Spirit soft-soil: rover should be fully stuck but can still rotate → lock rotation too.

**Gate A:** none of the three reproduces; rocket clearly leaves Earth; arrow always visible; stuck means stuck.

## Phase B — Subtitle system 🟢
Reused on every screen, so do it once.
- **J1** — redesign the subtitle box (kill the plain "AI-slop" look): one reusable styled component.
- **J2** — typewriter effect, text reveals in sync with narration.

**Gate B:** one styled subtitle component with typewriter, wired into every screen's text.

## Phase C — Surface polish 🟢
- **D1** — Mars ground "carpet" → break the repeat, add variation.
- **D2** — rover shadow.
- **D3** — tire tracks.

**Gate C:** surface no longer reads as tiled carpet; rover has a grounded shadow + leaves tracks.

## Phase D — Launch screen polish 🟢
- **A1** — rocket shake/sway while ascending.
- **A2** — richer blue sky (gradient/clouds/haze, stars near top).
- **A3** — ground/grass detail.

**Gate D:** launch feels alive, not static or dull.

## Phase E — Space maneuvering 🟢 (+🟡 for extras)
- **B1** — make the rocket proportional; rebalance obstacle sizes.
- *(B2 Easter eggs = 🟡 needs your list; B3 voiceover = 🔵 see Phase I.)*

**Gate E:** rocket reads at a believable size against obstacles.

## Phase F — Landing & flashback sequence 🟡 (scaffold now, drop sprites in)
- **C2** — sync narration with the flashback visuals (no silent/disconnected stretch).
- **C4** — modern landing re-sequence: aeroshell+parachute → sky crane → slow rover drop.
- **C5** — flashback re-sequence: aeroshell+parachute+airbag → detach → bounce (normal/squished/enlarged sprites) → rest → Pathfinder opens (5 sprites) → Sojourner exits.
- **C1/C3** — better Mars landing visuals + aeroshell art (asset-gated).

**Gate F:** both sequences play in the correct order, placeholders swap cleanly for real sprites, and narration stays in sync across the longer flashback.

## Phase G — Hazard screens 🟡
- **E1** — dust storm that reads like a storm (not L→R particles).
- **E2** — Mars soft-soil texture (not Earth beach sand).

**Gate G:** storm looks like weather; soil looks like Mars.

## Phase H — Flow change: checkpoint before jump 🟢 (needs spec update first)
- **SPEC** — update [appflow.md](./appflow.md) §2.6–2.9 + [prd.md](./prd.md) §4.3: discovery no longer auto-jumps.
- **F1** — after discovery, drive to a checkpoint, then the player *chooses* to jump.
- **F2** — improve the time-jump screen visuals.

**Gate H:** discovery → drive → checkpoint → optional jump; no 5-second auto-cut; specs updated.

## Phase I — Voiceovers 🔵 (decision + script-gated)
- **J3** — discovery-remark voiceover (approved scripts, PRD §4.8; the "Mina" voice).
- **B3** — space-travel segment: write a new script → approve → voice it.

**Gate I:** voice plays with its subtitle; subtitles still carry the full info if audio is muted/fails.

## Phase J — Redesigns waiting on you 🟡
- **G1** — Rover Hub redesign (your design/prompt).
- **H1** — ending screen overhaul (your direction).

**Gate J:** each matches the design you provide; Hub keeps the My-Rover/Archives separation rule.

## Phase K — Stretch: exploration slice 🔵🟡 (only if core solid + time)
From [improvements.md](./improvements.md) §I (full vision = [roadmap.md](./roadmap.md)).
- Decide **coins vs Research Points** and **Archive placement** first.
- **I5** rock formations (🟢) → **I1** discovery points → **I2** Discovery Archive → **I3** Research Points → **I4** two side quests → **I6** environmental storytelling touches.

**Gate K:** at least one discovery point → scan → documented in the Archive, earning RP, without breaking the main loop or Hub rules. If it can't be clean, cut it.

## Phase SUB — Submission (protect this) 🟢
- Update the "how we used SI/AI tools" note (AI art, AI voices, AI-assisted code, Gemini chat).
- Re-record/update the ~30s video to show the polished build.
- Final deploy + test the live Vercel URL from a fresh browser.
- Submit on the team project page.

**Gate SUB:** submitted; live URL works from a fresh browser; video + write-up + SI/AI note included.

---

## What unblocks the 🟡 / 🔵 (from you)
Space-travel Easter-egg list (B2) · Mars landing + aeroshell + sky-crane art, airbag 3-sprite + Pathfinder 5-sprite sets (C1/C3/C4/C5) · storm + soft-soil resources (E1/E2) · Hub design (G1) · ending direction (H1) · side-quest assets (K) · voice confirmation (I) · coins-vs-RP + Archive-placement decisions (K).

## If you fall behind
Ship Phases **A–D + SUB** at minimum — that removes every "looks broken / AI-slop" issue and gets a clean build submitted. Everything else is upside.
