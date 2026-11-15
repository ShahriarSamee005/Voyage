import * as Phaser from "phaser";
import { scripts } from "@/content/scripts";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../constants";
import { exhaustConfig, makeCinematicTextures } from "../art";
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

/**
 * Continents along Earth's visible horizon, drawn once in planet-centred coordinates so they ride
 * with the planet and never change shape. Each is an irregular band hugging the limb (polar
 * outline with seeded jitter), kept just inside the disc so nothing pokes past the horizon.
 */
function drawLandmasses(g: Phaser.GameObjects.Graphics, R: number, rng: Phaser.Math.RandomDataGenerator) {
  const deg = Math.PI / 180;
  const top = -Math.PI / 2;
  // [centre angle (deg from top), half-width (deg), depth below the horizon (px), colour]
  const masses: [number, number, number, number][] = [
    [-15, 6.5, 120, 0x4f8a4a],
    [-3, 3.2, 70, 0x6b8f4e],
    [9, 5.5, 150, 0x4a7f45],
    [19, 3, 60, 0x7a8a55],
  ];
  for (const [c, half, depth, color] of masses) {
    const pts: Phaser.Math.Vector2[] = [];
    const steps = 22;
    for (let i = 0; i <= steps; i++) {
      // outer (horizon-side) edge: close to the limb with a ragged coastline
      const a = top + (c - half + (2 * half * i) / steps) * deg;
      const r = R - 6 - rng.realInRange(0, 14) - Math.sin((i / steps) * Math.PI) * 4;
      pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r));
    }
    for (let i = steps; i >= 0; i--) {
      // inner edge: deepest in the middle, tapering to the ends, with bays and capes
      const a = top + (c - half + (2 * half * i) / steps) * deg;
      const bulge = Math.sin((i / steps) * Math.PI);
      const r = R - 10 - depth * (0.25 + 0.75 * bulge) * rng.realInRange(0.75, 1.1);
      pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r));
    }
    g.fillStyle(color, 1).fillPoints(pts, true);
  }
  // Thin cloud streaks over ocean and land.
  g.fillStyle(0xffffff, 0.35);
  for (const [c, len, inset] of [[-22, 5, 40], [-8, 4, 95], [4, 6, 30], [14, 3.5, 110]] as const) {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = top + (c + (len * i) / 12) * deg;
      pts.push(new Phaser.Math.Vector2(Math.cos(a) * (R - inset), Math.sin(a) * (R - inset)));
    }
    for (let i = 12; i >= 0; i--) {
      const a = top + (c + (len * i) / 12) * deg;
      const th = 6 * Math.sin((i / 12) * Math.PI);
      pts.push(new Phaser.Math.Vector2(Math.cos(a) * (R - inset - th), Math.sin(a) * (R - inset - th)));
    }
    g.fillPoints(pts, true);
  }
}

/** Day-sky and space gradients, full-screen canvas textures (fix A2). */
function makeSkyTextures(scene: Phaser.Scene) {
  const grad = (key: string, stops: [number, string][]) => {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, W, H)!;
    const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    for (const [at, c] of stops) g.addColorStop(at, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    tex.refresh();
  };
  grad("sky_day", [
    [0, "#173a73"],
    [0.3, "#2d64a8"],
    [0.62, "#5f9bd2"],
    [0.8, "#a9d3ee"],
    [1, "#d8ecf6"],
  ]);
  grad("sky_space", [
    [0, "#02040c"],
    [0.6, "#060c1e"],
    [1, "#0d1a36"],
  ]);
}

/** A soft cumulus cloud from overlapping white blobs (the "soft_blob" texture from BootScene). */
function makeCloud(scene: Phaser.Scene, rng: Phaser.Math.RandomDataGenerator, x: number, y: number, scale: number, alpha: number) {
  const parts: Phaser.GameObjects.Image[] = [];
  const n = rng.between(5, 8);
  for (let i = 0; i < n; i++) {
    const w = rng.between(90, 170);
    parts.push(
      scene.add
        .image(rng.between(-120, 120), rng.between(-18, 10) - Math.sin((i / (n - 1)) * Math.PI) * 22, "soft_blob")
        .setDisplaySize(w, w * rng.realInRange(0.5, 0.7))
        .setTint(i % 3 === 0 ? 0xe4eef7 : 0xffffff),
    );
  }
  // flat, slightly shaded base
  parts.push(scene.add.image(0, 16, "soft_blob").setDisplaySize(300, 50).setTint(0xcfdcea).setAlpha(0.8));
  const c = scene.add.container(x, y, parts).setScale(scale).setAlpha(alpha);
  c.setData("alpha", alpha);
  return c;
}

