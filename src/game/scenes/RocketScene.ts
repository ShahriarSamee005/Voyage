import * as Phaser from "phaser";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../constants";
import { exhaustConfig, makeCinematicTextures } from "../art";
import { actions, isWorldPaused, runStore } from "../state/runStore";
import { audio } from "../audio/engine";
import { scripts } from "@/content/scripts";
import { speakLine, wait } from "../cinematic";

// ~30 s on-rails travel (PRD §4.1 #2): dodge debris AND align the trajectory.
// No hard fail: hits wobble the rocket and cost some lock progress (soft retry, rules §5).

const ROCKET_X = 230;

// Atlas V (same texture as the liftoff, 221×443, nose up). Fix B1: the rocket is drawn a little
// larger in this mini-game (~135×19 px, was ~105×15) so it reads as a craft. Asteroids unchanged.
const ROCKET_SCALE = 0.32;
// Origin = centre of the solid art (alpha bounds x 81–139.75, y 10.5–431.75), so it turns about its middle.
const ROCKET_ORIGIN = { x: 110.375 / 221, y: 221.125 / 443 };
// Exhaust sits just behind the main engine: half the art length (421 px × 0.32 ≈ 67.4) plus a little.
const TAIL_OFFSET = 69;
// Hitbox: a capsule along the rocket body, a bit smaller than the art (≈110×14 px vs ≈135×19).
const HIT_RADIUS = 7;
const HIT_HALF_LENGTH = 48;

// Asteroids replace the old procedural "debris" (a 40×32 texture whose drawn rock was 32×24) and keep
// its sizes and hitbox exactly: at spawn scale s the rock is 32·s px wide and its hit circle has
// radius 20·s (the old displayWidth / 2). Rolls below 1.2 use the small sprite, the rest the medium.
const PLACEHOLDER_ROCK_WIDTH = 32;
const PLACEHOLDER_HIT_RADIUS = 20;
const ASTEROID_SPLIT = 1.2;

// B2 Easter eggs — team art (new_assets/rocket_minigame, trimmed WebP copies in rocket/eggs) and
// short descriptions. Kept to three that tie into the story (Nov 15). Facts are checked:
//  - Delta II launched Mars Pathfinder (Dec 1996) — and later Spirit and Opportunity (2003).
//  - 2001 Mars Odyssey relayed most of Spirit's and Opportunity's data to Earth.
//  - Phobos, the larger of Mars's two moons, orbits about 6,000 km above the surface.
interface EasterEgg {
  key: string;
  name: string; // shown in the callout box
  fact: string;
  at: { seconds?: number; lock?: number };
  width: number; // on-screen width (px)
  speed: number; // px/s, right → left
  spin: number; // rad/s
}
const EASTER_EGGS: EasterEgg[] = [
  {
    key: "delta2_stage",
    name: "Spent Delta II upper stage",
    fact: "A Delta II rocket launched Mars Pathfinder and Sojourner in 1996.",
    at: { seconds: 6 },
    width: 62,
    speed: 150,
    spin: 0.35,
  },
  {
    key: "mars_odyssey",
    name: "2001 Mars Odyssey",
    fact: "This orbiter relayed most of Spirit's and Opportunity's data back to Earth.",
    at: { lock: 34 },
    width: 66,
    speed: 150,
    spin: 0.15,
  },
  {
    key: "phobos",
    name: "Phobos",
    fact: "The larger of Mars's two moons orbits only about 6,000 km above the surface.",
    at: { lock: 66 },
    width: 56,
    speed: 160,
    spin: 0.1,
  },
];

// Eggs and their labels live in the free space beside the trajectory corridor, clear of the HUD
// (lock panel on top, hints / subtitles at the bottom), one egg on screen at a time.
const EGG_SAFE_TOP = 108;
const EGG_SAFE_BOTTOM = 598;
const EGG_GAP = 26; // breathing room between the corridor edge and an egg or label
const CORRIDOR_HALF = 70;
const SCROLL = 320;

interface Callout {
  target: Phaser.GameObjects.Image;
  box: Phaser.GameObjects.Container;
  line: Phaser.GameObjects.Graphics;
  w: number;
  h: number;
  t: number; // seconds since the callout started (negative = not shown yet)
  hold: number; // seconds the box stays fully visible
  side: "above" | "below"; // which side of the corridor the egg keeps to
}

