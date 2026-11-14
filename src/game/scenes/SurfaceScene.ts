import * as Phaser from "phaser";
import { TUNING } from "../tuning";
import { FIRST_LEG, LEGS, type LegConfig } from "../legs";
import { actions, isWorldPaused, POWER_TOOL_ID, runStore, TRACTION_TOOL_ID } from "../state/runStore";
import type { EncounterStep, RunState, SolarCondition, TractionStatus } from "../state/types";
import { stepPower } from "../systems/power";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";

// Mars surface — one scene, rebuilt per leg from LEGS (Sojourner → Spirit → Opportunity).
// Encounter logic lives in runStore actions; this scene handles the world, input and timing.

const PLAYER_SCALE = 0.3;
const PLAYER_FRAME = { width: 357, height: 410 }; // crops the baked direction labels off the source frames

type Dir = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
// The source sheet's labels point the opposite way (its "N" frame shows the rover's front,
// i.e. driving down the screen). Map movement direction → texture to use.
const TEXTURE_FOR_DIR: Record<Dir, Dir> = { N: "S", NE: "SW", E: "W", SE: "NW", S: "N", SW: "NE", W: "E", NW: "SE" };

// Historical rover art per leg (textures loaded by BootScene). Sojourner is drawn visibly smaller
// than the MER twins (design.md §4.2).
const HISTORIC: Record<string, { key: string; scale: number }> = {
  sojourner: { key: "hist_sojourner", scale: 0.3 },
  spirit: { key: "hist_spirit", scale: 0.5 }, // 286px game copy → ~143px on screen
  opportunity: { key: "hist_opportunity", scale: 0.3 },
};