/**
 * Launch site (fix A3): hazy distant hills, a darker tree line, a horizon haze band and grassy
 * ground with tufts, plus a concrete apron and service road around the pad. One container, so the
 * whole site falls away as one when the rocket climbs.
 */
function buildLaunchSite(scene: Phaser.Scene, rng: Phaser.Math.RandomDataGenerator) {
  const g = scene.add.graphics();
  const ridge = (baseY: number, amp: number, step: number, color: number, alpha: number) => {
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(0, baseY)];
    let phase = rng.realInRange(0, 6);
    for (let x = 0; x <= W; x += step) {
      phase += rng.realInRange(0.25, 0.6);
      const y = baseY - amp * (0.55 + 0.45 * Math.sin(phase)) - rng.realInRange(0, amp * 0.25);
      pts.push(new Phaser.Math.Vector2(x, y));
    }
    pts.push(new Phaser.Math.Vector2(W, baseY));
    g.fillStyle(color, alpha).fillPoints(pts, true);
  };
  // distant hazy hills, then nearer greener hills, then a bumpy tree line
  ridge(GROUND_Y, 95, 48, 0x7fa2b8, 0.85);
  ridge(GROUND_Y, 55, 36, 0x5f8a78, 0.95);
  ridge(GROUND_Y + 2, 22, 9, 0x2f5534, 1);

  // horizon haze band
  const haze = scene.add.graphics();
  for (let i = 0; i < 14; i++) {
    haze.fillStyle(0xdcecf4, 0.06).fillRect(0, GROUND_Y - 120 + i * 9, W, 130 - i * 9);
  }

  // grassy ground: graded bands, then hundreds of small tufts
  const bands = [0x557f3c, 0x4f7838, 0x4a7034, 0x44682f, 0x3f612c];
  const gh = H - GROUND_Y + 40;
  bands.forEach((c, i) => g.fillStyle(c, 1).fillRect(0, GROUND_Y + (gh * i) / bands.length, W, gh / bands.length + 1));
  for (let i = 0; i < 900; i++) {
    const x = rng.between(0, W);
    const y = GROUND_Y + 4 + Math.pow(rng.frac(), 0.8) * gh;
    const near = (y - GROUND_Y) / gh; // tufts get bigger toward the viewer
    const h = 2 + Math.round(near * 5);
    g.fillStyle(rng.pick([0x6f9a47, 0x7aa64f, 0x3a5a28, 0x88b35a, 0x5c8a3e]), 1);
    g.fillRect(x, y - h, 2, h);
    g.fillRect(x + 2, y - h + 1, 2, h - 1);
    if (rng.frac() < 0.04) g.fillStyle(rng.pick([0xf2e27a, 0xffffff, 0xd98bb5]), 1).fillRect(x + 1, y - h - 2, 2, 2); // wildflowers
  }
  // dirt patches
  for (let i = 0; i < 10; i++) {
    g.fillStyle(0x6b5a3a, 0.35).fillEllipse(rng.between(0, W), rng.between(GROUND_Y + 30, H), rng.between(60, 140), rng.between(10, 22));
  }
  // concrete apron + service road under the pad
  g.fillStyle(0x8f948e, 1).fillRect(ROCKET_X - 210, GROUND_Y - 4, 360, 18);
  g.fillStyle(0x777c76, 1).fillRect(ROCKET_X - 210, GROUND_Y + 14, 360, 5);
  g.fillStyle(0x6f6a5c, 1).fillPoints(
    [
      new Phaser.Math.Vector2(ROCKET_X - 40, GROUND_Y + 19),
      new Phaser.Math.Vector2(ROCKET_X + 30, GROUND_Y + 19),
      new Phaser.Math.Vector2(ROCKET_X + 140, H + 40),
      new Phaser.Math.Vector2(ROCKET_X - 10, H + 40),
    ],
    true,
  );

  return scene.add.container(0, 0, [g, haze]);
}

