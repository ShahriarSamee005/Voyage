import * as Phaser from "phaser";
import { scripts } from "@/content/scripts";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../constants";
import { makeCinematicTextures } from "../art";
import { playLines, totalSeconds, wait } from "../cinematic";
import { actions } from "../state/runStore";

// Earth liftoff + APPROVED opening monologue (PRD §4.8), automatic and unskippable.
// Mission tags appear progressively, independent of the subtitles (design.md §8.2).

// Atlas V liftoff art: 1/4-size copies of the high-res sources, both drawn 1:1 so they stay in
// proportion and render pixel-crisp (nearest-neighbour, per the pixelArt config).
const ART_SCALE = 1;
// Ground line raised from H-120 so the pad's feet clear the subtitle box (bottom-10, ~110 px tall).
const GROUND_Y = H - 165;
// Rocket stands right of centre so the pad's tower (to its left) clears the top-left mission tags.
const ROCKET_X = W / 2 + 60;
// Landmarks in the 1/4-size copies (measured alpha-based on the sources, then ÷4; both carry padding).
const PAD = { width: 256, height: 384, feetY: 368.75, deckY: 325.5, standX: 187 }; // standX: arm tips (171.5) + core half-width
const ROCKET = { width: 221, height: 443, baseX: 110.375, baseY: 431.75 }; // centre of the main-engine bottom

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
    const ground = this.add.rectangle(0, GROUND_Y, W, H - GROUND_Y, 0x5c6b4e).setOrigin(0);
    // Pad origin = the rocket's stand point (x) at the pad's feet (y), so the pad sits on the
    // ground line and the rocket's core rests against the umbilical-arm tips.
    const pad = this.add
      .image(ROCKET_X, GROUND_Y, "atlas_v_pad")
      .setOrigin(PAD.standX / PAD.width, PAD.feetY / PAD.height)
      .setScale(ART_SCALE);

    // Rocket origin = centre of its engine bottom, so it stands on the deck and rises off it.
    const rocket = this.add
      .image(ROCKET_X, GROUND_Y - (PAD.feetY - PAD.deckY) * ART_SCALE, "atlas_v")
      .setOrigin(ROCKET.baseX / ROCKET.width, ROCKET.baseY / ROCKET.height)
      .setScale(ART_SCALE);
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
      this.tweens.add({ targets: [ground, pad], y: `+=${H}`, duration: (duration - 2) * 1000 * 0.5, ease: "Sine.easeIn" });
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
