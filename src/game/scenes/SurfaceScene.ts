import * as Phaser from "phaser";
import { TUNING } from "../tuning";
import { FIRST_LEG, LEGS, type LegConfig } from "../legs";
import { actions, isWorldPaused, POWER_TOOL_ID, runStore, TRACTION_TOOL_ID } from "../state/runStore";
import type { EncounterStep, RunState, SolarCondition, TractionStatus } from "../state/types";
import { stepPower } from "../systems/power";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { makeRockyPatches, makeVariedGround, wheelSpinAnim, wheelSpinTexture } from "../art";
import { audio } from "../audio/engine";

// Mars surface — one scene, rebuilt per leg from LEGS (Sojourner → Spirit → Opportunity).
// Encounter logic lives in runStore actions; this scene handles the world, input and timing.

// Updated player rover (Nov 14): clean 256×256 frames, no baked labels, no NASA logo.
const PLAYER_SCALE = 0.47; // ≈ 90 px wide side-on, same on-screen size as the previous art
/** How close (px) to the jump point's centre the rover must be to jump (the ring is 220×80). */
const JUMP_RADIUS = 120;
const PLAYER_FRAME = { width: 256, height: 256 };

type Dir = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

/**
 * Weather textures: a speck (soil kicked up when stuck), a seamless sheet of streaky haze that
 * scrolls across the screen with the wind, and a full-screen visibility vignette.
 */
function makeWeatherTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists("dust_px")) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xf2c48e, 1).fillRect(0, 0, 3, 3);
    g.generateTexture("dust_px", 3, 3);
    g.destroy();
  }
  if (!scene.textures.exists("haze_sheet")) {
    // Long, soft, wind-stretched wisps; each is drawn again one tile-width/height over, so the
    // texture tiles seamlessly in both directions.
    const w = 512;
    const h = 256;
    const tex = scene.textures.createCanvas("haze_sheet", w, h)!;
    const ctx = tex.getContext();
    const rng = mulberry32(2018); // the year of Opportunity's storm
    for (let i = 0; i < 26; i++) {
      const cx = rng() * w;
      const cy = rng() * h;
      const rx = 120 + rng() * 220;
      const ry = 18 + rng() * 46;
      const a = 0.12 + rng() * 0.22;
      for (const ox of [-w, 0, w])
        for (const oy of [-h, 0, h]) {
          ctx.save();
          ctx.translate(cx + ox, cy + oy);
          ctx.scale(1, ry / rx);
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
          grad.addColorStop(0, `rgba(255,255,255,${a})`);
          grad.addColorStop(0.55, `rgba(255,255,255,${a * 0.45})`);
          grad.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
          ctx.restore();
        }
    }
    tex.refresh();
  }
  if (!scene.textures.exists("storm_vignette")) {
    const w = 320;
    const h = 180;
    const tex = scene.textures.createCanvas("storm_vignette", w, h)!;
    const ctx = tex.getContext();
    ctx.save();
    ctx.scale(1, h / w);
    const grad = ctx.createRadialGradient(w / 2, w / 2, w * 0.18, w / 2, w / 2, w * 0.62);
    grad.addColorStop(0, "rgba(70,32,12,0)");
    grad.addColorStop(0.6, "rgba(90,42,16,0.55)");
    grad.addColorStop(1, "rgba(60,26,10,0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, w);
    ctx.restore();
    tex.refresh();
  }
}

/**
 * Screen rectangles (in 1280×720 game coordinates) of the React HUD panels marked
 * `data-hud-avoid`. Read live each frame so wrapped text, warnings and prompts are all covered.
 */
function hudRects(): { x: number; y: number; w: number; h: number }[] {
  const canvas = document.querySelector("canvas");
  if (!canvas) return [];
  const c = canvas.getBoundingClientRect();
  if (!c.width) return [];
  const k = GAME_WIDTH / c.width;
  return [...document.querySelectorAll<HTMLElement>("[data-hud-avoid]")].map((el) => {
    const r = el.getBoundingClientRect();
    return { x: (r.left - c.left) * k, y: (r.top - c.top) * k, w: r.width * k, h: r.height * k };
  });
}
// The updated sheet is labelled correctly (N = driving up the screen), so frames map 1:1.
// Each direction uses its wheel-spin spritesheet (frame 0 = wheels at rest; see art.ts).

// Historical rover art per leg (textures loaded by BootScene). Sojourner is drawn visibly smaller
// than the MER twins (design.md §4.2).
const HISTORIC: Record<string, { key: string; scale: number }> = {
  sojourner: { key: "hist_sojourner", scale: 0.3 },
  spirit: { key: "hist_spirit", scale: 0.5 }, // 286px game copy → ~143px on screen
  opportunity: { key: "hist_opportunity", scale: 0.3 },
};

