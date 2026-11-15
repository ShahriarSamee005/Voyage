import type * as Phaser from "phaser";

// Procedural pixel-art textures for the cinematics (no supplied rocket/lander/planet art).
// Drawn on a coarse pixel grid so they sit with the pixel-art sprites. The fictional
// Voyage craft deliberately look nothing like Mars Pathfinder (PRD §4.4 accuracy boundary).

type G = Phaser.GameObjects.Graphics;

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G, px: (x: number, y: number, ww: number, hh: number, c: number) => void) => void, cell = 4) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const px = (x: number, y: number, ww: number, hh: number, c: number) => {
    g.fillStyle(c, 1).fillRect(x * cell, y * cell, ww * cell, hh * cell);
  };
  draw(g, px);
  g.generateTexture(key, w * cell, h * cell);
  g.destroy();
}

/** Seamless Mars ground: the 64px tile mirrored 2×2 so every edge meets its reflection. Needs "flat_1" loaded. */
export function makeGroundTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("ground_mirror")) return;
  const src = scene.textures.get("flat_1").getSourceImage() as HTMLImageElement;
  const canvasTex = scene.textures.createCanvas("ground_mirror", 128, 128)!;
  const ctx = canvasTex.getContext();
  const quads: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  quads.forEach(([sx, sy], i) => {
    ctx.save();
    ctx.translate((i % 2) * 64 + (sx < 0 ? 64 : 0), Math.floor(i / 2) * 64 + (sy < 0 ? 64 : 0));
    ctx.scale(sx, sy);
    ctx.drawImage(src, 0, 0, 64, 64);
    ctx.restore();
  });
  canvasTex.refresh();
}

/** Rocket-fire colours over a particle's life: white-hot core → yellow → orange → dark red. */
export const FIRE_COLORS = [0xfff6d0, 0xffcf5a, 0xff8c26, 0xe0480e, 0x5a1a06];

/**
 * Rocket exhaust as glowing gas, not a pixel stream: soft round puffs ("soft_blob", made by
 * BootScene), additive blend, colour running through FIRE_COLORS as each puff cools and fades.
 * `angle` is the direction the exhaust travels (degrees; 90 = straight down, 180 = left).
 */
export function exhaustConfig(o: {
  angle: number;
  spread?: number;
  speed: [number, number];
  lifespan: [number, number];
  scale: [number, number];
  width?: number;
  frequency?: number;
  quantity?: number;
}): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  const spread = o.spread ?? 6;
  const w = o.width ?? 0;
  return {
    angle: { min: o.angle - spread, max: o.angle + spread },
    speed: { min: o.speed[0], max: o.speed[1] },
    lifespan: { min: o.lifespan[0], max: o.lifespan[1] },
    scale: { start: o.scale[0], end: o.scale[1] },
    alpha: { start: 0.55, end: 0 },
    color: FIRE_COLORS,
    colorEase: "quad.out",
    blendMode: "ADD",
    x: { min: -w, max: w },
    frequency: o.frequency ?? 10,
    quantity: o.quantity ?? 2,
  };
}

/** Flat ground details from new_assets/mars_environment (loaded by BootScene). */
export const GROUND_DECALS = [
  "small_crater",
  "medium_crater",
  "large_crater",
  "stone_cluster_1",
  "stone_cluster_2",
  "stone_cluster_3",
  "stone_cluster_4",
] as const;

/**
 * Surface helper textures (fixes D1–D3), drawn once on canvases:
 *  - "soft_blob":   white radial falloff, tinted light/dark for large tonal patches on the ground
 *  - "soft_shadow": dark elliptical falloff under the rover (and the historic rovers)
 *  - "track_dash":  one short tread mark; two are stamped per step to make a pair of tire tracks
 */