// Weather overlay: same terrain, different haze/particles (design.md §2.5). Storm stays navigable.
const WEATHER: Record<SolarCondition, { haze: number; dustPerSecond: number; speed: [number, number] }> = {
  clear: { haze: 0, dustPerSecond: 0, speed: [0, 0] },
  dusty: { haze: 0.14, dustPerSecond: 30, speed: [40, 110] },
  dust_storm: { haze: 0.3, dustPerSecond: 140, speed: [260, 520] },
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
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private weatherKey = "";
  private unsubscribe?: () => void;
  private runId = 0;
  private wasPaused = false;
  private stationarySeconds = 0;
  private coreSeconds = 0;
  private survivalSeconds = 0;
  private wasSevere = false;
  private facing: Dir = "N";
  private cinematicPan = false;

  constructor() {
    super("Surface");
  }

  create() {
    const s = runStore.get();
    this.leg = LEGS[s.activeEncounterRover ?? FIRST_LEG];
    this.runId = s.runId;
    this.stationarySeconds = 0;
    this.coreSeconds = 0;
    this.survivalSeconds = 0;
    this.wasSevere = false;
    this.wasPaused = false;
    this.cinematicPan = false;
    this.weatherKey = "";
    this.facing = "N";
    const { world, spawn, target } = this.leg;

    this.physics.world.setBounds(0, 0, world.width, world.height);
    this.buildGround();
    if (this.leg.softSoil) this.buildSoftSoil();
    const obstacles = this.buildRocks();

    // The abandoned rover for this leg, with a collider at its base.
    const hist = HISTORIC[this.leg.rover];
    const histImg = this.add.image(target.x, target.y, hist.key).setScale(hist.scale).setDepth(target.y);
    if (!this.leg.softSoil) {
      const base = this.add.zone(target.x, target.y + histImg.displayHeight * 0.2, histImg.displayWidth * 0.6, histImg.displayHeight * 0.3);
      obstacles.add(base);
    }

    // Player rover ("body" frames are cropped above the baked labels by BootScene).
    this.toolRing = this.add.ellipse(0, 0, 120, 44).setStrokeStyle(3, 0x68d7e9, 0.9).setVisible(false);
    this.player = this.physics.add.sprite(spawn.x, spawn.y, `player_${TEXTURE_FOR_DIR.N}`, "body");
    this.player.setScale(PLAYER_SCALE).setOrigin(0.5, 0.85).setCollideWorldBounds(true);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(200, 110).setOffset((PLAYER_FRAME.width - 200) / 2, PLAYER_FRAME.height - 150);
    this.physics.add.collider(this.player, obstacles);

    // Chapter mood + weather layers (screen-space).
    if (this.leg.tint) {
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, this.leg.tint.color, this.leg.tint.alpha).setOrigin(0).setScrollFactor(0).setDepth(9000);
    }
    this.buildWeatherLayer();
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
    this.add.tileSprite(0, 0, this.leg.world.width, this.leg.world.height, "ground_mirror").setOrigin(0).setDepth(-10);
  }

  private buildSoftSoil() {
    // Visually distinct before entry (design.md §2.2): pale, loose, sandy — not mud (rules §1).
    const soil = this.leg.softSoil!;
    const rng = mulberry32(7);
    const g = this.add.graphics().setDepth(-5);
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * (soil.outerRadius - 120);
      g.fillStyle(0xe0a878, 0.13).fillCircle(soil.x + Math.cos(a) * r, soil.y + Math.sin(a) * r, 110 + rng() * 60);
    }
    for (let i = 0; i < 18; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * (soil.coreRadius - 90);
      g.fillStyle(0xf0c49a, 0.14).fillCircle(soil.x + Math.cos(a) * r, soil.y + Math.sin(a) * r, 80 + rng() * 50);
    }
    for (let i = 0; i < 420; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * soil.outerRadius;
      g.fillStyle(rng() > 0.35 ? 0xf3cfa4 : 0x8a4a2c, 0.55).fillRect(
        Math.round(soil.x + Math.cos(a) * r),
        Math.round(soil.y + Math.sin(a) * r),
        3,
        3,
      );
    }
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
      const kind = kinds[Math.floor(rng() * kinds.length)];
      const scale = 0.45 + rng() * 0.35;
      const img = this.add.image(x, y, kind).setScale(scale).setOrigin(0.5, 0.8).setDepth(y);
      // Collide only with the rock's base, not its full drawn bounds (design.md §4.4).
      const w = img.displayWidth * 0.7;
      const h = img.displayHeight * 0.35;
      group.add(this.add.zone(x, y - h * 0.3, w, h));
      placed++;
    }
    return group;
  }

  private buildWeatherLayer() {
    if (!this.textures.exists("dust_px")) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xf2c48e, 1).fillRect(0, 0, 3, 3);
      g.generateTexture("dust_px", 3, 3);
      g.destroy();
    }
    this.haze = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xc8803c, 0).setOrigin(0).setScrollFactor(0).setDepth(9100);
    this.dust = this.add
      .particles(0, 0, "dust_px", {
        x: { min: -40, max: 0 },
        y: { min: 0, max: GAME_HEIGHT },
        speedX: { min: 40, max: 110 },
        speedY: { min: -15, max: 25 },
        lifespan: 6000,
        alpha: { start: 0.7, end: 0 },
        scale: { min: 0.6, max: 1.6 },
        frequency: -1,
      })
      .setScrollFactor(0)
      .setDepth(9200);
  }

  /** Keep visuals in sync with the solar condition that drives charging (design.md §2.5). */
  private applyWeather(s: RunState) {
    const severe = s.severeStorm;
    const passing = severe && s.toolEngaged ? this.survivalSeconds / TUNING.survivalSecondsToPass : 0;
    const key = `${s.solarCondition}|${severe}|${Math.round(passing * 10)}`;
    if (key === this.weatherKey) return;
    this.weatherKey = key;

    const w = WEATHER[s.solarCondition];
    let haze = w.haze;
    let perSecond = w.dustPerSecond;
    let speed = w.speed;
    if (severe) {
      // The storm hits after Continue: thicker, faster — easing off as survival mode rides it out.
      haze = Phaser.Math.Linear(0.48, 0.3, passing);
      perSecond = Phaser.Math.Linear(260, 140, passing);
      speed = [380, 700];
    }
    this.haze.setFillStyle(0xc8803c, haze);
    if (perSecond <= 0) {
      this.dust.stop();
    } else {
      this.dust.setFrequency(1000 / perSecond);
      this.dust.speedX = { min: speed[0], max: speed[1] } as unknown as number;
      if (!this.dust.emitting) this.dust.start();
    }
  }

  // ---------- frame loop ----------

  update(_time: number, deltaMs: number) {
    const s = runStore.get();
    const paused = isWorldPaused(s);

    this.updateCinematicCamera(s);
    this.applyWeather(s);

    if (paused) {
      this.player.setVelocity(0, 0);
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

    // ---- Opportunity: the storm hits after Continue ----
    const severe = s.severeStorm;
    if (severe && !this.wasSevere) this.survivalSeconds = 0; // each storm starts its own survival timer
    this.wasSevere = severe;
    if (severe) speedFactor = 0; // driving is unsafe until the storm passes
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
    if (throttle && !severe) this.setFacing(ix, iy);
    this.player.setDepth(py);
    this.toolRing.setPosition(px, py - 4).setVisible(s.toolEngaged).setDepth(py - 1);

    // ---- power ----
    const spinning = throttle && !severe; // wheels spin (and cost power) even when stuck
    this.stationarySeconds = moving || spinning ? 0 : this.stationarySeconds + dt;
    const power = stepPower({
      battery: s.batteryChargePercent,
      condition: s.solarCondition,
      throttle: spinning || moving,
      stationarySeconds: this.stationarySeconds,
      outOfPower: s.outOfPower,
      dtSeconds: dt,
      driveDrainFactor: s.solarCondition === "dust_storm" ? TUNING.stormDriveDrainFactor : 1,
      loadPerSecond: severe && !s.toolEngaged ? TUNING.severeStormLoadPerSecond : 0,
    });

    // ---- encounter progression ----
    const targetDist = Phaser.Math.Distance.Between(px, py, leg.target.x, leg.target.y);
    const canScan = step === leg.scanStep && !s.discoveredRovers.includes(leg.rover) && targetDist < TUNING.scanRange;
    let objective = s.objective;
    let toast = s.toast;
    let toolEngaged = s.toolEngaged;

    if (step === "hazard" && s.encounterStep !== "hazard") {
      objective = { ...objective, text: "Stuck in soft soil! Scan the rover ahead [E]" };
    }

    if (Phaser.Input.Keyboard.JustDown(k.E)) {
      if (canScan) {
        runStore.set({ encounterStep: step, tractionStatus: traction, batteryChargePercent: power.battery });
        actions.beginDiscovery(leg.rover);
        return;
      }
      const legTool = leg.rover === "spirit" ? TRACTION_TOOL_ID : leg.rover === "opportunity" ? POWER_TOOL_ID : null;
      if (legTool && s.unlockedTools.includes(legTool) && (legTool === TRACTION_TOOL_ID || severe)) {
        toolEngaged = !toolEngaged;
        toast =
          legTool === TRACTION_TOOL_ID
            ? toolEngaged
              ? "Traction mode engaged"
              : "Traction mode off"
            : toolEngaged
              ? "Survival mode: power preservation on — hold still"
              : "Power preservation off";
      }
    }

    // Survival mode: hold still long enough and the storm passes.
    if (severe && toolEngaged) {
      this.survivalSeconds += dt;
      if (this.survivalSeconds >= TUNING.survivalSecondsToPass) {
        runStore.set({ batteryChargePercent: power.battery, outOfPower: power.outOfPower, isCharging: false });
        actions.stormPassed();
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
    if (severe) {
      warning = toolEngaged
        ? `SURVIVAL MODE — STORM PASSING (${Math.max(1, Math.ceil(TUNING.survivalSecondsToPass - this.survivalSeconds))}s)`
        : "SEVERE DUST STORM — DRIVING UNSAFE · PRESS E";
    } else if (boundaryWarning) warning = "EDGE OF MISSION ZONE — TURNING BACK";
    else if (power.outOfPower) warning = "OUT OF POWER — STAY STILL TO RECHARGE";
    else if (traction === "stuck") warning = "STUCK IN SOFT SOIL";
    else if (inSoil && !s.toolEngaged) warning = "SOFT SOIL";
    else if (power.battery < TUNING.lowBatteryWarning) warning = "LOW POWER";
    else if (s.solarCondition === "dust_storm") warning = "DUST STORM — SLOW CHARGING";

    runStore.set({
      batteryChargePercent: power.battery,
      isCharging: power.isCharging,
      outOfPower: power.outOfPower,
      isRoverMoving: moving,
      tractionStatus: traction,
      encounterStep: step,
      canScan,
      objective,
      warning,
      toast,
      toolEngaged,
    });

    this.drawEdgeArrow(target);
  }

  private setFacing(ix: number, iy: number) {
    const angle = Math.atan2(iy, ix); // 0 = east, +y = down (south)
    const idx = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
    const order: Dir[] = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
    const dir = order[idx];
    if (dir !== this.facing) {
      this.facing = dir;
      this.player.setTexture(`player_${TEXTURE_FOR_DIR[dir]}`, "body");
    }
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
    const pad = 70;
    const t = Math.min((cx - pad) / Math.abs(Math.cos(a) || 1e-6), (cy - pad) / Math.abs(Math.sin(a) || 1e-6));
    const x = cx + Math.cos(a) * t;
    const y = cy + Math.sin(a) * t;
    const size = 16;
    g.fillStyle(0xf1aa61, 0.95);
    g.lineStyle(2, 0x0c1828, 1);
    const p = [0, 2.5, -2.5].map((o) => [x + Math.cos(a + o) * size, y + Math.sin(a + o) * size]);
    g.fillTriangle(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1]);
    g.strokeTriangle(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1]);
  }
}
