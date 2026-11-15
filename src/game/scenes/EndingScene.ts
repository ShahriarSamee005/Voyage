import * as Phaser from "phaser";
import { scripts } from "@/content/scripts";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../constants";
import { playLines, totalSeconds, wait } from "../cinematic";
import { actions } from "../state/runStore";

// Reflective ending (appflow §2.13): after the storm shut it down, our rover sits dark under a
// dusty sky, looking toward a single distant bright point — Earth — and speaks the APPROVED final
// lines. Automatic, unskippable. Backdrop: team art (Nov 15), with Earth already painted in.

const EXTRA_PER_LINE = 1.2; // slower, quieter pacing than the rest of the game
// Earth's bright point in the backdrop (1280×720 copy of the team's 1920×1080 art).
const EARTH = { x: 657, y: 105 };

export class EndingScene extends Phaser.Scene {
  constructor() {
    super("Ending");
  }

  create() {
    this.cameras.main.fadeIn(1500, 0, 0, 0);
    const total = totalSeconds(scripts.ending, EXTRA_PER_LINE);

    this.add.image(0, 0, "ending_bg").setOrigin(0).setDisplaySize(W, H);
    // The storm is settling: a faint veil of dust thins out over the monologue.
    const veil = this.add.rectangle(0, 0, W, H, 0x6a3a26, 0.35).setOrigin(0);
    this.tweens.add({ targets: veil, fillAlpha: 0.08, duration: total * 700, delay: 1500, ease: "Sine.easeOut" });

    // Earth: a soft breathing glow around the painted point (appflow §2.13: a point, not a planet).
    const glow = this.add.circle(EARTH.x, EARTH.y, 12, 0xcfe6ff, 0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, fillAlpha: { from: 0, to: 0.3 }, duration: 2000, delay: 2500 });
    this.time.delayedCall(4500, () =>
      this.tweens.add({ targets: glow, scale: { from: 1, to: 1.35 }, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }),
    );

    // Our rover in the open ground at the right (above the subtitle box), turned toward the distant
    // Earth. It is already out of power; what light it has left fades over the monologue.
    this.add.image(1010, 548, "soft_shadow").setDisplaySize(120, 28).setAlpha(0.5);
    const rover = this.add.image(1010, 548, "player_NW", "body").setOrigin(0.5, 0.85).setScale(0.58);
    this.tweens.addCounter({
      from: 190,
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