export function makeSurfaceTextures(scene: Phaser.Scene) {
  const radial = (key: string, w: number, h: number, stops: [number, string][]) => {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, w, h)!;
    const ctx = tex.getContext();
    ctx.save();
    ctx.scale(1, h / w); // draw a circle, squashed into an ellipse
    const grad = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    for (const [at, color] of stops) grad.addColorStop(at, color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, w);
    ctx.restore();
    tex.refresh();
  };
  radial("soft_blob", 256, 256, [
    [0, "rgba(255,255,255,1)"],
    [0.45, "rgba(255,255,255,0.55)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  radial("soft_shadow", 128, 48, [
    [0, "rgba(20,8,4,0.9)"],
    [0.55, "rgba(20,8,4,0.55)"],
    [1, "rgba(20,8,4,0)"],
  ]);
  if (!scene.textures.exists("track_dash")) {
    // 12×5 dark tread mark with soft ends (drawn along +x; rotated to the heading when stamped).
    const tex = scene.textures.createCanvas("track_dash", 12, 5)!;
    const ctx = tex.getContext();
    ctx.fillStyle = "rgba(70,30,16,1)";
    ctx.fillRect(2, 0, 8, 5);
    ctx.fillStyle = "rgba(70,30,16,0.5)";
    ctx.fillRect(0, 1, 2, 3);
    ctx.fillRect(10, 1, 2, 3);
    tex.refresh();
  }
}

/**
 * Expose a "body" frame on each player rover texture. The updated 256×256 frames are clean,
 * so "body" is the whole frame (kept as a named frame so scenes don't depend on the art's layout).
 */
export function cropPlayerFrames(scene: Phaser.Scene) {
  for (const d of PLAYER_DIRS) {
    const tex = scene.textures.get(`player_${d}`);
    if (!tex.has("body")) tex.add("body", 0, 0, 0, 256, 256);
  }
}

export const PLAYER_DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
/** Frames per wheel-spin loop — must match FRAMES in scripts/make-wheel-spin.mjs. */
export const WHEEL_SPIN_FRAMES = 5;
const WHEEL_SPIN_FPS = 15;
export const wheelSpinTexture = (dir: string) => `player_${dir}_spin`;
export const wheelSpinAnim = (dir: string) => `player_spin_${dir}`;

/**
 * Wheel-spin spritesheets: for each direction, frame 0 is the plain rover and frames 1..4 have the
 * pre-rendered wheel overlay (`player_{D}_wheels`, from `npm run wheel-spin`) drawn on top —
 * hubs turning in the side views, tread stripes rolling in the others. Also registers a looping
 * animation per direction. Needs `player_{D}` and `player_{D}_wheels` loaded.
 */
export function makeWheelSpin(scene: Phaser.Scene) {
  const S = 256;
  for (const d of PLAYER_DIRS) {
    const key = wheelSpinTexture(d);
    if (!scene.textures.exists(key)) {
      const base = scene.textures.get(`player_${d}`).getSourceImage() as HTMLImageElement;
      const wheels = scene.textures.get(`player_${d}_wheels`).getSourceImage() as HTMLImageElement;
      const tex = scene.textures.createCanvas(key, S * WHEEL_SPIN_FRAMES, S)!;
      const ctx = tex.getContext();
      for (let k = 0; k < WHEEL_SPIN_FRAMES; k++) {
        ctx.drawImage(base, k * S, 0, S, S);
        if (k > 0) ctx.drawImage(wheels, (k - 1) * S, 0, S, S, k * S, 0, S, S);
        tex.add(k, 0, k * S, 0, S, S);
      }
      tex.refresh();
    }
    if (!scene.anims.exists(wheelSpinAnim(d))) {
      scene.anims.create({
        key: wheelSpinAnim(d),
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: WHEEL_SPIN_FRAMES - 1 }),
        frameRate: WHEEL_SPIN_FPS,
        repeat: -1,
      });
    }
  }
}

