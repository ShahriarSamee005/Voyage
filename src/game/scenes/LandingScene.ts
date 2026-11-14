import * as Phaser from "phaser";
import { scripts } from "@/content/scripts";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../constants";
import { lineSeconds, playLines, wait } from "../cinematic";
import { actions } from "../state/runStore";
import { audio } from "../audio/engine";
import { wheelSpinAnim, wheelSpinTexture } from "../art";

// Mars arrival (appflow §2.5), automatic and unskippable, in the locked order:
// approach + APPROVED landing monologue → our (fictional) lander touches down → our rover deploys
// → clearly-marked 1997 Mars Pathfinder flashback → real NASA image → return to present near Sojourner.
// Our lander uses rocket-powered descent (no airbags/petals) so it is never mistaken for Pathfinder.

const HORIZON = 500;

export class LandingScene extends Phaser.Scene {
  private present!: Phaser.GameObjects.Container;
  private past!: Phaser.GameObjects.Container;

  constructor() {
    super("Landing");
  }

  create() {
    this.cameras.main.fadeIn(600, 0, 0, 0);
    const space = this.buildApproach();
    this.present = this.buildSurface(false).setVisible(false);
    this.past = this.buildSurface(true).setVisible(false);
    void this.run(space);
  }

  // ---------- builders ----------

  private buildApproach() {
    const c = this.add.container(0, 0);
    c.add(this.add.rectangle(0, 0, W, H, 0x05091a).setOrigin(0));
    const rng = new Phaser.Math.RandomDataGenerator(["voyage-landing"]);
    for (let i = 0; i < 140; i++) c.add(this.add.image(rng.between(0, W), rng.between(0, H), "px_white").setScale(1 / 3).setAlpha(0.7));
    const mars = this.add.container(W * 0.62, H * 0.58);
    mars.add(this.add.circle(0, 0, 200, 0xb65d3a));
    mars.add(this.add.circle(-30, -26, 170, 0xd47946, 0.55));
    for (let i = 0; i < 16; i++) {
      const a = rng.frac() * Math.PI * 2;
      const r = rng.frac() * 160;
      mars.add(this.add.circle(Math.cos(a) * r, Math.sin(a) * r, rng.between(6, 18), 0x713a35, 0.5));
    }
    mars.add(this.add.circle(40, 40, 205, 0x2a0f0a, 0.35)); // night side
    mars.setScale(0.6).setName("mars");
    c.add(mars);
    const craft = this.add.image(W * 0.18, H * 0.25, "lander").setScale(0.9).setAngle(20).setName("craft");
    c.add(craft);
    return c;
  }

  private buildSurface(past: boolean) {
    const c = this.add.container(0, 0);
    c.add(this.add.rectangle(0, 0, W, HORIZON, past ? 0xcfa77e : 0xd2a274).setOrigin(0));
    c.add(this.add.rectangle(0, HORIZON - 120, W, 120, past ? 0xc79b72 : 0xc2865a, 0.6).setOrigin(0));
    c.add(this.add.tileSprite(0, HORIZON, W, H - HORIZON, "ground_mirror").setOrigin(0));
    const rng = new Phaser.Math.RandomDataGenerator([past ? "pf" : "now"]);
    for (let i = 0; i < 9; i++) {
      const key = rng.pick(["rock_medium_1", "rock_medium_2", "rock_large_1"]);
      c.add(this.add.image(rng.between(40, W - 40), rng.between(HORIZON + 40, H - 30), key).setScale(rng.realInRange(0.25, 0.5)));
    }
    return c;
  }

  // ---------- timeline ----------

  private async run(space: Phaser.GameObjects.Container) {
    const mars = space.getByName("mars") as Phaser.GameObjects.Container;
    const craft = space.getByName("craft") as Phaser.GameObjects.Image;
    const lines = scripts.landing.lines;
    const approachSeconds = lines.slice(0, -1).reduce((s, l) => s + lineSeconds(l), 0);
    this.tweens.add({ targets: mars, scale: 2.2, x: W * 0.55, y: H * 0.95, duration: approachSeconds * 1000, ease: "Sine.easeIn" });
    this.tweens.add({ targets: craft, x: W * 0.45, y: H * 0.45, scale: 0.6, duration: approachSeconds * 1000 });

    let lander!: Phaser.GameObjects.Image;
    let flame!: Phaser.GameObjects.Particles.ParticleEmitter;
    await playLines(this, scripts.landing, {
      onLine: (i) => {
        if (i !== lines.length - 1) return;
        // "Prepare for touchdown." — cut to our powered descent over the surface.
        space.setVisible(false);
        this.present.setVisible(true);
        lander = this.add.image(W * 0.42, -60, "lander").setOrigin(0.5, 1).setScale(1.4);
        flame = this.add.particles(0, 0, "px_flame", {
          speedY: { min: 200, max: 320 },
          speedX: { min: -60, max: 60 },
          lifespan: 380,
          scale: { start: 2, end: 0.2 },
          alpha: { start: 1, end: 0 },
          frequency: 10,
        });
        flame.startFollow(lander, 0, 0);
        this.present.add([lander]);
        this.tweens.add({ targets: lander, y: HORIZON + 30, duration: lineSeconds(lines[i]) * 1000 + 1200, ease: "Quad.easeOut" });
      },
    });

    // Touchdown.
    await wait(this, 1.3);
    flame.stop();
    audio.sfx("touchdown");
    this.dustBurst(lander.x, HORIZON + 30);
    this.cameras.main.shake(300, 0.004);
    await wait(this, 1.2);

    // Our rover deploys and rolls onto Martian soil.
    // Side-on, facing right (east) as it rolls off the lander.
    const rover = this.add.sprite(lander.x + 10, HORIZON - 15, wheelSpinTexture("E"), 0).setScale(0.3).setOrigin(0.5, 1);
    this.present.add(rover);
    rover.play(wheelSpinAnim("E")); // wheels turn as it rolls off the lander
    await this.tweenAsync({ targets: rover, x: lander.x + 230, y: HORIZON + 60, duration: 2600, ease: "Sine.easeInOut" });
    rover.stop();
    this.dustBurst(rover.x, HORIZON + 60, 10);
    await wait(this, 1.0);

    await this.flashback();

    // Return to the present near Sojourner.
    actions.setBanner({ label: "PRESENT DAY", title: "Ares Vallis — near Sojourner" });
    await wait(this, 2.4);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    await wait(this, 0.7);
    actions.setStage("surface");
  }

