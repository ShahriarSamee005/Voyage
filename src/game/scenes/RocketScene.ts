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
  private satTimes = [9, 21];

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
    this.satTimes = [9, 21];

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
    const scroll = 320;

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
    const half = 70;
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
        runStore.set({ toast: "Debris hit — trajectory drifting. Steer back into the corridor!" });
        obj.destroy();
      }
    }

    // Optional Easter egg: an old satellite drifts past; fly close to spot it (+1 coin, never required).
    if (this.satTimes.length && this.elapsed >= this.satTimes[0]) {
      this.satTimes.shift();
      const sat = this.add.image(W + 60, Phaser.Math.Between(120, H - 120), "satellite").setScale(1.2).setAlpha(0.85);
      sat.setData("spotted", false);
      this.sats.add(sat);
    }
    for (const sat of [...this.sats.getChildren()] as Phaser.GameObjects.Image[]) {
      sat.x -= 190 * dt;
      sat.rotation += 0.2 * dt;
      if (!sat.getData("spotted") && Phaser.Math.Distance.Between(sat.x, sat.y, this.rocket.x, this.rocket.y) < 90) {
        sat.setData("spotted", true);
        actions.awardSighting("an old satellite");
      }
      if (sat.x < -80) sat.destroy();
    }

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