export function makeCinematicTextures(scene: Phaser.Scene) {
  // Voyage rocket (vertical, nose up): silver body, amber band, dark fins — the fictional mission craft.
  make(scene, "rocket", 12, 34, (_g, px) => {
    px(5, 0, 2, 2, 0xf0f4f5);
    px(4, 2, 4, 3, 0xe6ecef);
    px(3, 5, 6, 20, 0xd5dde1);
    px(3, 5, 1, 20, 0xb8c3c9);
    px(3, 10, 6, 2, 0xf1aa61);
    px(5, 13, 2, 2, 0x10263a);
    px(3, 21, 6, 2, 0xf1aa61);
    px(1, 22, 2, 7, 0x3f667c);
    px(9, 22, 2, 7, 0x3f667c);
    px(3, 25, 6, 4, 0x8a96a0);
    px(4, 29, 4, 2, 0x5a646c);
  });

  // Voyage lander: wide powered-descent platform with legs and thrusters (no airbags, no petals).
  make(scene, "lander", 40, 20, (_g, px) => {
    px(8, 4, 24, 6, 0xc7d0d6);
    px(8, 4, 24, 1, 0xeef2f4);
    px(10, 6, 4, 2, 0x10263a);
    px(26, 6, 4, 2, 0xf1aa61);
    px(14, 1, 12, 3, 0x9aa6ae);
    px(4, 10, 32, 3, 0x6f7b84);
    px(4, 13, 2, 6, 0x5a646c);
    px(34, 13, 2, 6, 0x5a646c);
    px(1, 18, 7, 2, 0x5a646c);
    px(32, 18, 7, 2, 0x5a646c);
    px(12, 13, 3, 3, 0x3a434a);
    px(25, 13, 3, 3, 0x3a434a);
  });

  // Mars Pathfinder (1997) — airbag cluster around the tetrahedral lander (historical, drawn simply).
  make(scene, "pf_airbags", 24, 22, (g) => {
    const cell = 4;
    const lobes: [number, number, number][] = [
      [12, 11, 7], [6, 8, 5], [18, 8, 5], [6, 15, 5], [18, 15, 5], [12, 4, 5], [12, 18, 5],
    ];
    for (const [x, y, r] of lobes) {
      g.fillStyle(0xe9e1cf, 1).fillCircle(x * cell, y * cell, r * cell);
      g.lineStyle(2, 0xb9ae98, 1).strokeCircle(x * cell, y * cell, r * cell);
    }
  });

  // Pathfinder's parachute.
  make(scene, "pf_chute", 24, 14, (g, px) => {
    const cell = 4;
    g.fillStyle(0xf3f0e8, 1).slice(12 * cell, 10 * cell, 11 * cell, Math.PI, 0, false).fillPath();
    for (let i = 0; i < 6; i++) px(2 + i * 4, 6, 2, 3, i % 2 ? 0xd96b55 : 0xf3f0e8);
    g.lineStyle(1, 0xcfc6b2, 1);
    for (const x of [2, 7, 12, 17, 22]) g.lineBetween(x * cell, 10 * cell, 12 * cell, 14 * cell);
  });

  // Pathfinder lander opened: base + three petals (one shown as the ramp side) — simplified.
  make(scene, "pf_open", 40, 10, (_g, px) => {
    px(14, 2, 12, 4, 0x8c8f8a);
    px(15, 1, 10, 1, 0x6e716c);
    px(2, 6, 12, 2, 0x4c5a6a);
    px(26, 6, 12, 2, 0x4c5a6a);
    px(14, 6, 12, 2, 0x5e6b7a);
    px(0, 8, 40, 2, 0xd8cbb0);
  });

  // Generic old satellite silhouette for the optional travel Easter egg (no specific mission implied).
  make(scene, "satellite", 22, 10, (_g, px) => {
    px(0, 3, 7, 4, 0x2d4a72);
    px(15, 3, 7, 4, 0x2d4a72);
    px(7, 4, 8, 2, 0x8a96a0);
    px(8, 2, 6, 6, 0xc9b27a);
    px(10, 0, 2, 2, 0xd5dde1);
  });

  // Small debris chunks for the rocket mini-game.
  make(scene, "debris", 10, 8, (_g, px) => {
    px(2, 1, 6, 6, 0x6d6460);
    px(1, 2, 8, 4, 0x6d6460);
    px(3, 2, 3, 2, 0x8d847f);
    px(5, 5, 3, 1, 0x4a4340);
  });

  // 1-pixel helpers for particles/stars.
  make(scene, "px_white", 1, 1, (_g, px) => px(0, 0, 1, 1, 0xffffff), 3);
  make(scene, "px_flame", 1, 1, (_g, px) => px(0, 0, 1, 1, 0xffc46b), 4);
  make(scene, "px_dust", 1, 1, (_g, px) => px(0, 0, 1, 1, 0xd9a272), 4);
}