  /** Historical 1997 sequence — visually distinct (sepia + dated banner) from the present. */
  private async flashback() {
    this.cameras.main.flash(500, 255, 244, 220);
    this.present.setVisible(false);
    this.past.setVisible(true);
    let sepia: Phaser.FX.ColorMatrix | null = null;
    try {
      sepia = this.cameras.main.postFX.addColorMatrix();
      sepia.sepia();
    } catch {
      sepia = null; // Canvas renderer: the dated banner still marks the past
    }
    actions.setBanner({ label: "FLASHBACK", title: "Mars Pathfinder · July 4, 1997" });

    // Parachute slows the descent…
    const pod = this.add.container(W * 0.2, -120);
    const chute = this.add.image(0, -120, "pf_chute").setScale(1.9);
    const bags = this.add.image(0, 0, "pf_airbags").setScale(1.5);
    const lineG = this.add.graphics().lineStyle(1, 0xcfc6b2, 1).lineBetween(-20, -40, 0, -36).lineBetween(20, -40, 0, -36);
    pod.add([lineG, chute, bags]);
    this.past.add(pod);
    await this.tweenAsync({ targets: pod, y: 160, x: W * 0.28, duration: 2600, ease: "Sine.easeOut" });

    // …rockets fire, the bridle is cut, and the airbags bounce across the surface.
    this.dustBurst(pod.x, pod.y + 40, 8);
    this.tweens.add({ targets: chute, y: -700, x: 240, alpha: 0, duration: 1500 });
    lineG.setVisible(false);
    const bounces = [
      { x: W * 0.36, top: 300 },
      { x: W * 0.46, top: 400 },
      { x: W * 0.53, top: 455 },
    ];
    for (const b of bounces) {
      await this.tweenAsync({ targets: pod, y: HORIZON + 40, x: b.x, angle: pod.angle + 140, duration: 520, ease: "Quad.easeIn" });
      this.dustBurst(pod.x, HORIZON + 60, 6);
      await this.tweenAsync({ targets: pod, y: b.top, x: b.x + 60, angle: pod.angle + 90, duration: 480, ease: "Quad.easeOut" });
    }
    await this.tweenAsync({ targets: pod, y: HORIZON + 40, x: W * 0.6, angle: 360 * 3, duration: 600, ease: "Bounce.easeOut" });
    await wait(this, 0.6);

    // Airbags deflate, petals open, and Sojourner rolls onto Mars.
    const open = this.add.image(pod.x, HORIZON + 70, "pf_open").setScale(2.6).setOrigin(0.5, 1).setAlpha(0);
    this.past.add(open);
    this.tweens.add({ targets: open, alpha: 1, duration: 700 });
    await this.tweenAsync({ targets: bags, scaleY: 0.25, alpha: 0, duration: 1200 });
    actions.setBanner({ label: "FLASHBACK", title: "July 6, 1997 · Sojourner rolls onto Mars" });
    const soj = this.add.image(open.x + 10, HORIZON + 40, "hist_sojourner").setScale(0.22).setOrigin(0.5, 1);
    this.past.add(soj);
    await this.tweenAsync({ targets: soj, x: open.x + 230, y: HORIZON + 110, duration: 2600, ease: "Sine.easeInOut" });
    await wait(this, 0.8);

    // The real record: an unretouched NASA photograph, clearly labelled.
    if (sepia) this.cameras.main.postFX.clear(); // the real photo must be shown unaltered
    const frame = this.add.rectangle(W / 2, H / 2 - 30, 760, 572, 0x0c1828).setStrokeStyle(2, 0x3f667c);
    const photo = this.add.image(W / 2, H / 2 - 30, "nasa_pf_day1");
    photo.setScale(Math.min(740 / photo.width, 552 / photo.height));
    frame.setAlpha(0);
    photo.setAlpha(0);
    this.tweens.add({ targets: [frame, photo], alpha: 1, duration: 800 });
    actions.setBanner({
      label: "REAL NASA IMAGE",
      title: "Sojourner on the Pathfinder lander, July 4, 1997",
      caption: "NASA/JPL · PIA00611",
    });
    await wait(this, 5);
    this.tweens.add({ targets: [frame, photo], alpha: 0, duration: 600 });
    await wait(this, 0.7);
    this.past.setVisible(false);
    this.present.setVisible(true);
  }

  // ---------- helpers ----------

  private dustBurst(x: number, y: number, n = 18) {
    const e = this.add.particles(x, y, "px_dust", {
      speed: { min: 60, max: 200 },
      angle: { min: 190, max: 350 },
      lifespan: 900,
      scale: { start: 2.4, end: 0.4 },
      alpha: { start: 0.9, end: 0 },
      emitting: false,
    });
    e.explode(n);
    this.time.delayedCall(1200, () => e.destroy());
  }

  private tweenAsync(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => this.tweens.add({ ...config, onComplete: () => resolve() }));
  }
}