const lerpPt = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export class RocketScene extends Phaser.Scene {
  private rocket!: Phaser.GameObjects.Image;
  private flame!: Phaser.GameObjects.Particles.ParticleEmitter;
  private corridor!: Phaser.GameObjects.Graphics;
  private debris!: Phaser.GameObjects.Group;
  private sats!: Phaser.GameObjects.Group;
  private starsFar: Phaser.GameObjects.Image[] = [];
  private starsNear: Phaser.GameObjects.Image[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private elapsed = 0;
  private lock = 0;
  private spawnTimer = 0;
  private invulnerable = 0;
  hits = 0;
  private done = false;
  private eggsSpawned = new Set<string>();

  constructor() {
    super("Rocket");
  }

  create() {
    makeCinematicTextures(this);
    this.elapsed = 0;
    this.lock = 0;
    this.spawnTimer = 0;
    this.invulnerable = 0;
    this.hits = 0;
    this.done = false;
    this.eggsSpawned = new Set();
    this.callouts = [];

    this.add.rectangle(0, 0, W, H, 0x05091a).setOrigin(0);
    const rng = new Phaser.Math.RandomDataGenerator(["voyage-rocket"]);
    this.starsFar = Array.from({ length: 120 }, () =>
      this.add.image(rng.between(0, W), rng.between(0, H), "px_white").setScale(1 / 3).setAlpha(0.5),
    );
    this.starsNear = Array.from({ length: 50 }, () =>
      this.add.image(rng.between(0, W), rng.between(0, H), "px_white").setScale(2 / 3).setAlpha(0.9),
    );
    // Mars, distant, growing slightly as the lock completes.
    this.add.circle(W - 90, 110, 26, 0xb65d3a).setName("mars");

    this.corridor = this.add.graphics();
    this.sats = this.add.group();
    this.debris = this.add.group();
    // Nose points right (direction of travel): the upright texture is turned 90° clockwise.
    this.rocket = this.add
      .image(ROCKET_X, H / 2, "atlas_v")
      .setOrigin(ROCKET_ORIGIN.x, ROCKET_ORIGIN.y)
      .setAngle(90)
      .setScale(ROCKET_SCALE);
    // Glowing exhaust plume streaming back from the engines (shared fire style, see art.ts).
    this.flame = this.add.particles(0, 0, "soft_blob", {
      ...exhaustConfig({ angle: 180, spread: 7, speed: [300, 460], lifespan: [160, 320], scale: [0.07, 0.22], frequency: 7, quantity: 1 }),
    });
    // (the rocket is drawn above its own exhaust)
    this.rocket.setDepth(1);
    this.flame.startFollow(this.rocket, -TAIL_OFFSET, 0);

    this.keys = this.input.keyboard!.addKeys("W,S,A,D,UP,DOWN,LEFT,RIGHT", false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.cameras.main.fadeIn(500, 0, 0, 0);
    actions.setSubtitle(null);
    runStore.set({ rocketLock: 0, toast: "Steer with W/S or ↑/↓ · stay in the corridor · dodge debris" });
    // Phase I (B3): Mission Control talks the player through the transfer (draft script).
    this.saidMidway = false;
    this.time.delayedCall(1200, () => void this.say(0));
  }

  private saidMidway = false;
  private callouts: Callout[] = [];

  /**
   * Easter-egg callout (team sketch): a glowing leader line from the object to a small hexagonal
   * label box with its name and a short fact. It draws on, holds while the object drifts, then
   * fades out. Built when the egg spawns (so its size is known for layout), shown a moment later.
   */
  private makeCallout(target: Phaser.GameObjects.Image, egg: EasterEgg, side: "above" | "below"): Callout {
    const name = this.add
      .text(0, 0, egg.name.toUpperCase(), { fontFamily: "monospace", fontSize: "12px", fontStyle: "bold", color: "#8eeefa" })
      .setLetterSpacing(1.5);
    const fact = this.add.text(0, 0, egg.fact, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "11px",
      color: "#e9f1f7",
      wordWrap: { width: 196 },
      lineSpacing: 1,
    });
    const w = Math.max(name.width, fact.width) + 34;
    const h = name.height + fact.height + 16;
    const frame = this.add.graphics();
    const hex = (inset: number) => [
      new Phaser.Math.Vector2(inset, h / 2),
      new Phaser.Math.Vector2(11 + inset, inset),
      new Phaser.Math.Vector2(w - 11 - inset, inset),
      new Phaser.Math.Vector2(w - inset, h / 2),
      new Phaser.Math.Vector2(w - 11 - inset, h - inset),
      new Phaser.Math.Vector2(11 + inset, h - inset),
    ];
    frame.fillStyle(0x071426, 0.92).fillPoints(hex(0), true);
    frame.lineStyle(5, 0x68d7e9, 0.2).strokePoints(hex(0), true); // glow
    frame.lineStyle(1.5, 0x8eeefa, 1).strokePoints(hex(0), true);
    name.setPosition(17, 7);
    fact.setPosition(17, 8 + name.height + 1);
    const box = this.add.container(0, 0, [frame, name, fact]).setDepth(6).setAlpha(0);
    const line = this.add.graphics().setDepth(5);
    const hold = 3 + egg.fact.length / 40; // long enough to read the fact
    return { target, box, line, w, h, t: -1, hold, side };
  }

  /** Corridor centre at screen x (the corridor scrolls left at SCROLL px/s); `ahead` = seconds from now. */
  private corridorY(x: number, ahead = 0) {
    return this.centerAt(this.elapsed + ahead + (x - this.rocket.x) / SCROLL);
  }

  /** Free vertical band beside the corridor across [x0, x1], on one side. */
  private freeBand(side: "above" | "below", x0: number, x1: number, ahead = 0): [number, number] {
    let top = EGG_SAFE_TOP;
    let bottom = EGG_SAFE_BOTTOM;
    for (let i = 0; i <= 6; i++) {
      const cy = this.corridorY(x0 + ((x1 - x0) * i) / 6, ahead);
      if (side === "above") bottom = Math.min(bottom, cy - CORRIDOR_HALF - EGG_GAP);
      else top = Math.max(top, cy + CORRIDOR_HALF + EGG_GAP);
    }
    return [top, bottom];
  }

  /**
   * Before an egg spawns: forecast its whole crossing and pick the side of the corridor with the
   * most room the entire way (so it never has to cross the rocket's path). null = no room yet.
   */
  private pickEggSide(egg: EasterEgg, r: number): "above" | "below" | null {
    let best: "above" | "below" | null = null;
    let bestRoom = 2 * r + 8;
    for (const side of ["above", "below"] as const) {
      let room = Infinity;
      for (let x = W + 60; x > -80; x -= 60) {
        const ahead = (W + 60 - x) / egg.speed;
        const [top, bottom] = this.freeBand(side, x - r, x + r, ahead);
        room = Math.min(room, bottom - top);
      }
      if (room > bestRoom) {
        best = side;
        bestRoom = room;
      }
    }
    return best;
  }

  /** Keep an egg and its label inside the free band on its side of the corridor. */
  private layoutEgg(c: Callout, dt: number, snap = false) {
    const egg = c.target;
    const r = Math.max(egg.displayWidth, egg.displayHeight) * 0.5;
    const bx = Phaser.Math.Clamp(egg.x + 18, 12, W - c.w - 12);
    const [top, bottom] = this.freeBand(c.side, Math.min(egg.x - r, bx), Math.max(egg.x + r, bx + c.w));
    const room = bottom - top;
    const stacked = room >= 2 * r + 8 + c.h; // label above/below the egg, else beside it
    let eggY: number;
    let boxY: number;
    if (stacked) {
      const total = 2 * r + 8 + c.h;
      const start = top + (room - total) / 2;
      // The label goes on the OUTER side (away from the corridor).
      if (c.side === "above") {
        boxY = start;
        eggY = start + c.h + 8 + r;
      } else {
        eggY = start + r;
        boxY = start + 2 * r + 8;
      }
    } else {
      eggY = (top + bottom) / 2;
      boxY = eggY - c.h / 2;
    }
    eggY = Phaser.Math.Clamp(eggY, EGG_SAFE_TOP + r, EGG_SAFE_BOTTOM - r);
    egg.y = snap ? eggY : egg.y + (eggY - egg.y) * Math.min(1, dt * 4);
    const boxX = stacked ? bx : Phaser.Math.Clamp(egg.x + r + 22, 12, W - c.w - 12);
    const targetBoxY = Phaser.Math.Clamp(boxY, EGG_SAFE_TOP, EGG_SAFE_BOTTOM - c.h);
    const ease = snap || c.t < 0 ? 1 : Math.min(1, dt * 4);
    c.box.setPosition(c.box.x + (boxX - c.box.x) * ease, c.box.y + (targetBoxY - c.box.y) * ease);
    return { stacked, r };
  }

  private updateCallouts(dt: number) {
    const DRAW = 0.3; // line draws on
    const POP = 0.25; // box fades/scales in
    const OUT = 0.45; // transition out
    for (let i = this.callouts.length - 1; i >= 0; i--) {
      const c = this.callouts[i];
      if (!c.target.active) {
        c.box.destroy();
        c.line.destroy();
        this.callouts.splice(i, 1);
        continue;
      }
      const { stacked, r } = this.layoutEgg(c, dt);
      if (c.t < 0) {
        // Shown once the egg is well onto the screen.
        if (c.target.x < W * 0.76) c.t = 0;
        else continue;
      }
      c.t += dt;
      const end = DRAW + POP + c.hold + OUT;
      if (c.t >= end) {
        c.box.destroy();
        c.line.destroy();
        this.callouts.splice(i, 1);
        continue;
      }
      const tx = c.target.x;
      const ty = c.target.y;
      const bx = c.box.x;
      const by = c.box.y;
      let start: { x: number; y: number };
      let anchor: { x: number; y: number };
      if (stacked) {
        const up = c.side === "above"; // label sits above the egg
        start = { x: tx + r * 0.3, y: ty + (up ? -r * 0.75 : r * 0.75) };
        anchor = { x: bx + 22, y: up ? by + c.h : by };
      } else {
        start = { x: tx + r * 0.8, y: ty };
        anchor = { x: bx, y: by + c.h / 2 };
      }

      const draw = Math.min(1, c.t / DRAW);
      const fadeOut = c.t > end - OUT ? (end - c.t) / OUT : 1;
      const pop = Phaser.Math.Clamp((c.t - DRAW) / POP, 0, 1);
      c.box.setAlpha(pop * fadeOut).setScale(0.92 + 0.08 * pop);
      const tip = lerpPt(start, anchor, draw);
      c.line.clear();
      for (const [width, alpha] of [
        [5, 0.2],
        [1.5, 1],
      ] as const) {
        c.line.lineStyle(width, 0x8eeefa, alpha * fadeOut).lineBetween(start.x, start.y, tip.x, tip.y);
      }
      c.line.fillStyle(0x8eeefa, fadeOut).fillCircle(start.x, start.y, 2.5);
    }
  }

  /** Speak one space-travel line (voice if recorded, typed subtitle always), then clear it. */
  private async say(index: number) {
    const seg = scripts.spaceTravel;
    const hold = await speakLine(this, seg, index);
    if (!hold) return;
    await wait(this, hold);
    if (runStore.get().subtitle?.text === seg.lines[index]) actions.setSubtitle(null);
  }

  /** Corridor centre at a given time — smooth, readable curve toward Mars. */
  private centerAt(t: number) {
    return H / 2 + 150 * Math.sin(t * 0.42) + 55 * Math.sin(t * 1.07 + 1.3);
  }

  update(_time: number, deltaMs: number) {
    const s = runStore.get();
    if (isWorldPaused(s) || this.done) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    this.elapsed += dt;
    const scroll = SCROLL;

    // Parallax stars.
    for (const st of this.starsFar) st.x = st.x - 40 * dt < 0 ? W : st.x - 40 * dt;
    for (const st of this.starsNear) st.x = st.x - 140 * dt < 0 ? W : st.x - 140 * dt;

    // Steering.
    const k = this.keys;
    const dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    this.rocket.y = Phaser.Math.Clamp(this.rocket.y + dy * 300 * dt, 40, H - 40);
    this.rocket.x = Phaser.Math.Clamp(this.rocket.x + dx * 160 * dt, 140, 420);
    this.rocket.setAngle(90 + dy * 10);
    // Keep the exhaust on the engine as the rocket tilts.
    const nose = this.noseDir();
    this.flame.followOffset.set(-nose.x * TAIL_OFFSET, -nose.y * TAIL_OFFSET);

    // Trajectory corridor (drawn ahead of the rocket).
    const half = CORRIDOR_HALF;
    const g = this.corridor;
    g.clear();
    g.lineStyle(2, 0x68d7e9, 0.75);
    for (let x = 60; x < W; x += 24) {
      const t = this.elapsed + (x - this.rocket.x) / scroll;
      const cy = this.centerAt(t);
      g.lineBetween(x, cy - half, x + 12, cy - half);
      g.lineBetween(x, cy + half, x + 12, cy + half);
    }
    const inside = Math.abs(this.rocket.y - this.centerAt(this.elapsed)) < half;
    // ~20 s of in-corridor flying locks the trajectory; with a few hits a normal run lands near 30 s.
    this.lock = Phaser.Math.Clamp(this.lock + (inside ? 5 : -1) * dt, 0, 100);

    // Debris: spawn from the right, dodge it.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.lock < 96) {
      this.spawnTimer = Phaser.Math.FloatBetween(0.7, 1.1);
      const cy = this.centerAt(this.elapsed + (W + 40 - this.rocket.x) / scroll);
      const y = Phaser.Math.Clamp(cy + Phaser.Math.Between(-110, 110), 30, H - 30);
      // Same random size range as the old placeholder (0.8–1.6): smaller rolls use the small asteroid,
      // larger rolls the medium one. Each rock is drawn at the placeholder rock's visible width.
      const size = Phaser.Math.FloatBetween(0.8, 1.6);
      const key = size < ASTEROID_SPLIT ? "asteroid_small" : "asteroid_medium";
      const d = this.add.image(W + 40, y, key);
      d.setScale((PLACEHOLDER_ROCK_WIDTH * size) / d.width);
      d.setData("hitRadius", PLACEHOLDER_HIT_RADIUS * size);
      d.setData("spin", Phaser.Math.FloatBetween(-2, 2));
      this.debris.add(d);
    }
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    for (const obj of [...this.debris.getChildren()] as Phaser.GameObjects.Image[]) {
      obj.x -= scroll * dt;
      obj.rotation += (obj.getData("spin") as number) * dt;
      if (obj.x < -60) {
        obj.destroy();
        continue;
      }
      if (this.invulnerable <= 0 && this.distanceToHull(obj.x, obj.y) < HIT_RADIUS + (obj.getData("hitRadius") as number)) {
        // Soft retry: wobble, lose a little lock, keep flying.
        this.invulnerable = 1.2;
        this.hits++;
        this.lock = Math.max(0, this.lock - 5);
        this.cameras.main.shake(250, 0.006);
        audio.sfx("hit");
        this.tweens.add({ targets: this.rocket, alpha: 0.35, yoyo: true, repeat: 3, duration: 120 });
        runStore.set({ toast: "Debris hit! Trajectory drifting. Steer back into the corridor!" });
        obj.destroy();
      }
    }

    // Optional Easter eggs (B2): real objects drift past with a short labelled fact. Never required,
    // never collide. One at a time, each kept beside (never across) the trajectory corridor.
    if (this.sats.getLength() === 0) {
      for (const egg of EASTER_EGGS) {
        if (this.eggsSpawned.has(egg.key)) continue;
        const due = egg.at.seconds !== undefined ? this.elapsed >= egg.at.seconds : this.lock >= (egg.at.lock ?? 101);
        if (!due) break; // keep their order
        const img = this.add.image(W + 60, H / 2, egg.key);
        img.setScale(egg.width / img.width);
        const side = this.pickEggSide(egg, Math.max(img.displayWidth, img.displayHeight) * 0.5);
        if (!side) {
          img.destroy(); // no clear lane right now — try again next frame
          break;
        }
        this.eggsSpawned.add(egg.key);
        img.setData("egg", egg);
        this.sats.add(img);
        const c = this.makeCallout(img, egg, side);
        this.layoutEgg(c, dt, true);
        this.callouts.push(c);
        break;
      }
    }
    for (const sat of [...this.sats.getChildren()] as Phaser.GameObjects.Image[]) {
      const egg = sat.getData("egg") as EasterEgg;
      sat.x -= egg.speed * dt;
      sat.rotation += egg.spin * dt;
      if (sat.x < -120) sat.destroy();
    }
    this.updateCallouts(dt);

    runStore.set({ rocketLock: Math.round(this.lock) });

    if (!this.saidMidway && this.lock >= 45) {
      this.saidMidway = true;
      void this.say(1);
    }
    if (this.lock >= 100) void this.finish();
  }

  private async finish() {
    this.done = true;
    runStore.set({ rocketLock: 100, toast: null }); // Mission Control says it instead
    void this.say(2);
    this.tweens.add({ targets: this.rocket, x: W + 120, duration: 1600, ease: "Sine.easeIn" });
    this.time.delayedCall(1700, () => this.cameras.main.fadeOut(500, 0, 0, 0));
    this.time.delayedCall(2300, () => actions.setStage("landing"));
  }

  /** Unit vector from tail to nose (the texture's nose points up, i.e. angle 0 = up). */
  private noseDir() {
    const a = this.rocket.rotation - Math.PI / 2;
    return { x: Math.cos(a), y: Math.sin(a) };
  }

  /** Distance from a point to the rocket's centre line (the capsule hitbox's core segment). */
  private distanceToHull(px: number, py: number) {
    const n = this.noseDir();
    const t = Phaser.Math.Clamp((px - this.rocket.x) * n.x + (py - this.rocket.y) * n.y, -HIT_HALF_LENGTH, HIT_HALF_LENGTH);
    return Phaser.Math.Distance.Between(px, py, this.rocket.x + n.x * t, this.rocket.y + n.y * t);
  }

  /** Exposed for tuning/QA: seconds the run has taken. */
  get seconds() {
    return this.elapsed;
  }
}
