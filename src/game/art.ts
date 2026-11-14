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

/** Player rover frames carry a baked direction label at the bottom; expose a cropped "body" frame. */
export function cropPlayerFrames(scene: Phaser.Scene) {
  for (const d of ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]) {
    const tex = scene.textures.get(`player_${d}`);
    if (!tex.has("body")) tex.add("body", 0, 0, 0, 357, 410);
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
