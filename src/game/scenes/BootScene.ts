import * as Phaser from "phaser";
import { GROUND_DECALS, PLAYER_DIRS, cropPlayerFrames, makeCinematicTextures, makeGroundTexture, makeSurfaceTextures, makeWheelSpin, wheelSpinTexture } from "../art";
import { runStore } from "../state/runStore";
import type { Stage } from "../state/types";

// Loads every shared asset once, then acts as the stage director: whenever the run's
// stage changes, it starts the matching scene and stops the others (appflow §1 order).

const SCENE_FOR_STAGE: Record<Stage, string> = {
  opening: "Opening",
  rocket: "Rocket",
  landing: "Landing",
  surface: "Surface",
  ending: "Ending",
};

export class BootScene extends Phaser.Scene {
  private current: Stage | null = null;

  constructor() {
    super("Boot");
  }

  preload() {
    // Simple loading bar so a slow venue connection never shows a blank screen.
    const { width: W, height: H } = this.scale;
    this.add.text(W / 2, H / 2 - 40, "PREPARING MISSION", { fontFamily: "monospace", fontSize: "18px", color: "#68d7e9" }).setOrigin(0.5);
    this.add.rectangle(W / 2, H / 2, 420, 14).setStrokeStyle(1, 0x3f667c);
    const bar = this.add.rectangle(W / 2 - 208, H / 2, 0, 8, 0xf1aa61).setOrigin(0, 0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => bar.setSize(416 * p, 8));
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.children.removeAll(true));

    this.load.image("flat_1", "/assets/terrain/flat_tile_1.png");
    for (const d of ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]) {
      this.load.image(`player_${d}`, `/assets/rovers/player/player_${d}.png`);
      // Wheel-spin overlays (scripts/make-wheel-spin.mjs), composited into spritesheets in create().
      this.load.image(`player_${d}_wheels`, `/assets/rovers/player/spin/player_${d}_wheels.png`);
    }
    this.load.image("hist_sojourner", "/assets/rovers/sojourner/sojourner_SE.png");
    // 286px copy of the 1303px source (drawn ~143px wide) — saves ~1.5 MB on venue Wi-Fi.
    this.load.image("hist_spirit", "/assets/rovers/spirit/spirit_stuck_game.png");
    this.load.image("hist_opportunity", "/assets/rovers/opportunity/opportunity_SW.png");
    for (const r of ["rock_large_1", "rock_large_2", "rock_medium_1", "rock_medium_2"]) {
      this.load.image(r, `/assets/props/${r}.png`);
    }
    // Ground details that break up the tiled surface (team AI art, fix D1): flat decals, no collision.
    for (const d of GROUND_DECALS) this.load.image(d, `/assets/new_assets/mars_environment/${d}.png`);
    // Rock formations (team art; trimmed 460 px WebP copies of new_assets/mars_environment/*_rock_formation_1).
    for (const f of ["tall_rock_formation_1", "wide_rock_formation_1"]) this.load.image(f, `/assets/terrain/formations/${f}.webp`);
    // Real NASA image shown at the end of the 1997 flashback (PIA00611).
    this.load.image("nasa_pf_day1", "/assets/nasa-photos/sojourner/sojourner-on-mars.jpg");
    // Earth-liftoff art (Opening scene): Atlas V on its launch pad, team-supplied AI pixel art.
    // Exact 1/4-size copies of the team's high-res originals (887×1774 rocket, trimmed 3×2 px of
    // transparent padding first; 1024×1536 pad) — drawn 1:1, saves ~2.3 MB on venue Wi-Fi.
    // Also used by the Rocket mini-game (rocket only).
    // Rocket mini-game asteroids: team AI art, padding and faint haze trimmed, resized so each is
    // its size group's largest on-screen width (small 38×25 from 128×128, medium 51×48 from 256×256).
    this.load.image("asteroid_small", "/assets/rocket/asteroid_small.png");
    this.load.image("asteroid_medium", "/assets/rocket/asteroid_medium.png");
    // Landing cinematic (Phase F): trimmed WebP copies of the team's art (`npm run landing-art`).
    for (const k of ["entry", "chute_modern", "crane_0", "crane_1", "pf_descent", "airbag_0", "airbag_1", "airbag_2"]) {
      this.load.image(k, `/assets/landing/${k}.webp`);
    }
    for (let i = 0; i < 6; i++) this.load.image(`pf_lander_${i}`, `/assets/landing/pf_lander_${i}.webp`);
    this.load.image("atlas_v", "/assets/rocket/atlas_v.png");
    this.load.image("atlas_v_pad", "/assets/rocket/atlas_v_pad.png");
  }

  create() {
    cropPlayerFrames(this);
    makeWheelSpin(this);
    // Rover/rock illustrations are always drawn well below their source size; nearest-neighbour
    // minification drops pixels unevenly (jagged, shimmering edges), so smooth just these.
    // Terrain tiles and procedural pixel art stay nearest-neighbour (pixelArt config).
    const smooth = [
      ...PLAYER_DIRS.flatMap((d) => [`player_${d}`, wheelSpinTexture(d)]),
      "hist_sojourner",
      "hist_spirit",
      "hist_opportunity",
      "rock_large_1",
      "rock_large_2",
      "rock_medium_1",
      "rock_medium_2",
      ...GROUND_DECALS,
      "tall_rock_formation_1",
      "wide_rock_formation_1",
      ...["entry", "chute_modern", "crane_0", "crane_1", "pf_descent", "airbag_0", "airbag_1", "airbag_2"],
      ...[0, 1, 2, 3, 4, 5].map((i) => `pf_lander_${i}`),
      // Asteroids are drawn at 0.67–1× of their copy size depending on the random spawn size.
      "asteroid_small",
      "asteroid_medium",
    ];
    for (const key of smooth) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    makeGroundTexture(this);
    makeSurfaceTextures(this);
    makeCinematicTextures(this);

    const sync = () => {
      const stage = runStore.get().stage;
      if (stage === this.current) return;
      this.current = stage;
      for (const key of Object.values(SCENE_FOR_STAGE)) {
        if (this.scene.isActive(key) || this.scene.isPaused(key)) this.scene.stop(key);
      }
      this.scene.launch(SCENE_FOR_STAGE[stage]);
    };
    const unsubscribe = runStore.subscribe(sync);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.events.once(Phaser.Scenes.Events.DESTROY, unsubscribe);
    sync();
  }
}
