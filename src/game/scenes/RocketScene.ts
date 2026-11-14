import * as Phaser from "phaser";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../constants";
import { makeCinematicTextures } from "../art";
import { actions, isWorldPaused, runStore } from "../state/runStore";
import { audio } from "../audio/engine";

// ~30 s on-rails travel (PRD §4.1 #2): dodge debris AND align the trajectory.
// No hard fail: hits wobble the rocket and cost some lock progress (soft retry, rules §5).

const ROCKET_X = 230;

export class RocketScene extends Phaser.Scene {
  private rocket!: Phaser.GameObjects.Image;
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
    this.rocket = this.add.image(ROCKET_X, H / 2, "rocket").setAngle(90).setScale(0.9);
    const flame = this.add.particles(0, 0, "px_flame", {
      speedX: { min: -320, max: -200 },
      speedY: { min: -30, max: 30 },
      lifespan: 280,
      scale: { start: 1.6, end: 0.2 },
      alpha: { start: 1, end: 0 },
      frequency: 14,
    });
    flame.startFollow(this.rocket, -70, 0);

    this.keys = this.input.keyboard!.addKeys("W,S,A,D,UP,DOWN,LEFT,RIGHT", false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.cameras.main.fadeIn(500, 0, 0, 0);
    actions.setSubtitle(null);
    runStore.set({ rocketLock: 0, toast: "Steer with W/S or ↑/↓ · stay in the corridor · dodge debris" });
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
      const d = this.add.image(W + 40, y, "debris").setScale(Phaser.Math.FloatBetween(0.8, 1.6));
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
      if (this.invulnerable <= 0 && Phaser.Math.Distance.Between(obj.x, obj.y, this.rocket.x, this.rocket.y) < 18 + obj.displayWidth / 2) {
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

    if (this.lock >= 100) void this.finish();
  }

  private async finish() {
    this.done = true;
    runStore.set({ rocketLock: 100, toast: "Trajectory locked — on course for Mars" });
    this.tweens.add({ targets: this.rocket, x: W + 120, duration: 1600, ease: "Sine.easeIn" });
    this.time.delayedCall(1700, () => this.cameras.main.fadeOut(500, 0, 0, 0));
    this.time.delayedCall(2300, () => actions.setStage("landing"));
  }

  /** Exposed for tuning/QA: seconds the run has taken. */
  get seconds() {
    return this.elapsed;
  }
}
