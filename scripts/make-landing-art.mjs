// Builds the landing-cinematic art (Phase F) from the team's high-res sources in
// public/assets/new_assets/ into small WebP copies in public/assets/landing/ (run: `npm run landing-art`).
//
// Frames that animate together (crane thrust flicker, airbag states, Pathfinder petals) are cut
// with ONE shared bounding box, so they stay aligned when the game swaps between them.

import { mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public/assets/new_assets");
const OUT = join(ROOT, "public/assets/landing");

// [output name, source files, max width, max height]
const GROUPS = [
  ["entry", ["skycrane/02-aeroshell-only-25d.png"], 360, 360],
  ["chute_modern", ["skycrane/01-parachute-and-aeroshell-25d.png"], 400, 560],
  ["crane", ["skycrane/01-skycrane-thrust-A.png", "skycrane/02-skycrane-thrust-B.png"], 520, 520],
  ["pf_descent", ["prop_sprites/aeroshell_descent.png"], 400, 600],
  ["airbag", ["prop_sprites/airbag_normal.png", "prop_sprites/airbag_impact.png", "prop_sprites/airbag_rebound.png"], 300, 300],
  [
    "pf_lander",
    [0, 1, 2, 3, 4, 5].map((i) => `pathfinder_lander_sprite/pathfinder_close_${i}.png`),
    560,
    560,
  ],
];

async function alphaBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x0, y0, x1, y1, w: info.width, h: info.height };
}

mkdirSync(OUT, { recursive: true });
for (const [name, files, maxW, maxH] of GROUPS) {
  const boxes = await Promise.all(files.map((f) => alphaBox(join(SRC, f))));
  const u = {
    x0: Math.max(0, Math.min(...boxes.map((b) => b.x0)) - 2),
    y0: Math.max(0, Math.min(...boxes.map((b) => b.y0)) - 2),
    x1: Math.min(boxes[0].w - 1, Math.max(...boxes.map((b) => b.x1)) + 2),
    y1: Math.min(boxes[0].h - 1, Math.max(...boxes.map((b) => b.y1)) + 2),
  };
  const region = { left: u.x0, top: u.y0, width: u.x1 - u.x0 + 1, height: u.y1 - u.y0 + 1 };
  for (let i = 0; i < files.length; i++) {
    const out = join(OUT, files.length > 1 ? `${name}_${i}.webp` : `${name}.webp`);
    const r = await sharp(join(SRC, files[i]))
      .extract(region)
      .resize({ width: maxW, height: maxH, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, alphaQuality: 95 })
      .toFile(out);
    const b = boxes[i];
    console.log(
      `${out.split(/[\\/]/).pop()}  ${r.width}x${r.height}  ${Math.round(statSync(out).size / 1024)} KB` +
        `  (frame box in group: ${b.x0 - u.x0},${b.y0 - u.y0} → ${b.x1 - u.x0},${b.y1 - u.y0} of ${region.width}x${region.height})`,
    );
  }
}
