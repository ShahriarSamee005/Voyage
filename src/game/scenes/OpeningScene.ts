import * as Phaser from "phaser";
import { scripts } from "@/content/scripts";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../constants";
import { makeCinematicTextures } from "../art";
import { playLines, totalSeconds, wait } from "../cinematic";
import { actions } from "../state/runStore";

// Earth liftoff + APPROVED opening monologue (PRD §4.8), automatic and unskippable.
// Mission tags appear progressively, independent of the subtitles (design.md §8.2).

export class OpeningScene extends Phaser.Scene {
  constructor() {
    super("Opening");
  }

  create() {
    makeCinematicTextures(this);
    const duration = totalSeconds(scripts.opening);

    // Sky: daytime blue fading to space as the rocket climbs.
    const sky = this.add.rectangle(0, 0, W, H, 0x4f86b8).setOrigin(0);
    const stars = this.add.group();
    const rng = new Phaser.Math.RandomDataGenerator(["voyage-opening"]);
    for (let i = 0; i < 160; i++) {
      stars.add(this.add.image(rng.between(0, W), rng.between(0, H), "px_white").setAlpha(0).setScale(rng.pick([1, 1, 2]) / 3));
    }

    // Earth: launch ground first, then the planet's curve as we climb.
    const earth = this.add.circle(W / 2, H + 1500, 1700, 0x2f6fa8).setAlpha(0);
    const land = this.add.graphics().setAlpha(0);
    land.fillStyle(0x4f8a4a, 1).fillEllipse(W / 2 - 260, H - 30, 520, 90).fillEllipse(W / 2 + 330, H - 10, 420, 70);
    const glow = this.add.circle(W / 2, H + 1500, 1730, 0x9fd3ff, 0.18).setAlpha(0);
    const ground = this.add.rectangle(0, H - 120, W, 120, 0x5c6b4e).setOrigin(0);
    const pad = this.add.rectangle(W / 2, H - 120, 160, 18, 0x3a434a).setOrigin(0.5, 1);
    const tower = this.add.rectangle(W / 2 + 70, H - 138, 14, 220, 0x6f7b84).setOrigin(0.5, 1);

    const rocket = this.add.image(W / 2, H - 138, "rocket").setOrigin(0.5, 1);
    const flame = this.add.particles(0, 0, "px_flame", {
      speedY: { min: 220, max: 380 },
      speedX: { min: -40, max: 40 },
      lifespan: 500,
      scale: { start: 2.2, end: 0.2 },
      alpha: { start: 1, end: 0 },
      frequency: 12,
      emitting: false,
    });
    flame.startFollow(rocket, 0, 4);

    // Liftoff after a beat; the world (ground, pad) falls away while the rocket stays framed.
    this.time.delayedCall(1800, () => {
      flame.start();
      this.cameras.main.shake(1400, 0.004);
      this.tweens.add({ targets: rocket, y: H * 0.62, duration: 3000, ease: "Sine.easeIn" });
      this.tweens.add({ targets: [ground, pad, tower], y: `+=${H}`, duration: (duration - 2) * 1000 * 0.5, ease: "Sine.easeIn" });
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: duration * 1000 * 0.7,
        onUpdate: (tw) => {
          const t = tw.getValue() ?? 0;
          sky.setFillStyle(Phaser.Display.Color.GetColor(79 * (1 - t) + 5 * t, 134 * (1 - t) + 9 * t, 184 * (1 - t) + 20 * t));
          stars.getChildren().forEach((s) => (s as Phaser.GameObjects.Image).setAlpha(t * 0.9));
          earth.setAlpha(t);
          land.setAlpha(t);
          glow.setAlpha(t);
        },
      });
    });

    void this.run(rocket);
  }

  private async run(rocket: Phaser.GameObjects.Image) {
    await wait(this, 0.6);
    const tags = scripts.openingTags;
    await playLines(this, scripts.opening, {
      // 5 tags over 6 lines: one per line, "MISSION AUTHORIZED" with "cleared for launch".
      onLine: (i) => {
        const tag = i < tags.length - 1 ? tags[i] : tags[tags.length - 1];
        if (i < tags.length - 1 || i === scripts.opening.lines.length - 1) actions.showMissionTag(tag);
      },
    });
    this.tweens.add({ targets: rocket, y: -200, duration: 1600, ease: "Sine.easeIn" });
    await wait(this, 1.4);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    await wait(this, 0.6);
    actions.setStage("rocket");
  }
}