export class OpeningScene extends Phaser.Scene {
  constructor() {
    super("Opening");
  }

  create() {
    makeCinematicTextures(this);
    const duration = totalSeconds(scripts.opening);

    // Sky (fix A2): a deep-to-pale blue gradient over a space gradient; the day sky fades out as
    // the rocket climbs. A few stars already glint near the top of the early-morning sky.
    makeSkyTextures(this);
    this.add.image(0, 0, "sky_space").setOrigin(0);
    const sky = this.add.image(0, 0, "sky_day").setOrigin(0);
    const stars = this.add.group();
    const rng = new Phaser.Math.RandomDataGenerator(["voyage-opening"]);
    for (let i = 0; i < 170; i++) {
      stars.add(this.add.image(rng.between(0, W), rng.between(0, H), "px_white").setAlpha(0).setScale(rng.pick([1, 1, 2]) / 3));
    }
    const starAlpha = (y: number, t: number) =>
      Math.min(0.9, Math.max(0, 1 - y / (H * 0.28)) * 0.35 + Math.max(0, t * 1.6 - y / H));
    stars.getChildren().forEach((s) => {
      const img = s as Phaser.GameObjects.Image;
      img.setAlpha(starAlpha(img.y, 0));
    });
    // Clouds: far ones low over the horizon, near ones higher up; they stream past on the way up.
    const backClouds = [
      makeCloud(this, rng, 170, 300, 0.75, 0.55),
      makeCloud(this, rng, 1010, 260, 0.9, 0.6),
      makeCloud(this, rng, 600, 380, 0.6, 0.45),
      makeCloud(this, rng, 1180, 420, 0.55, 0.4),
      makeCloud(this, rng, 360, 150, 1.2, 0.7),
    ];

    // Earth: launch ground first, then the planet's curve as we climb. Grouped in one container
    // (origin = planet centre) so the whole planet — ocean, land, atmosphere — slides down as one
    // while the rocket climbs: it visibly leaves Earth instead of hovering at the atmosphere line
    // during the monologue (fix A4). The planet keeps its size; only its position changes.
    const EARTH_Y = H + 1500;
    const EARTH_R = 1700;
    const glow = this.add.circle(0, 0, EARTH_R + 30, 0x9fd3ff, 0.18);
    const earthDisc = this.add.circle(0, 0, EARTH_R, 0x2f6fa8);
    const land = this.add.graphics();
    drawLandmasses(land, EARTH_R, rng);
    const earth = this.add.container(W / 2, EARTH_Y, [glow, earthDisc, land]).setAlpha(0);
    // Launch site (fix A3): hazy hills, a tree line and grassy ground instead of one flat strip.
    const ground = buildLaunchSite(this, rng);
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
    // Exhaust: a full, glowing plume from the engines (not a thin stream), a bright engine glow,
    // billowing smoke at the pad on ignition, and a faint contrail as it climbs.
    rocket.setDepth(2);
    const flame = this.add
      .particles(0, 0, "soft_blob", {
        ...exhaustConfig({ angle: 90, spread: 8, speed: [480, 760], lifespan: [380, 760], scale: [0.2, 0.62], width: 24, frequency: 5, quantity: 2 }),
        emitting: false,
      })
      .setDepth(3.5); // fire burns in front of its own smoke
    flame.startFollow(rocket, 0, 2);
    const engineGlow = this.add.image(rocket.x, rocket.y, "soft_blob").setTint(0xffc860).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(3.5);
    const contrail = this.add
      .particles(0, 0, "soft_blob", {
        angle: { min: 86, max: 94 },
        speed: { min: 160, max: 230 },
        lifespan: { min: 1400, max: 2000 },
        scale: { start: 0.12, end: 0.5 },
        alpha: { start: 0.3, end: 0 },
        tint: [0xffffff, 0xe8edf2],
        frequency: 40,
        emitting: false,
      })
      .setDepth(0.5);
    contrail.startFollow(rocket, 0, 60);
    const smoke = this.add
      .particles(ROCKET_X, GROUND_Y - 6, "soft_blob", {
        speedX: { min: -300, max: 300 },
        speedY: { min: -70, max: 5 },
        lifespan: { min: 1800, max: 3200 },
        scale: { start: 0.22, end: 1.15 },
        alpha: { start: 0.55, end: 0 },
        tint: [0xe6e2da, 0xcdc7bd, 0xf4f1ea, 0xb9b2a6],
        accelerationY: 80, // drifts down as the ground falls away below the climbing rocket
        frequency: 16,
        quantity: 2,
        emitting: false,
      })
      .setDepth(3);
    // Near clouds pass in FRONT of the rocket as it punches through them.
    const frontClouds = [makeCloud(this, rng, 820, -40, 1.3, 0.8), makeCloud(this, rng, 520, -260, 1.1, 0.75)];
    frontClouds.forEach((c) => c.setDepth(4));

    // Rocket shake + sway while ascending (fix A1): a slow lean back and forth plus a fine
    // engine buzz, pivoting at the engines. Starts at liftoff and keeps going to the end.
    let lifting = false;
    const swayUpdate = (time: number) => {
      if (!lifting) return;
      const s = time / 1000;
      rocket.setAngle(Math.sin(s * 1.3) * 0.8 + Math.sin(s * 3.1 + 1) * 0.25);
      rocket.x = ROCKET_X + Math.sin(s * 2.2) * 2.2 + (Math.random() - 0.5) * 1.4;
      // engine glow flickers at the nozzles
      const f = 0.85 + Math.random() * 0.3;
      engineGlow.setPosition(rocket.x, rocket.y + 6).setDisplaySize(78 * f, 44 * f);
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, swayUpdate);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, swayUpdate));

    // Liftoff after a beat; the world (ground, pad) falls away while the rocket stays framed.
    this.time.delayedCall(1800, () => {
      flame.start();
      contrail.start();
      smoke.start();
      this.time.delayedCall(2800, () => smoke.stop()); // the pad's smoke cloud, then clear air
      this.tweens.add({ targets: engineGlow, alpha: 0.55, duration: 300 });
      lifting = true;
      this.cameras.main.shake(1400, 0.004);
      // A lighter rumble keeps going through the climb.
      this.time.addEvent({ delay: 1700, repeat: 6, callback: () => this.cameras.main.shake(700, 0.0012) });
      this.tweens.add({ targets: rocket, y: H * 0.62, duration: 3000, ease: "Sine.easeIn" });
      this.tweens.add({ targets: [ground, pad], y: `+=${H}`, duration: (duration - 2) * 1000 * 0.5, ease: "Sine.easeIn" });
      // Clouds stream downward past the rocket — nearer ones faster (parallax), then thin out.
      [...backClouds, ...frontClouds].forEach((c, i) => {
        const near = i >= backClouds.length;
        this.tweens.add({
          targets: c,
          y: `+=${near ? H * 1.9 : H * (0.9 + c.scale * 0.5)}`,
          duration: (near ? 5200 : 9000 + i * 600) * (0.9 + c.scale * 0.1),
          delay: near ? 900 + i * 300 : 400,
          ease: "Sine.easeIn",
        });
      });
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: duration * 1000 * 0.7,
        onUpdate: (tw) => {
          const t = tw.getValue() ?? 0;
          sky.setAlpha(1 - t);
          stars.getChildren().forEach((s) => {
            const img = s as Phaser.GameObjects.Image;
            img.setAlpha(starAlpha(img.y, t));
          });
          backClouds.forEach((c) => c.setAlpha(c.getData("alpha") * Math.max(0, 1 - t * 1.6)));
          earth.setAlpha(t);
        },
      });
      // Once the pad has dropped away, Earth slowly sinks for the rest of the monologue — same
      // size, just falling away below the climbing rocket until only its glow edge remains.
      const recedeDelay = (duration - 2) * 1000 * 0.45;
      this.tweens.add({
        targets: earth,
        y: EARTH_Y + 200, // horizon from ~200 px above the bottom edge down to the bottom edge
        delay: recedeDelay,
        duration: Math.max(4000, duration * 1000 - recedeDelay),
        ease: "Sine.easeIn",
      });
      // Stars drift down slowly — the rocket is still climbing.
      this.tweens.add({ targets: stars.getChildren(), y: "+=90", duration: duration * 1000, ease: "Linear" });
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