// Weather overlay: same terrain, different sky (design.md §2.5). Storm stays navigable.
// Fix E1 (revised Nov 15): the storm is HAZE, not particles — sheets of airborne dust flowing
// across the screen with the wind, rolling dust clouds, gusts, dimmed sunlight and closing-in
// visibility. Each condition is a target; the scene eases toward it every frame, so storms build
// and clear instead of switching.
interface WeatherLook {
  haze: number; // ochre airborne-dust overlay
  dim: number; // sunlight blocked (dark overlay)
  vignette: number; // visibility closing in at the edges
  clouds: number; // opacity of the rolling dust clouds
  sheets: number; // opacity of the flowing haze sheets
  wind: number; // px/s the haze travels across the screen
  gust: number; // how strongly gusts swing everything (0–1)
}
const WEATHER: Record<SolarCondition | "severe", WeatherLook> = {
  clear: { haze: 0, dim: 0, vignette: 0, clouds: 0, sheets: 0, wind: 30, gust: 0 },
  dusty: { haze: 0.1, dim: 0.06, vignette: 0.18, clouds: 0.22, sheets: 0.3, wind: 60, gust: 0.25 },
  dust_storm: { haze: 0.2, dim: 0.16, vignette: 0.45, clouds: 0.5, sheets: 0.65, wind: 150, gust: 0.55 },
  severe: { haze: 0.3, dim: 0.3, vignette: 0.75, clouds: 0.78, sheets: 0.95, wind: 280, gust: 0.9 },
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SurfaceScene extends Phaser.Scene {
  private leg!: LegConfig;
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private edgeArrow!: Phaser.GameObjects.Graphics;
  private toolRing!: Phaser.GameObjects.Ellipse;
  private haze!: Phaser.GameObjects.Rectangle;
  private dim!: Phaser.GameObjects.Rectangle;
  private vignette!: Phaser.GameObjects.Image;
  /** Flowing haze: two scrolling sheets (far/slow, near/fast). */
  private hazeSheets: { sprite: Phaser.GameObjects.TileSprite; speed: number; base: number; phase: number; flow: number }[] = [];
  private churn!: Phaser.GameObjects.Particles.ParticleEmitter; // bright soil kicked up when stuck
  private dustClouds: { img: Phaser.GameObjects.Image; speed: number; base: number; phase: number; layer: number }[] = [];
  private weatherNow: WeatherLook = { ...WEATHER.clear };
  private weatherTarget: WeatherLook = { ...WEATHER.clear };
  private weatherClock = 0;
  private unsubscribe?: () => void;
  private runId = 0;
  private wasPaused = false;
  private stationarySeconds = 0;
  private coreSeconds = 0;
  // Opportunity's storm shutdown (team decision, Nov 15): seconds of play since the storm hit,
  // which scripted beats have run, and how long the rover has sat dead.
  private stormSeconds = 0;
  /** Opportunity: distance to the final checkpoint when the drive began, and time spent driving. */
  private checkpointStartDist = 0;
  private checkpointSeconds = 0;
  private coinsSpent = false;
  private offlineSeconds = 0;
  private signalSent = false;
  private sparkClock = 0;
  private deadClick = 0;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private powerDim!: Phaser.GameObjects.Rectangle;
  private facing: Dir = "N";
  private cinematicPan = false;
  /** Set by E's key-down event, consumed once by the next world update. */
  private ePressQueued = false;
  /** Craters placed on the ground; rocks keep clear of them. */
  private craterZones: { x: number; y: number; r: number; solid: boolean; w: number; h: number }[] = [];
  /** Rocky fields laid by buildGround (Nov 15); buildRocks puts boulders in them. */
  private rockFields: { x: number; y: number; r: number }[] = [];
  private shadow!: Phaser.GameObjects.Image;
  // Tire tracks (fix D3): a recycled pool of tread-mark stamps that fade out over time.
  private tracks: { img: Phaser.GameObjects.Image; born: number; alpha: number }[] = [];
  private trackPool: Phaser.GameObjects.Image[] = [];
  private trackClock = 0;
  private lastTrack: { x: number; y: number } | null = null;
  private jumpPoint: {
    glow: Phaser.GameObjects.Image;
    ring: Phaser.GameObjects.Ellipse;
    inner: Phaser.GameObjects.Ellipse;
    lamp: Phaser.GameObjects.Arc;
    beam: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    active: boolean;
  } | null = null;

  constructor() {
    super("Surface");
  }

  create() {
    const s = runStore.get();
    this.leg = LEGS[s.activeEncounterRover ?? FIRST_LEG];
    this.runId = s.runId;
    this.stationarySeconds = 0;
    this.coreSeconds = 0;
    this.stormSeconds = 0;
    this.checkpointStartDist = 0;
    this.checkpointSeconds = 0;
    this.coinsSpent = false;
    this.offlineSeconds = 0;
    this.signalSent = false;
    this.sparkClock = 0;
    this.deadClick = 0;
    this.wasPaused = false;
    this.cinematicPan = false;
    this.facing = "N";
    // The scene instance is reused across legs: reset per-leg collections here, not in initializers.
    this.craterZones = [];
    this.rockFields = [];
    this.tracks = [];
    this.trackPool = [];
    this.trackClock = 0;
    this.lastTrack = null;
    this.jumpPoint = null;
    const { world, spawn, target } = this.leg;

    this.physics.world.setBounds(0, 0, world.width, world.height);
    this.buildGround();
    if (this.leg.softSoil) this.buildSoftSoil();
    const obstacles = this.buildRocks();
    if (this.leg.checkpoint) this.buildJumpPoint(this.leg.checkpoint);

    // The abandoned rover for this leg, with a collider at its base.
    const hist = HISTORIC[this.leg.rover];
    const histImg = this.add.image(target.x, target.y, hist.key).setScale(hist.scale).setDepth(target.y);
    this.add
      .image(target.x, target.y + histImg.displayHeight * 0.36, "soft_shadow")
      .setDisplaySize(histImg.displayWidth * 0.9, histImg.displayWidth * 0.24)
      .setAlpha(0.55)
      .setDepth(target.y - 1);
    if (!this.leg.softSoil) {
      const base = this.add.zone(target.x, target.y + histImg.displayHeight * 0.2, histImg.displayWidth * 0.6, histImg.displayHeight * 0.3);
      obstacles.add(base);
    }

    // Player rover ("body" frames are cropped above the baked labels by BootScene).
    this.toolRing = this.add.ellipse(0, 0, 120, 44).setStrokeStyle(3, 0x68d7e9, 0.9).setVisible(false);
    this.player = this.physics.add.sprite(spawn.x, spawn.y, wheelSpinTexture("N"), 0);
    this.player.setScale(PLAYER_SCALE).setOrigin(0.5, 0.85).setCollideWorldBounds(true);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    // Collision footprint around the wheels (~60×33 px in the world, as before).
    body.setSize(128, 70).setOffset((PLAYER_FRAME.width - 128) / 2, PLAYER_FRAME.height - 96);
    this.physics.add.collider(this.player, obstacles);

    // Grounded shadow (fix D2): soft ellipse under the wheels, shaped to the facing, synced after
    // the physics step so it never lags the rover by a frame.
    this.shadow = this.add.image(spawn.x, spawn.y, "soft_shadow").setAlpha(0.75);
    this.syncShadow();
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncShadow, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncShadow, this));

    // Chapter mood + weather layers (screen-space).
    if (this.leg.tint) {
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, this.leg.tint.color, this.leg.tint.alpha).setOrigin(0).setScrollFactor(0).setDepth(9000);
    }
    this.buildWeatherLayer();
    // Storm damage: sparks off the solar panels, and the world dimming as the rover's power dies.
    this.sparks = this.add
      .particles(0, 0, "dust_px", {
        speed: { min: 60, max: 220 },
        angle: { min: 200, max: 340 },
        gravityY: 380,
        lifespan: { min: 250, max: 600 },
        alpha: { start: 1, end: 0 },
        scale: { min: 0.5, max: 1.1 },
        tint: [0xfff6c8, 0xffd36b, 0xffffff, 0xff9a3c],
        blendMode: Phaser.BlendModes.ADD,
        frequency: -1,
      })
      .setDepth(10_001);
    this.powerDim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05030a, 0).setOrigin(0).setScrollFactor(0).setDepth(9400);
    this.edgeArrow = this.add.graphics().setScrollFactor(0).setDepth(9500);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, world.width, world.height);
    cam.startFollow(this.player, true, 0.09, 0.09);
    cam.fadeIn(600, 0, 0, 0);

    // Letter keys are NOT captured, so typing in the Hub chat is never swallowed by Phaser.
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,E", false) as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    // Latch every E press (ignoring auto-repeat) so even a very quick tap is never missed.
    this.ePressQueued = false;
    this.keys.E.on(Phaser.Input.Keyboard.Events.DOWN, (_key: Phaser.Input.Keyboard.Key, event: KeyboardEvent) => {
      if (!event?.repeat) this.ePressQueued = true;
    });

    // Arriving by jump-cut: hold the travel card briefly, then hand control back.
    if (s.mode === "travel") {
      this.time.delayedCall(TUNING.travelCardMs, () => actions.arrivedAtLeg());
    }

    // A jump-cut changes the active leg → rebuild this scene for the next region.
    // (A new run remounts the whole game, so runId changes need no handling here.)
    this.unsubscribe = runStore.subscribe(() => {
      const now = runStore.get();
      if (now.stage === "surface" && now.activeEncounterRover !== this.leg.rover) this.scene.restart();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.());
  }

  // ---------- world building ----------

  private buildGround() {
    // "ground_mirror" (seamless mirrored tile) is generated once by BootScene.
    const { world, spawn, target, softSoil, rockSeed } = this.leg;
    // Fix D1 — break the "carpet". The mirrored 128 px tile's diamond motif is what repeats, so
    // it is laid at half strength over its own average colour (keeps the grain, loses the motif),
    // then much larger features go on top.
    this.add.rectangle(0, 0, world.width, world.height, 0xbf4a2f).setOrigin(0).setDepth(-10.5);
    // Nov 15: the four flat tiles blended in soft splats (no visible repeat, no grid seams).
    const groundKey = `ground_var_${this.leg.rover}`;
    // One 2048 px ground texture at a time: free the previous site's before building this one.
    for (const k of ["sojourner", "spirit", "opportunity"]) {
      const old = `ground_var_${k}`;
      if (old !== groundKey && this.textures.exists(old)) this.textures.remove(old);
    }
    makeVariedGround(this, groundKey, rockSeed * 131 + 5);
    makeRockyPatches(this);
    this.add.tileSprite(0, 0, world.width, world.height, groundKey).setOrigin(0).setDepth(-10).setAlpha(0.62);
    const rng = mulberry32(rockSeed * 31 + 7);
    const area = world.width * world.height;
    const rand = (a: number, b: number) => a + rng() * (b - a);

    // 1) Broad tonal patches (darker basalt-dust and paler sand), far bigger than the tile.
    for (let i = 0; i < Math.round(area / 150000); i++) {
      const dark = i % 2 === 0;
      const size = rand(260, 900);
      this.add
        .image(rand(0, world.width), rand(0, world.height), "soft_blob")
        .setDisplaySize(size, size * rand(0.5, 0.9))
        .setRotation(rand(-0.4, 0.4))
        .setTint(dark ? 0x5a2010 : 0xf0a070)
        .setAlpha(dark ? rand(0.16, 0.3) : rand(0.12, 0.22))
        .setDepth(-9.5);
    }

    // 2) Flat ground details (team art): craters and stone clusters. Kept off the spawn point,
    //    the rover being searched for, and the soft-soil core.
    const keepClear = (x: number, y: number, r: number) =>
      Phaser.Math.Distance.Between(x, y, spawn.x, spawn.y) < 170 + r ||
      Phaser.Math.Distance.Between(x, y, target.x, target.y) < 230 + r ||
      (!!softSoil && Phaser.Math.Distance.Between(x, y, softSoil.x, softSoil.y) < softSoil.coreRadius + r) ||
      (!!this.leg.checkpoint && Phaser.Math.Distance.Between(x, y, this.leg.checkpoint.x, this.leg.checkpoint.y) < 150 + r) ||
      this.craterZones.some((c) => Phaser.Math.Distance.Between(x, y, c.x, c.y) < c.r + r + 40);
    // Distance from the straight spawn→target route, so the big crater sits off the main path.
    const offRoute = (x: number, y: number) => {
      const dx = target.x - spawn.x;
      const dy = target.y - spawn.y;
      const t = Phaser.Math.Clamp(((x - spawn.x) * dx + (y - spawn.y) * dy) / (dx * dx + dy * dy), 0, 1);
      return Phaser.Math.Distance.Between(x, y, spawn.x + dx * t, spawn.y + dy * t);
    };
    const craters: [string, number, number, number][] = [
      // key, how many, min scale, max scale
      ["large_crater", 1, 0.6, 0.8],
      ["medium_crater", Math.max(2, Math.round(area / 1800000)), 0.55, 0.9],
      ["small_crater", Math.round(area / 380000), 0.45, 0.85],
    ];
    for (const [key, count, s0, s1] of craters) {
      let placed = 0;
      for (let tries = 0; placed < count && tries < 300; tries++) {
        const scale = rand(s0, s1);
        const img = this.textures.get(key).getSourceImage() as HTMLImageElement;
        const r = (img.width * scale) / 2;
        const x = rand(r + 40, world.width - r - 40);
        const y = rand(r + 40, world.height - r - 40);
        if (keepClear(x, y, r)) continue;
        if (key === "large_crater" && offRoute(x, y) < r + 220) continue;
        if (key === "medium_crater" && offRoute(x, y) < r + 80) continue; // solid now: keep the way clear
        this.add.image(x, y, key).setScale(scale).setFlipX(rng() > 0.5).setDepth(-8);
        // Large and medium craters are solid (the rover drives around them); small ones are pockmarks.
        this.craterZones.push({ x, y, r, solid: key !== "small_crater", w: img.width * scale, h: img.height * scale });
        placed++;
      }
    }
    const { fields, craterClusters } = this.leg.terrain;

    // 3) Crater clusters: a few small craters pocked close together (non-solid, like the rest
    //    of the small craters).
    const small = this.textures.get("small_crater").getSourceImage() as HTMLImageElement;
    for (let c = 0, tries = 0; c < craterClusters && tries < 300; tries++) {
      const cx = rand(200, world.width - 200);
      const cy = rand(200, world.height - 200);
      if (keepClear(cx, cy, 120)) continue;
      const n = 3 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        const scale = rand(0.3, 0.62);
        const r = (small.width * scale) / 2;
        const x = cx + (rng() - 0.5) * 220;
        const y = cy + (rng() - 0.5) * 140;
        if (this.craterZones.some((z) => Phaser.Math.Distance.Between(x, y, z.x, z.y) < z.r + r + 6)) continue;
        this.add.image(x, y, "small_crater").setScale(scale).setFlipX(rng() > 0.5).setDepth(-8);
        this.craterZones.push({ x, y, r, solid: false, w: small.width * scale, h: small.height * scale });
      }
      c++;
    }

    // 4) Rocky fields (Nov 15): instead of single stone clusters scattered evenly, rocks gather
    //    into fields: a soft patch of rocky ground packed with stone clusters, densest in the
    //    middle and thinning out at the edges. buildRocks() adds a few solid boulders to each.
    const stones = ["stone_cluster_1", "stone_cluster_2", "stone_cluster_3", "stone_cluster_4"];
    this.rockFields = [];
    for (let f = 0, tries = 0; f < fields && tries < 600; tries++) {
      const R = rand(120, 250);
      const x = rand(R + 60, world.width - R - 60);
      const y = rand(R * 0.7 + 60, world.height - R * 0.7 - 60);
      if (keepClear(x, y, R * 0.8)) continue;
      if (this.rockFields.some((o) => Phaser.Math.Distance.Between(x, y, o.x, o.y) < o.r + R + 60)) continue;
      this.add
        .image(x, y, `rocky_patch_${Math.floor(rng() * 4)}`)
        .setDisplaySize(R * 3.3, R * 2.3)
        .setRotation(rand(-0.25, 0.25))
        .setFlipX(rng() > 0.5)
        .setDepth(-9.6);
      const n = Math.round(R / 4.2);
      for (let k = 0; k < n; k++) {
        // Bias toward the middle: denser core, sparse fringe.
        const d = Math.pow(rng(), 0.75);
        const a = rng() * Math.PI * 2;
        const sx = x + Math.cos(a) * d * R * 1.15;
        const sy = y + Math.sin(a) * d * R * 0.72;
        this.add
          .image(sx, sy, stones[Math.floor(rng() * stones.length)])
          .setScale(rand(0.75, 1.35) * (1.25 - d * 0.5))
          .setFlipX(rng() > 0.5)
          .setAngle(rand(-20, 20))
          .setDepth(-8);
      }
      // Small loose rocks among the stones (decoration only; the rover rolls over them).
      for (let k = 0, m = Math.round(R / 22); k < m; k++) {
        const d = Math.pow(rng(), 0.8);
        const a = rng() * Math.PI * 2;
        const rx = x + Math.cos(a) * d * R * 1.05;
        const ry = y + Math.sin(a) * d * R * 0.66;
        this.add
          .image(rx, ry, ["rock_medium_1", "rock_medium_2", "rock_large_1", "rock_large_2"][Math.floor(rng() * 4)])
          .setScale(rand(0.14, 0.26))
          .setOrigin(0.5, 0.8)
          .setFlipX(rng() > 0.5)
          .setDepth(ry - 40);
      }
      this.rockFields.push({ x, y, r: R });
      f++;
    }

    // A light sprinkle of loose stones between the fields.
    for (let i = 0, placed = 0; placed < Math.round(area / 220000) && i < 1000; i++) {
      const x = rand(30, world.width - 30);
      const y = rand(30, world.height - 30);
      if (keepClear(x, y, 20)) continue;
      this.add
        .image(x, y, stones[Math.floor(rng() * stones.length)])
        .setScale(rand(0.5, 0.9))
        .setFlipX(rng() > 0.5)
        .setAlpha(rand(0.6, 0.85))
        .setDepth(-8);
      placed++;
    }
  }

  /**
   * Jump point (Phase H): a relay beacon a short drive from the rover you've just visited. It's
   * dim until the leg is complete, then lights up — a pulsing landing ring and a beam of light —
   * and the guidance arrow points to it. Inside the ring the player may choose to jump.
   */
  private buildJumpPoint(cp: { x: number; y: number }) {
    if (!this.textures.exists("jump_beam")) {
      const tex = this.textures.createCanvas("jump_beam", 48, 320)!;
      const ctx = tex.getContext();
      const v = ctx.createLinearGradient(0, 0, 0, 320);
      v.addColorStop(0, "rgba(104,215,233,0)");
      v.addColorStop(0.7, "rgba(104,215,233,0.55)");
      v.addColorStop(1, "rgba(180,240,250,0.9)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, 48, 320);
      // soften the sides
      const h = ctx.createLinearGradient(0, 0, 48, 0);
      h.addColorStop(0, "rgba(0,0,0,1)");
      h.addColorStop(0.35, "rgba(0,0,0,0)");
      h.addColorStop(0.65, "rgba(0,0,0,0)");
      h.addColorStop(1, "rgba(0,0,0,1)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = h;
      ctx.fillRect(0, 0, 48, 320);
      tex.refresh();
    }
    const glow = this.add.image(cp.x, cp.y, "soft_blob").setDisplaySize(260, 96).setTint(0x68d7e9).setAlpha(0.12).setDepth(-3);
    const ring = this.add.ellipse(cp.x, cp.y, 220, 80).setStrokeStyle(3, 0x68d7e9, 1).setAlpha(0.3).setDepth(-3);
    const inner = this.add.ellipse(cp.x, cp.y, 130, 46).setStrokeStyle(2, 0x68d7e9, 0.8).setAlpha(0.25).setDepth(-3);
    const mast = this.add.graphics().setDepth(cp.y - 1);
    mast.fillStyle(0x3a3f48, 1).fillRect(cp.x + 92, cp.y - 70, 4, 70); // relay mast at the ring's edge
    mast.fillStyle(0x8b939e, 1).fillRect(cp.x + 86, cp.y - 74, 16, 6);
    const lamp = this.add.circle(cp.x + 94, cp.y - 78, 4, 0x68d7e9).setDepth(cp.y).setAlpha(0.4);
    const beam = this.add.image(cp.x, cp.y + 6, "jump_beam").setOrigin(0.5, 1).setDisplaySize(90, 300).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(cp.y + 1);
    const label = this.add
      .text(cp.x, cp.y - 112, this.leg.next ? "JUMP POINT" : "CHECKPOINT", { fontFamily: "monospace", fontSize: "15px", color: "#9fe8f4", stroke: "#06101d", strokeThickness: 4 })
      .setOrigin(0.5)
      .setLetterSpacing(3)
      .setAlpha(0)
      .setDepth(cp.y + 2);
    this.jumpPoint = { glow, ring, inner, lamp, beam, label, active: false };
  }

  private setJumpPointActive(on: boolean) {
    const j = this.jumpPoint;
    if (!j || j.active === on) return;
    j.active = on;
    this.tweens.killTweensOf([j.ring, j.inner, j.beam, j.lamp, j.glow, j.label]);
    if (!on) return;
    // Light up: pulsing rings, a soft beam, a blinking relay lamp.
    this.tweens.add({ targets: [j.ring, j.inner], alpha: 1, duration: 600 });
    this.tweens.add({ targets: j.ring, scaleX: 1.08, scaleY: 1.08, yoyo: true, repeat: -1, duration: 900, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: j.glow, alpha: 0.45, duration: 600 });
    this.tweens.add({ targets: j.beam, alpha: { from: 0.35, to: 0.75 }, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: j.lamp, alpha: { from: 0.3, to: 1 }, yoyo: true, repeat: -1, duration: 450 });
    this.tweens.add({ targets: j.label, alpha: 1, duration: 600 });
  }

  /** Keeps the rover's shadow under its wheels, sized for the current facing (fix D2). */
  private syncShadow() {
    if (!this.player || !this.shadow) return;
    const side = this.facing === "E" || this.facing === "W";
    const end = this.facing === "N" || this.facing === "S";
    const [w, h] = side ? [124, 30] : end ? [86, 34] : [106, 34];
    this.shadow.setPosition(this.player.x, this.player.y - 3).setDisplaySize(w, h).setDepth(this.player.depth - 0.5);
  }

  /** Stamps a pair of fading tread marks behind the rover as it drives (fix D3). */
  private updateTracks(dt: number, inSoil: boolean) {
    this.trackClock += dt;
    const LIFE = 9; // seconds a track stays visible
    // fade + recycle
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const t = this.tracks[i];
      const age = this.trackClock - t.born;
      if (age >= LIFE) {
        t.img.setVisible(false);
        this.trackPool.push(t.img);
        this.tracks.splice(i, 1);
      } else {
        t.img.setAlpha(t.alpha * (1 - age / LIFE));
      }
    }
    const x = this.player.x;
    const y = this.player.y - 3;
    if (!this.lastTrack) {
      this.lastTrack = { x, y };
      return;
    }
    const dx = x - this.lastTrack.x;
    const dy = y - this.lastTrack.y;
    if (dx * dx + dy * dy < 9 * 9) return;
    const a = Math.atan2(dy, dx);
    // Left/right wheel lines: wide apart when driving up/down the screen, close together (the
    // view is foreshortened) when driving across it.
    const ox = -Math.sin(a) * 24;
    const oy = Math.cos(a) * 8;
    const alpha = inSoil ? 0.7 : 0.42; // soft soil takes deeper, darker ruts
    for (const sgn of [-1, 1]) {
      const img = this.trackPool.pop() ?? this.add.image(0, 0, "track_dash").setDepth(-4);
      img.setPosition(x + ox * sgn, y + oy * sgn).setRotation(a).setVisible(true).setAlpha(alpha);
      this.tracks.push({ img, born: this.trackClock, alpha });
    }
    this.lastTrack = { x, y };
  }

  private buildSoftSoil() {
    // Fix E2 — Martian soft soil, not beach sand: a wind-drift patch of fine ochre dust covered in
    // parallel aeolian ripples, with a darker, churned core where wheels sink. Still visually
    // distinct before entry (design.md §2.2) and never mud-like (rules §1).
    const soil = this.leg.softSoil!;
    const rng = mulberry32(7);
    const R = soil.outerRadius;

    // 1) Drift body: overlapping soft blobs, slightly more orange and paler than the plain.
    for (let i = 0; i < 16; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * (R - 160);
      const size = 260 + rng() * 260;
      this.add
        .image(soil.x + Math.cos(a) * r, soil.y + Math.sin(a) * r, "soft_blob")
        .setDisplaySize(size, size * (0.6 + rng() * 0.3))
        .setTint(rng() > 0.4 ? 0xdc8a52 : 0xe6a26a)
        .setAlpha(0.32)
        .setDepth(-6);
    }
    // Darker, churned core (where the rover bogs down).
    for (let i = 0; i < 6; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * (soil.coreRadius * 0.45);
      const size = soil.coreRadius * (1 + rng() * 0.6);
      this.add
        .image(soil.x + Math.cos(a) * r, soil.y + Math.sin(a) * r, "soft_blob")
        .setDisplaySize(size, size * 0.75)
        .setTint(0x8f4426)
        .setAlpha(0.22)
        .setDepth(-6);
    }

    // 2) Aeolian ripples: wavy crests every ~15 px across the patch, a dark shadow line with a
    //    sunlit edge beside it, fading out toward the patch edge (ragged, not a perfect circle).
    //    ~10k segments, so they're drawn ONCE into a texture (a live Graphics would redraw them
    //    every frame). Local coordinates: the patch centre is (R, R) in a 2R × 2R texture.
    const key = `soil_ripples_${this.leg.rover}`;
    if (!this.textures.exists(key)) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      const dir = -0.35; // ripple crests run at a slight angle (wind from the west-north-west)
      const ux = Math.cos(dir);
      const uy = Math.sin(dir);
      const nx = -uy;
      const ny = ux;
      const edge = (x: number, y: number) => {
        const d = Phaser.Math.Distance.Between(x, y, R, R);
        const wob = 0.85 + 0.15 * Math.sin(Math.atan2(y - R, x - R) * 5 + 1.7);
        return Phaser.Math.Clamp(1 - Math.pow(d / (R * wob), 2.2), 0, 1);
      };
      for (let k = -R; k <= R; k += 15) {
        const phase = rng() * 6.28;
        let prev: { x: number; y: number } | null = null;
        for (let s = -R; s <= R; s += 8) {
          const off = Math.sin(s * 0.035 + phase) * 4 + Math.sin(s * 0.011 + phase * 2) * 6;
          const x = R + ux * s + nx * (k + off);
          const y = R + uy * s + ny * (k + off);
          const f = edge(x, y);
          if (prev && f > 0.02) {
            const core = Phaser.Math.Distance.Between(x, y, R, R) < soil.coreRadius;
            g.lineStyle(2, core ? 0x5e2814 : 0x7a3a1e, 0.42 * f).lineBetween(prev.x, prev.y, x, y);
            g.lineStyle(1.5, 0xf0b07a, 0.3 * f).lineBetween(prev.x - nx * 3, prev.y - ny * 3, x - nx * 3, y - ny * 3);
          }
          prev = { x, y };
        }
      }
      g.generateTexture(key, R * 2, R * 2);
      g.destroy();
    }
    this.add.image(soil.x, soil.y, key).setDepth(-5);
  }

  private buildRocks() {
    const { world, spawn, target, softSoil, rockSeed } = this.leg;
    const rng = mulberry32(rockSeed);
    const group = this.physics.add.staticGroup();
    const kinds = ["rock_large_1", "rock_large_2", "rock_medium_1", "rock_medium_2"];
    const clearRadius = softSoil ? softSoil.outerRadius + 140 : 380;
    const clearCenter = softSoil ?? target;
    const count = Math.round((world.width * world.height) / 160000);
    let placed = 0;
    for (let tries = 0; placed < count && tries < 2000; tries++) {
      const x = 80 + rng() * (world.width - 160);
      const y = 80 + rng() * (world.height - 160);
      if (Phaser.Math.Distance.Between(x, y, spawn.x, spawn.y) < 360) continue;
      if (Phaser.Math.Distance.Between(x, y, clearCenter.x, clearCenter.y) < clearRadius) continue;
      if (this.craterZones.some((c) => Phaser.Math.Distance.Between(x, y, c.x, c.y) < c.r + 50)) continue;
      const cp = this.leg.checkpoint;
      if (cp && Phaser.Math.Distance.Between(x, y, cp.x, cp.y) < 260) continue; // keep the jump point open
      const kind = kinds[Math.floor(rng() * kinds.length)];
      const scale = 0.45 + rng() * 0.35;
      const img = this.add.image(x, y, kind).setScale(scale).setOrigin(0.5, 0.8).setDepth(y);
      // Collide only with the rock's base, not its full drawn bounds (design.md §4.4).
      const w = img.displayWidth * 0.7;
      const h = img.displayHeight * 0.35;
      group.add(this.add.zone(x, y - h * 0.3, w, h));
      placed++;
    }

    // Solid craters: the bowl (inside the rim) is blocked with a row of circles that trace the
    // crater's flattened ellipse — the rover bumps the rim and slides around it.
    for (const c of this.craterZones) {
      if (!c.solid) continue;
      const a = c.w * 0.4; // half-width of the blocked bowl
      const b = c.h * 0.36; // half-height
      const n = Math.max(1, Math.ceil(a / b));
      for (let i = 0; i < n; i++) {
        const ox = n === 1 ? 0 : -a + b + ((2 * (a - b)) / (n - 1)) * i;
        const z = this.add.zone(c.x + ox, c.y, b * 2, b * 2);
        group.add(z);
        (z.body as Phaser.Physics.Arcade.StaticBody).setCircle(b);
      }
    }

    // A few solid boulders sitting in each rocky field (medium and large, as at Ares Vallis).
    const per = this.leg.terrain.fieldBoulders;
    for (const f of this.rockFields) {
      for (let k = 0; k < per; k++) {
        const a = rng() * Math.PI * 2;
        const d = rng() * 0.6;
        const x = f.x + Math.cos(a) * d * f.r;
        const y = f.y + Math.sin(a) * d * f.r * 0.6;
        if (Phaser.Math.Distance.Between(x, y, spawn.x, spawn.y) < 300) continue;
        if (this.leg.checkpoint && Phaser.Math.Distance.Between(x, y, this.leg.checkpoint.x, this.leg.checkpoint.y) < 240) continue;
        const kind = kinds[Math.floor(rng() * kinds.length)];
        const img = this.add.image(x, y, kind).setScale(0.4 + rng() * 0.32).setOrigin(0.5, 0.8).setFlipX(rng() > 0.5).setDepth(y);
        const w = img.displayWidth * 0.7;
        const h = img.displayHeight * 0.35;
        group.add(this.add.zone(x, y - h * 0.3, w, h));
      }
    }

    if (this.leg.rockFormations) this.buildFormations(group, this.leg.rockFormations);
    if (this.leg.terrain.routeFormations) this.buildRouteFormations(group, this.leg.terrain.routeFormations);
    return group;
  }

  /**
   * Spirit (Nov 15): wide and tall rock formations in two loose rows either side of the drive
   * from the landing spot toward Spirit, like the walls of a shallow valley pointing the way.
   * Kept off the spawn, the soft-soil trap, the jump point and the drive from Spirit to it.
   */
  private buildRouteFormations(group: Phaser.Physics.Arcade.StaticGroup, count: number) {
    const { spawn, target, softSoil, world } = this.leg;
    const cp = this.leg.checkpoint;
    const rng = mulberry32(this.leg.rockSeed * 13 + 1);
    const rand = (lo: number, hi: number) => lo + rng() * (hi - lo);
    const dx = target.x - spawn.x;
    const dy = target.y - spawn.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const distToSeg = (px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }) => {
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const t = Phaser.Math.Clamp(((px - a.x) * vx + (py - a.y) * vy) / (vx * vx + vy * vy), 0, 1);
      return Phaser.Math.Distance.Between(px, py, a.x + vx * t, a.y + vy * t);
    };
    const kinds = [
      { key: "wide_rock_formation_1", scale: [0.5, 0.72] },
      { key: "tall_rock_formation_1", scale: [0.42, 0.58] },
    ] as const;
    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const t = 0.1 + (0.72 * (i + rng() * 0.6)) / count;
        const side = i % 2 === 0 ? 1 : -1;
        const off = rand(250, 360) * side;
        const x = spawn.x + ux * len * t - uy * off;
        const y = spawn.y + uy * len * t + ux * off;
        const kind = kinds[(i + attempt) % kinds.length];
        const scale = rand(kind.scale[0], kind.scale[1]);
        const tex = this.textures.get(kind.key).getSourceImage() as HTMLImageElement;
        const w = tex.width * scale;
        const r = w / 2;
        if (x < r + 80 || x > world.width - r - 80 || y < 220 || y > world.height - 100) continue;
        if (Phaser.Math.Distance.Between(x, y, spawn.x, spawn.y) < 360 + r) continue;
        if (softSoil && Phaser.Math.Distance.Between(x, y, softSoil.x, softSoil.y) < softSoil.outerRadius + 160 + r) continue;
        if (cp && Phaser.Math.Distance.Between(x, y, cp.x, cp.y) < 300 + r) continue;
        if (cp && distToSeg(x, y, target, cp) < 160 + r) continue;
        if (this.craterZones.some((c) => c.solid && Phaser.Math.Distance.Between(x, y, c.x, c.y) < c.r + r + 50)) continue;
        const img = this.add.image(x, y, kind.key).setOrigin(0.5, 0.97).setScale(scale).setFlipX(rng() > 0.5).setDepth(y);
        this.add.image(x, y - 4, "soft_shadow").setDisplaySize(w * 0.95, w * 0.22).setAlpha(0.45).setDepth(y - 1);
        group.add(this.add.zone(x, y - img.displayHeight * 0.1, w * 0.8, img.displayHeight * 0.2));
        break;
      }
    }
  }

  /**
   * Rocky terrain (Sojourner's Ares Vallis is a boulder-strewn flood plain): large rock-formation
   * sprites (team art) and tight clusters of boulders, all solid, kept off the spawn, the rover,
   * the jump point and the craters. Collision covers each formation's base only.
   */
  private buildFormations(group: Phaser.Physics.Arcade.StaticGroup, spec: { formations: number; clusters: number }) {
    const { world, spawn, target } = this.leg;
    const cp = this.leg.checkpoint;
    const rng = mulberry32(this.leg.rockSeed * 7 + 3);
    const rand = (lo: number, hi: number) => lo + rng() * (hi - lo);
    const taken: { x: number; y: number; r: number }[] = [];
    const free = (x: number, y: number, r: number) =>
      Phaser.Math.Distance.Between(x, y, spawn.x, spawn.y) > 380 + r &&
      Phaser.Math.Distance.Between(x, y, target.x, target.y) > 360 + r &&
      (!cp || Phaser.Math.Distance.Between(x, y, cp.x, cp.y) > 300 + r) &&
      !this.craterZones.some((c) => Phaser.Math.Distance.Between(x, y, c.x, c.y) < c.r + r + 60) &&
      !taken.some((t) => Phaser.Math.Distance.Between(x, y, t.x, t.y) < t.r + r + 140);

    // 1) Rock formations: tall spires and wide boulder piles.
    const kinds = [
      { key: "tall_rock_formation_1", scale: [0.42, 0.6] },
      { key: "wide_rock_formation_1", scale: [0.5, 0.75] },
    ] as const;
    for (let i = 0, placed = 0; placed < spec.formations && i < 600; i++) {
      const kind = kinds[placed % kinds.length];
      const scale = rand(kind.scale[0], kind.scale[1]);
      const tex = this.textures.get(kind.key).getSourceImage() as HTMLImageElement;
      const w = tex.width * scale;
      const r = w / 2;
      const x = rand(120 + r, world.width - 120 - r);
      const y = rand(200, world.height - 120);
      if (!free(x, y, r)) continue;
      const img = this.add.image(x, y, kind.key).setOrigin(0.5, 0.97).setScale(scale).setFlipX(rng() > 0.5).setDepth(y);
      this.add.image(x, y - 4, "soft_shadow").setDisplaySize(w * 0.95, w * 0.22).setAlpha(0.45).setDepth(y - 1);
      group.add(this.add.zone(x, y - img.displayHeight * 0.1, w * 0.8, img.displayHeight * 0.2));
      taken.push({ x, y, r });
      placed++;
    }

    // 2) Boulder clusters: 3–6 rocks packed together.
    const rocks = ["rock_large_1", "rock_large_2", "rock_medium_1", "rock_medium_2"];
    for (let i = 0, placed = 0; placed < spec.clusters && i < 600; i++) {
      const cx = rand(150, world.width - 150);
      const cy = rand(150, world.height - 150);
      if (!free(cx, cy, 90)) continue;
      const n = 3 + Math.floor(rng() * 4);
      for (let k = 0; k < n; k++) {
        const ang = rng() * Math.PI * 2;
        const dist = rng() * 70;
        const x = cx + Math.cos(ang) * dist;
        const y = cy + Math.sin(ang) * dist * 0.6;
        const img = this.add
          .image(x, y, rocks[Math.floor(rng() * rocks.length)])
          .setScale(rand(0.32, 0.62))
          .setOrigin(0.5, 0.8)
          .setFlipX(rng() > 0.5)
          .setDepth(y);
        const w = img.displayWidth * 0.7;
        const h = img.displayHeight * 0.35;
        group.add(this.add.zone(x, y - h * 0.3, w, h));
      }
      taken.push({ x: cx, y: cy, r: 90 });
      placed++;
    }
  }

  private buildWeatherLayer() {
    makeWeatherTextures(this);
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const rng = mulberry32(this.leg.rockSeed + 99);
    this.weatherNow = { ...WEATHER.clear };
    this.weatherTarget = { ...WEATHER.clear };
    this.weatherClock = 0;

    // Rolling dust clouds, two parallax layers (screen-space), drawn under the haze.
    this.dustClouds = [];
    for (let i = 0; i < 12; i++) {
      const layer = i < 6 ? 0 : 1; // 0 = far/slow/broad, 1 = near/fast/denser
      const w = layer ? 700 + rng() * 600 : 900 + rng() * 700;
      const img = this.add
        .image(rng() * (W + w) - w / 2, rng() * H, "soft_blob")
        .setDisplaySize(w, w * (0.35 + rng() * 0.25))
        .setTint(rng() > 0.5 ? 0xb8692f : 0xd49456)
        .setAlpha(0)
        .setScrollFactor(0)
        .setDepth(layer ? 9150 : 9050);
      this.dustClouds.push({ img, speed: layer ? 1.35 + rng() * 0.5 : 0.6 + rng() * 0.3, base: layer ? 1 : 0.7, phase: rng() * 6.28, layer });
    }
    this.dim = this.add.rectangle(0, 0, W, H, 0x2a1206, 0).setOrigin(0).setScrollFactor(0).setDepth(9080);
    this.haze = this.add.rectangle(0, 0, W, H, 0xc8803c, 0).setOrigin(0).setScrollFactor(0).setDepth(9100);
    this.vignette = this.add.image(0, 0, "storm_vignette").setOrigin(0).setDisplaySize(W, H).setAlpha(0).setScrollFactor(0).setDepth(9300);

    // Flowing haze: two seamless sheets of streaky airborne dust drifting across the screen with
    // the wind — a broad, slow far layer and a finer, faster near one (parallax). No particles.
    this.hazeSheets = [
      { scale: 2.4, depth: 9060, tint: 0xc27a3e, speed: 0.55, base: 0.8, phase: 0 },
      { scale: 1.5, depth: 9160, tint: 0xe0a466, speed: 1.15, base: 0.6, phase: 2.1 },
    ].map((l) => ({
      sprite: this.add
        .tileSprite(0, 0, W, H, "haze_sheet")
        .setOrigin(0)
        .setTileScale(l.scale, l.scale * 1.15)
        .setTint(l.tint)
        .setAlpha(0)
        .setScrollFactor(0)
        .setDepth(l.depth),
      speed: l.speed,
      base: l.base,
      phase: l.phase,
      flow: 0,
    }));
    // Stuck in soft soil: spinning wheels churn up bright, pale soil (as Spirit's did at Troy).
    this.churn = this.add
      .particles(0, 0, "dust_px", {
        speed: { min: 40, max: 130 },
        angle: { min: 200, max: 340 },
        gravityY: 260,
        lifespan: 700,
        alpha: { start: 0.95, end: 0 },
        scale: { min: 0.6, max: 1.3 },
        tint: [0xf3e6b8, 0xe9d49a, 0xfaf0d2, 0xc98a5a],
        frequency: -1,
      })
      .setDepth(10_000);
  }

  /** Pick the target look for the solar condition that drives charging (design.md §2.5). */
  private applyWeather(s: RunState) {
    if (s.severeStorm) {
      // The storm hits after Continue, and it never lets up.
      this.weatherTarget = WEATHER.severe;
    } else {
      this.weatherTarget = WEATHER[s.solarCondition];
    }
  }

  /** Ease toward the target look and animate clouds, gusts and particles (runs every frame). */
  private tickWeather(dtMs: number) {
    const dt = Math.min(dtMs, 50) / 1000;
    this.weatherClock += dt;
    const now = this.weatherNow;
    const target = this.weatherTarget;
    const ease = 1 - Math.exp(-dt / 1.4); // ~1.4 s time constant: storms build, they don't snap
    for (const k of Object.keys(now) as (keyof WeatherLook)[]) now[k] += (target[k] - now[k]) * ease;

    // Gusts: overlapping slow waves plus the odd sharp burst; 1 = average air.
    const t = this.weatherClock;
    const wave = 0.5 * Math.sin(t * 0.7) + 0.3 * Math.sin(t * 1.9 + 1.3) + 0.2 * Math.sin(t * 4.3 + 0.4);
    const burst = Math.max(0, Math.sin(t * 0.37 + 2) - 0.82) * 4; // brief spikes every ~17 s
    const gust = 1 + now.gust * (0.35 * wave + burst);

    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.haze.setFillStyle(0xc8803c, Phaser.Math.Clamp(now.haze * (0.85 + 0.25 * gust), 0, 0.6));
    this.dim.setFillStyle(0x2a1206, now.dim);
    this.vignette.setAlpha(Phaser.Math.Clamp(now.vignette * (0.9 + 0.15 * gust), 0, 1));
    for (const c of this.dustClouds) {
      const img = c.img;
      img.x += now.wind * c.speed * gust * dt;
      img.y += Math.sin(t * 0.8 + c.phase) * 14 * dt; // slow billow up and down
      if (img.x - img.displayWidth / 2 > W) {
        img.x = -img.displayWidth / 2;
        img.y = Math.random() * H;
      }
      const billow = 0.7 + 0.3 * Math.sin(t * 0.55 + c.phase * 2);
      img.setAlpha(Phaser.Math.Clamp(now.clouds * c.base * billow * (0.8 + 0.3 * gust), 0, 0.9));
    }

    // Haze sheets flow left → right with the wind (gusts speed them up and thicken them), plus
    // a little parallax with the camera so the air feels like it's between you and the ground.
    const cam = this.cameras.main;
    for (const s of this.hazeSheets) {
      s.flow += now.wind * s.speed * gust * dt;
      const sprite = s.sprite;
      sprite.tilePositionX = (-s.flow + cam.scrollX * 0.35 * s.speed) / sprite.tileScaleX;
      sprite.tilePositionY = (cam.scrollY * 0.35 * s.speed + Math.sin(t * 0.3 + s.phase) * 18) / sprite.tileScaleY;
      const breathe = 0.85 + 0.15 * Math.sin(t * 0.45 + s.phase);
      sprite.setAlpha(Phaser.Math.Clamp(now.sheets * s.base * breathe * (0.85 + 0.25 * gust), 0, 1));
    }
    // Severe gusts nudge the camera a little.
    if (now.gust > 0.7 && burst > 0.25 && !this.cameras.main.shakeEffect.isRunning) {
      this.cameras.main.shake(400, 0.0018);
    }
  }

  // ---------- frame loop ----------

  update(_time: number, deltaMs: number) {
    const s = runStore.get();
    const paused = isWorldPaused(s);

    this.updateCinematicCamera(s);
    this.applyWeather(s);
    this.tickWeather(deltaMs);

    if (paused) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop(); // wheels rest while the hub/dialogue/pause is open
      this.ePressQueued = false; // an E pressed in a menu never acts on the world afterwards
      if (!this.wasPaused) this.physics.world.pause();
      this.wasPaused = true;
      this.edgeArrow.clear();
      return;
    }
    if (this.wasPaused) {
      // Resume exactly once and drop keys held while the overlay was open (rules §4).
      this.physics.world.resume();
      this.input.keyboard!.resetKeys();
      this.wasPaused = false;
    }

    const dt = Math.min(deltaMs, 50) / 1000; // cap spikes so a hitch never dumps time into power
    const leg = this.leg;

    // ---- input ----
    const k = this.keys;
    let ix = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let iy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const throttle = ix !== 0 || iy !== 0;
    if (ix && iy) {
      ix *= Math.SQRT1_2;
      iy *= Math.SQRT1_2;
    }

    // ---- Opportunity: the storm hits after Continue, and the rover doesn't make it ----
    if (s.severeStorm) {
      this.updateStorm(s, dt, throttle);
      return;
    }

    const px = this.player.x;
    const py = this.player.y;
    let step: EncounterStep = s.encounterStep;
    let speedFactor = 1;
    let traction: TractionStatus = "normal";
    let inSoil = false;

    // ---- Spirit: soft soil ----
    if (leg.softSoil) {
      const soilDist = Phaser.Math.Distance.Between(px, py, leg.softSoil.x, leg.softSoil.y);
      inSoil = soilDist < leg.softSoil.outerRadius;
      const inCore = soilDist < leg.softSoil.coreRadius;
      if (s.toolEngaged && inSoil) {
        speedFactor = TUNING.tractionModeSpeedFactor;
        traction = "reduced";
      } else if (step === "hazard" || step === "discovered" || (step === "tool_unlocked" && inCore)) {
        speedFactor = 0;
        traction = "stuck";
      } else if (inCore && step === "approach") {
        this.coreSeconds += dt;
        speedFactor = TUNING.softSoilSpeedFactor * 0.6;
        traction = "reduced";
        if (this.coreSeconds >= TUNING.sinkSeconds) {
          step = "hazard";
          speedFactor = 0;
          traction = "stuck";
        }
      } else if (inSoil) {
        speedFactor = TUNING.softSoilSpeedFactor;
        traction = "reduced";
      }
      if (!inCore) this.coreSeconds = 0;
    }

    if (s.outOfPower) speedFactor = 0;

    // ---- movement + soft boundary redirect ----
    let vx = ix * TUNING.driveSpeed * speedFactor;
    let vy = iy * TUNING.driveSpeed * speedFactor;
    let boundaryWarning = false;
    const m = TUNING.boundaryMargin;
    if ((px < m && vx < 0) || (px > leg.world.width - m && vx > 0)) {
      vx = -Math.sign(vx) * TUNING.driveSpeed * 0.5;
      boundaryWarning = true;
    }
    if ((py < m && vy < 0) || (py > leg.world.height - m && vy > 0)) {
      vy = -Math.sign(vy) * TUNING.driveSpeed * 0.5;
      boundaryWarning = true;
    }
    this.player.setVelocity(vx, vy);
    const moving = Math.abs(vx) + Math.abs(vy) > 1;
    // Stuck means stuck: a rover that can't drive (soft soil, out of power, storm) can't turn
    // either — the wheels just spin in place (fix E3).
    if (throttle && speedFactor > 0) this.setFacing(ix, iy);
    this.player.setDepth(py);
    this.updateTracks(dt, inSoil);
    this.toolRing.setPosition(px, py - 4).setVisible(s.toolEngaged).setDepth(py - 1);

    // ---- power ----
    const spinning = throttle; // wheels spin (and cost power) even when stuck
    this.spinWheels(spinning && !s.outOfPower);
    // Stuck and spinning: the wheels dig in and throw up bright, pale subsurface soil (fix E2).
    if (spinning && !s.outOfPower && traction === "stuck") {
      for (const side of [-1, 1]) this.churn.emitParticleAt(px + side * 22 + Phaser.Math.Between(-6, 6), py - 4, 1);
    }
    this.stationarySeconds = moving || spinning ? 0 : this.stationarySeconds + dt;
    const power = stepPower({
      battery: s.batteryChargePercent,
      condition: s.solarCondition,
      throttle: spinning || moving,
      stationarySeconds: this.stationarySeconds,
      outOfPower: s.outOfPower,
      dtSeconds: dt,
      driveDrainFactor: s.solarCondition === "dust_storm" ? TUNING.stormDriveDrainFactor : 1,
    });

    // ---- encounter progression ----
    const targetDist = Phaser.Math.Distance.Between(px, py, leg.target.x, leg.target.y);
    const canScan = step === leg.scanStep && !s.discoveredRovers.includes(leg.rover) && targetDist < TUNING.scanRange;
    // Phase H: with the leg complete, reaching the jump point lets the player CHOOSE to jump.
    const cp = leg.checkpoint;
    const canJump = step === "complete" && !!cp && !!leg.next && Phaser.Math.Distance.Between(px, py, cp.x, cp.y) < JUMP_RADIUS;
    this.setJumpPointActive(step === "complete");
    let objective = s.objective;
    let toast = s.toast;
    let toolEngaged = s.toolEngaged;

    if (step === "hazard" && s.encounterStep !== "hazard") {
      objective = { ...objective, text: "Stuck in soft soil! Scan the rover ahead [E]" };
    }

    // E is latched from its key-down EVENT (see create) and consumed here exactly once. Polling
    // JustDown() missed presses: it's cleared by a second call in the same frame, and by key-up —
    // so a tap shorter than one frame (easy on a slow laptop) never registered.
    const ePressed = this.ePressQueued;
    this.ePressQueued = false;
    if (ePressed && canJump) {
      runStore.set({ batteryChargePercent: power.battery, canJump: false });
      actions.travelToNextLeg();
      return;
    }
    if (ePressed) {
      if (canScan) {
        runStore.set({ encounterStep: step, tractionStatus: traction, batteryChargePercent: power.battery });
        actions.beginDiscovery(leg.rover);
        return;
      }
      // Power preservation is handled by the storm update; only traction mode toggles here.
      if (leg.rover === "spirit" && s.unlockedTools.includes(TRACTION_TOOL_ID)) {
        toolEngaged = !toolEngaged;
        toast = toolEngaged ? "Traction mode engaged" : "Traction mode off";
      }
    }

    // Opportunity: on the way to the final checkpoint, the storm hits (team decision, Nov 15) —
    // once the rover has covered part of the drive, or after a while if the player wanders.
    if (!leg.next && cp && step === "complete" && !s.severeStorm) {
      const d = Phaser.Math.Distance.Between(px, py, cp.x, cp.y);
      if (!this.checkpointStartDist) this.checkpointStartDist = d;
      this.checkpointSeconds += dt;
      if (d <= this.checkpointStartDist * (1 - TUNING.stormTriggerProgress) || this.checkpointSeconds >= TUNING.stormTriggerSeconds) {
        this.player.setVelocity(0, 0);
        this.cameras.main.shake(600, 0.006);
        runStore.set({ batteryChargePercent: power.battery, isRoverMoving: false, canJump: false, warning: null });
        actions.stormHits();
        return;
      }
    }

    // Spirit: drove free of the soft soil with traction mode.
    if (leg.softSoil && step === "tool_unlocked" && !inSoil) {
      runStore.set({ batteryChargePercent: power.battery, tractionStatus: "normal", toolEngaged: false });
      actions.escapedSoftSoil();
      return;
    }

    // ---- guidance ----
    let target: { x: number; y: number } | null = null;
    if (step === "approach" || step === "hazard") target = leg.target;
    else if (step === "complete" && cp) target = cp; // head for the jump point (or the final checkpoint)
    else if (step === "tool_unlocked" && leg.softSoil) {
      const a = Math.atan2(py - leg.softSoil.y, px - leg.softSoil.x);
      const r = leg.softSoil.outerRadius + 60;
      target = { x: leg.softSoil.x + Math.cos(a) * r, y: leg.softSoil.y + Math.sin(a) * r };
    }
    objective = target
      ? {
          ...objective,
          angle: Phaser.Math.Angle.Between(px, py, target.x, target.y),
          distance: Math.round(Phaser.Math.Distance.Between(px, py, target.x, target.y)),
        }
      : { ...objective, angle: null, distance: null };

    // ---- warnings (highest priority first) ----
    let warning: string | null = null;
    if (boundaryWarning) warning = "EDGE OF MISSION ZONE · TURNING BACK";
    else if (power.outOfPower) warning = "OUT OF POWER · STAY STILL TO RECHARGE";
    else if (traction === "stuck") warning = "STUCK IN SOFT SOIL";
    else if (inSoil && !s.toolEngaged) warning = "SOFT SOIL";
    else if (power.battery < TUNING.lowBatteryWarning) warning = "LOW POWER";
    else if (s.solarCondition === "dust_storm") warning = "DUST STORM · SLOW CHARGING";

    runStore.set({
      batteryChargePercent: power.battery,
      isCharging: power.isCharging,
      outOfPower: power.outOfPower,
      isRoverMoving: moving,
      tractionStatus: traction,
      encounterStep: step,
      canScan,
      canJump,
      objective,
      warning,
      toast,
      toolEngaged,
    });

    this.drawEdgeArrow(target);
  }

  /**
   * Opportunity's storm (team decisions Nov 14–15): driving is unsafe, and like Opportunity in
   * 2018 our rover doesn't make it. Its last coins go on an emergency charge, a gust damages the
   * solar panels, the battery drains to 0% and the rover shuts down. It then sits dark and won't
   * respond to the controls for a few seconds before the "Signal lost" message leads to the ending.
   * Power preservation slows the drain but can't stop it.
   */
  private updateStorm(s: RunState, dt: number, throttle: boolean) {
    const px = this.player.x;
    const py = this.player.y;
    this.player.setVelocity(0, 0);
    this.spinWheels(false);
    this.player.setDepth(py);
    this.updateTracks(dt, false);
    this.edgeArrow.clear();
    const ePressed = this.ePressQueued;
    this.ePressQueued = false;

    if (s.roverOffline) {
      // Dead: the controls do nothing but a dull relay click, and the panels still spit sparks.
      this.toolRing.setVisible(false);
      this.offlineSeconds += dt;
      this.deadClick -= dt;
      if (throttle && this.deadClick <= 0) {
        audio.sfx("noPower");
        this.deadClick = 0.9;
      }
      this.sparkClock -= dt;
      if (this.sparkClock <= 0 && this.offlineSeconds < 2.5) {
        this.sparks.emitParticleAt(px + Phaser.Math.Between(-18, 18), py - 46, Phaser.Math.Between(2, 5));
        this.sparkClock = Phaser.Math.FloatBetween(0.5, 1.1);
      }
      if (!this.signalSent && this.offlineSeconds >= TUNING.stormSignalLostDelay) {
        this.signalSent = true;
        actions.signalLost();
      }
      return;
    }

    this.stormSeconds += dt;
    const t = this.stormSeconds;
    let toolEngaged = s.toolEngaged;
    let toast = s.toast;
    if (ePressed && s.unlockedTools.includes(POWER_TOOL_ID)) {
      toolEngaged = !toolEngaged;
      toast = toolEngaged ? "Power preservation on: non-essential systems off" : "Power preservation off";
    }
    this.toolRing.setPosition(px, py - 4).setVisible(toolEngaged).setDepth(py - 1);

    // No sunlight gets through: the battery only drains (slower with power preservation). Once
    // the panels are damaged the drain speeds up if needed, so the end comes by stormShutdownBy.
    let rate: number = toolEngaged ? TUNING.stormDrainPreservedPerSecond : TUNING.stormDrainPerSecond;
    if (s.panelDamaged) rate = Math.max(rate, s.batteryChargePercent / Math.max(0.5, TUNING.stormShutdownBy - t));
    const battery = Math.max(0, s.batteryChargePercent - rate * dt);

    // Damaged panels crackle now and then.
    if (s.panelDamaged) {
      this.sparkClock -= dt;
      if (this.sparkClock <= 0) {
        this.sparks.emitParticleAt(px + Phaser.Math.Between(-18, 18), py - 46, Phaser.Math.Between(3, 7));
        this.sparkClock = Phaser.Math.FloatBetween(0.7, 1.6);
      }
    }

    if (!this.coinsSpent && t >= TUNING.stormEmergencyChargeAt) {
      this.coinsSpent = true;
      runStore.set({ toolEngaged });
      actions.emergencyCharge(battery);
      return;
    }
    if (!s.panelDamaged && t >= TUNING.stormPanelDamageAt) {
      runStore.set({ batteryChargePercent: battery, toolEngaged });
      actions.damagePanels();
      this.panelHit();
      return;
    }
    if (s.panelDamaged && battery <= 0) {
      actions.shutDownRover();
      this.powerDown();
      return;
    }

    const warning = s.panelDamaged
      ? "SOLAR PANELS DAMAGED · CANNOT RECHARGE"
      : toolEngaged
        ? "SEVERE DUST STORM · POWER PRESERVATION ON"
        : "SEVERE DUST STORM · DRIVING UNSAFE · PRESS E";
    runStore.set({
      batteryChargePercent: battery,
      isCharging: false,
      outOfPower: battery <= 0,
      isRoverMoving: false,
      tractionStatus: "normal",
      canScan: false,
      canJump: false,
      objective: { ...s.objective, angle: null, distance: null },
      warning,
      toast,
      toolEngaged,
    });
  }

  /** A gust tears into the solar panels: shake, a hot flash, a burst of sparks, a flickering rover. */
  private panelHit() {
    const cam = this.cameras.main;
    cam.shake(700, 0.012);
    cam.flash(260, 255, 196, 120);
    this.sparks.emitParticleAt(this.player.x, this.player.y - 46, 40);
    this.sparkClock = 0.6;
    let n = 0;
    this.time.addEvent({
      delay: 90,
      repeat: 7,
      callback: () => (n++ % 2 ? this.player.clearTint() : this.player.setTint(0xff8a5c)),
    });
    this.time.delayedCall(800, () => this.player.clearTint());
  }

  /** Battery empty: the rover's power dies — two last flickers, then it goes dark. */
  private powerDown() {
    this.toolRing.setVisible(false);
    this.offlineSeconds = 0;
    this.sparkClock = 0.3;
    const dark = 0x4a4656;
    this.player.setTint(dark);
    this.time.delayedCall(180, () => this.player.clearTint());
    this.time.delayedCall(330, () => this.player.setTint(dark));
    this.time.delayedCall(560, () => this.player.clearTint());
    this.time.delayedCall(700, () => {
      this.tweens.addCounter({
        from: 255,
        to: 80,
        duration: 1600,
        ease: "Sine.easeIn",
        onUpdate: (tw) => {
          const v = Math.round(tw.getValue() ?? 80);
          this.player.setTint(Phaser.Display.Color.GetColor(v, v, Math.min(255, Math.round(v * 1.12))));
        },
      });
    });
    this.tweens.add({ targets: this.powerDim, fillAlpha: 0.28, duration: 2600, delay: 400 });
    this.cameras.main.zoomTo(1.18, 3200, "Sine.easeInOut");
  }

  private setFacing(ix: number, iy: number) {
    const angle = Math.atan2(iy, ix); // 0 = east, +y = down (south)
    const idx = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
    const order: Dir[] = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
    const dir = order[idx];
    if (dir !== this.facing) {
      this.facing = dir;
      const playing = this.player.anims.isPlaying;
      const frame = Number(this.player.frame.name) || 0;
      this.player.anims.stop();
      this.player.setTexture(wheelSpinTexture(dir), frame);
      // Keep the wheels turning through the turn, from the same point in the loop.
      if (playing) this.player.anims.play({ key: wheelSpinAnim(dir), startFrame: frame });
    }
  }

  /** Individual wheels turn whenever the motors are driving them — even spinning in soft soil. */
  private spinWheels(on: boolean) {
    const a = this.player.anims;
    if (on && !a.isPlaying) a.play({ key: wheelSpinAnim(this.facing), startFrame: Number(this.player.frame.name) || 0 });
    else if (!on && a.isPlaying) a.stop(); // wheels stop where they are
  }

  private updateCinematicCamera(s: RunState) {
    const cam = this.cameras.main;
    if (s.mode === "cinematic" && !this.cinematicPan) {
      this.cinematicPan = true;
      cam.stopFollow();
      cam.pan(this.leg.target.x, this.leg.target.y, 800, "Sine.easeInOut");
      cam.zoomTo(1.15, 800);
    } else if (s.mode !== "cinematic" && this.cinematicPan) {
      this.cinematicPan = false;
      cam.zoomTo(1, 500);
      cam.startFollow(this.player, true, 0.09, 0.09);
    }
  }

  /** Off-screen objective arrow at the screen edge (guidance indicator, PRD §4.1 #5). */
  private drawEdgeArrow(target: { x: number; y: number } | null) {
    const g = this.edgeArrow;
    g.clear();
    if (!target) return;
    const view = this.cameras.main.worldView;
    if (Phaser.Geom.Rectangle.Contains(view, target.x, target.y)) return;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const a = Math.atan2(target.y - (view.y + view.height / 2), target.x - (view.x + view.width / 2));
    const pad = 40;
    let t = Math.min((cx - pad) / Math.abs(Math.cos(a) || 1e-6), (cy - pad) / Math.abs(Math.sin(a) || 1e-6));
    // Never draw under a HUD panel (objective, battery, Hub button, prompts…): slide the arrow
    // inward along its own direction until it is clear, so it always stays visible (fix D4).
    const blocked = hudRects();
    const size = 16;
    const m = size + 8; // arrow half-size plus a little breathing room
    const hit = (px: number, py: number) => blocked.some((r) => px > r.x - m && px < r.x + r.w + m && py > r.y - m && py < r.y + r.h + m);
    while (t > 60 && hit(cx + Math.cos(a) * t, cy + Math.sin(a) * t)) t -= 6;
    const x = cx + Math.cos(a) * t;
    const y = cy + Math.sin(a) * t;
    g.fillStyle(0xf1aa61, 0.95);
    g.lineStyle(2, 0x0c1828, 1);
    const p = [0, 2.5, -2.5].map((o) => [x + Math.cos(a + o) * size, y + Math.sin(a + o) * size]);
    g.fillTriangle(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1]);
    g.strokeTriangle(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1]);
  }
}
