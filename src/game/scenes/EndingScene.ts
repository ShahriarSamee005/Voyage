import * as Phaser from "phaser";
import { scripts } from "@/content/scripts";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../constants";
import { playLines, totalSeconds, wait } from "../cinematic";
import { actions } from "../state/runStore";

// Reflective ending (appflow §2.13): our rover's power fades as it looks toward a single
// distant bright point — Earth — and speaks the APPROVED final lines. Automatic, unskippable.

const HORIZON = 520;
const EXTRA_PER_LINE = 1.2; // slower, quieter pacing than the rest of the game

export class EndingScene extends Phaser.Scene {
  constructor() {
    super("Ending");
  }

  create() {
    this.cameras.main.fadeIn(1500, 0, 0, 0);
    const total = totalSeconds(scripts.ending, EXTRA_PER_LINE);

    // Dusk sky: deepening blue above a dim rust horizon.
    const sky = this.add.graphics();
    const bands = [0x0b0f24, 0x141634, 0x221c3c, 0x3a2340, 0x5a2e36, 0x7a3e2e];
    bands.forEach((c, i) => sky.fillStyle(c, 1).fillRect(0, (i * HORIZON) / bands.length, W, HORIZON / bands.length + 1));
    const rng = new Phaser.Math.RandomDataGenerator(["voyage-ending"]);
    const stars = Array.from({ length: 90 }, () =>
      this.add.image(rng.between(0, W), rng.between(0, HORIZON - 120), "px_white").setScale(1 / 3).setAlpha(0),
    );
    this.tweens.add({ targets: stars, alpha: { from: 0, to: 0.75 }, duration: total * 600, delay: 1500 });

    // Earth: one small bright point above the horizon — not a detailed planet (appflow §2.13).
    const earthX = W * 0.78;
    const earthY = HORIZON - 190;
    const glow = this.add.circle(earthX, earthY, 9, 0x9fd3ff, 0.25);
    const earth = this.add.circle(earthX, earthY, 3, 0xd8f0ff);
    this.tweens.add({ targets: [glow], alpha: { from: 0.15, to: 0.4 }, duration: 1600, yoyo: true, repeat: -1 });
    earth.setAlpha(0);
    glow.setAlpha(0);
    this.tweens.add({ targets: [earth], alpha: 1, duration: 2000, delay: 2500 });

    // Ground and silhouette rocks.
    this.add.rectangle(0, HORIZON, W, H - HORIZON, 0x3b1f17).setOrigin(0);
    this.add.tileSprite(0, HORIZON, W, H - HORIZON, "ground_mirror").setOrigin(0).setAlpha(0.35).setTint(0x6a4a5a);
    for (let i = 0; i < 6; i++) {
      this.add.image(rng.between(0, W), rng.between(HORIZON + 30, H - 20), rng.pick(["rock_medium_1", "rock_large_1"]))
        .setScale(rng.realInRange(0.3, 0.6))
        .setTint(0x2a1712);
    }

    // Our rover, facing the distant Earth; its power (light) fades over the monologue.
    const rover = this.add.image(W * 0.3, HORIZON + 50, "player_W", "body").setOrigin(0.5, 1).setScale(0.4);
    this.tweens.addCounter({
      from: 255,
      to: 70,
      duration: total * 1000,
      delay: 1500,
      onUpdate: (tw) => {
        const v = Math.round(tw.getValue() ?? 255);
        rover.setTint(Phaser.Display.Color.GetColor(v, Math.round(v * 0.95), Math.round(v * 1.05 > 255 ? 255 : v * 1.05)));
      },
    });

    void this.run();
  }

  private async run() {
    await wait(this, 3);
    await playLines(this, scripts.ending, { extraSeconds: EXTRA_PER_LINE });
    await wait(this, 3); // a quiet pause before the debrief
    this.cameras.main.fadeOut(2500, 0, 0, 0);
    await wait(this, 2.7);
    actions.endingFinished();
  }
}
