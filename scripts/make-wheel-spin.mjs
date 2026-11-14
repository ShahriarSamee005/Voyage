// Generates wheel-spin overlay frames for the player rover (run: `npm run wheel-spin`).
//
// For each of the 8 direction frames (public/assets/rovers/player/player_{D}.png, 256×256) it
// writes public/assets/rovers/player/spin/player_{D}_wheels.png: (FRAMES-1) frames side by side,
// each holding ONLY the wheel pixels that change for that step of the spin (transparent
// elsewhere). BootScene composites them over the base frame into a spin spritesheet.
//
// - Side views (E, W): each 6-spoke hub rotates inside its orange rim (60° symmetry, so
//   FRAMES steps over 60° loop seamlessly).
// - Diagonal and front/back views: the zigzag tread stripes scroll along the tire, one stripe
//   period per loop (period auto-detected per wheel). Only tire/stripe-coloured pixels inside
//   each wheel's ellipse move, so struts, hubs and the wheel silhouette stay put.
//
// Wheel positions were measured by hand from the frames (frame pixels, 0–255).

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "public/assets/rovers/player");
const OUT = join(DIR, "spin");
const SIZE = 256;
export const FRAMES = 5;
const debug = process.argv.includes("--debug");
const debugDir = process.argv[process.argv.indexOf("--debug") + 1];

// hub wheels: rotate around (cx, cy) inside radius r. sign +1 = clockwise on screen.
// tread wheels: ellipse (cx, cy, rx, ry); hub side ("L"/"R") is excluded; dir +1 = stripes move down.
const WHEELS = {
  E: { hubs: [[46, 204], [106, 204], [167, 204]], sign: 1 },
  W: { hubs: [[89, 202], [150, 202], [210, 202]], sign: -1 },
  N: { dir: -1, tread: [[74, 144, 11, 26], [72, 201, 14, 27], [181, 144, 11, 26], [184, 201, 14, 27]] },
  S: { dir: 1, tread: [[70, 135, 11, 36], [69, 206, 15, 30], [188, 135, 12, 36], [186, 206, 15, 30]] },
  NE: { dir: -1, hub: "R", tread: [[41, 169, 13, 25], [197, 158, 17, 22], [162, 193, 18, 23], [124, 214, 20, 22]] },
  NW: { dir: -1, hub: "L", tread: [[58, 156, 19, 24], [94, 190, 19, 24], [135, 214, 20, 24], [210, 167, 19, 26]] },
  SE: { dir: 1, hub: "L", tread: [[41, 143, 16, 25], [65, 180, 18, 22], [99, 208, 21, 21], [191, 186, 21, 24]] },
  SW: { dir: 1, hub: "R", tread: [[55, 184, 19, 25], [207, 143, 19, 25], [181, 179, 19, 24], [143, 210, 22, 24]] },
};

const at = (x, y) => (y * SIZE + x) * 4;
const isOrange = (d, i) => d[i + 3] > 200 && d[i] > 140 && d[i] - d[i + 2] > 70;
/** Light metal (struts, arms, hub faces) — never part of the rubber tread. */
function isMetal(d, i) {
  if (isOrange(d, i)) return false;
  const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
  return 0.3 * r + 0.59 * g + 0.11 * b >= 130;
}
/** Metal pixels grown by 1px so their dark outlines count as "in front of the tire" too. */
function occluderMap(d) {
  const occ = new Uint8Array(SIZE * SIZE);
  for (let y = 1; y < SIZE - 1; y++)
    for (let x = 1; x < SIZE - 1; x++)
      if (isMetal(d, at(x, y))) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) occ[(y + j) * SIZE + x + i] = 1;
  return occ;
}

/** Finds the hub centre/radius near a guess: the circle whose ring is most orange. */
function refineHub(d, gx, gy) {
  let best = { score: -1 };
  for (let cy = gy - 5; cy <= gy + 5; cy++)
    for (let cx = gx - 5; cx <= gx + 5; cx++)
      for (let r = 11; r <= 16; r += 0.5) {
        let score = 0;
        for (let a = 0; a < 64; a++) {
          const x = Math.round(cx + r * Math.cos((a / 64) * Math.PI * 2));
          const y = Math.round(cy + r * Math.sin((a / 64) * Math.PI * 2));
          if (isOrange(d, at(x, y))) score++;
        }
        if (score > best.score) best = { cx, cy, r, score };
      }
  return best;
}

function bilinear(d, x, y, out, o) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  for (let c = 0; c < 4; c++) {
    const v00 = d[at(x0, y0) + c], v10 = d[at(x0 + 1, y0) + c];
    const v01 = d[at(x0, y0 + 1) + c], v11 = d[at(x0 + 1, y0 + 1) + c];
    out[o + c] = Math.round((v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy);
  }
}

/**
 * Stripe repeat vector (px): the shift (mostly downward, a little sideways on angled wheels)
 * at which the tread best matches itself.
 */
function stripePeriod(d, mask, set) {
  let best = { px: 0, py: 10, diff: Infinity };
  for (let py = 7; py <= 15; py++)
    for (let px = -3; px <= 3; px++) {
      let diff = 0, n = 0;
      for (const [x, y] of mask) {
        if (!set.has((y + py) * SIZE + x + px)) continue;
        const i = at(x, y), j = at(x + px, y + py);
        diff += Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]);
        n++;
      }
      // Slight bias toward straight-down so flat stripes don't pick a sideways twin.
      const score = diff / n + Math.abs(px) * 1.5;
      if (n > 30 && score < best.diff) best = { px, py, diff: score };
    }
  return best;
}

async function build(dirName) {
  const spec = WHEELS[dirName];
  const src = await sharp(join(DIR, `player_${dirName}.png`)).ensureAlpha().raw().toBuffer();
  const sheet = Buffer.alloc(SIZE * (FRAMES - 1) * SIZE * 4); // transparent
  const full = []; // full composited frames, for the debug preview
  const notes = [];

  const masks = [];
  if (spec.hubs) {
    for (const [gx, gy] of spec.hubs) {
      const h = refineHub(src, gx, gy);
      notes.push(`hub (${h.cx},${h.cy}) r${h.r}`);
      masks.push({ kind: "hub", ...h, rIn: h.r - 0.5 });
    }
  } else {
    const occ = occluderMap(src);
    for (const [cx, cy, rx0, ry0] of spec.tread) {
      // Shrink the ellipse a little so the tire's dark outline never moves.
      const rx = rx0 - 1.5, ry = (ry0 - 2) * 0.78;
      const px = [];
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
        for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
          if (spec.hub === "R" && x > cx + 0.15 * rx) continue;
          if (spec.hub === "L" && x < cx - 0.15 * rx) continue;
          if (src[at(x, y) + 3] > 200 && !occ[y * SIZE + x]) px.push([x, y]);
        }
      const set = new Set(px.map(([x, y]) => y * SIZE + x));
      const period = stripePeriod(src, px, set);
      notes.push(`tread (${cx},${cy}) p(${period.px},${period.py})`);
      masks.push({ kind: "tread", px, set, period });
    }
  }

  for (let k = 0; k < FRAMES; k++) {
    const frame = Buffer.from(src);
    for (const m of masks) {
      if (m.kind === "hub") {
        const ang = (spec.sign * k * (Math.PI / 3)) / FRAMES; // 60° per loop
        const cos = Math.cos(-ang), sin = Math.sin(-ang);
        for (let y = Math.floor(m.cy - m.rIn); y <= m.cy + m.rIn; y++)
          for (let x = Math.floor(m.cx - m.rIn); x <= m.cx + m.rIn; x++) {
            const dx = x - m.cx, dy = y - m.cy;
            if (dx * dx + dy * dy > m.rIn * m.rIn) continue;
            bilinear(src, m.cx + dx * cos - dy * sin, m.cy + dx * sin + dy * cos, frame, at(x, y));
          }
      } else {
        const p = m.period;
        const shx = Math.round((k * p.px) / FRAMES) * spec.dir;
        const shy = Math.round((k * p.py) / FRAMES) * spec.dir;
        for (const [x, y] of m.px) {
          let sx = x - shx, sy = y - shy;
          if (!m.set.has(sy * SIZE + sx)) { sx += spec.dir * p.px; sy += spec.dir * p.py; } // wrap one stripe
          if (!m.set.has(sy * SIZE + sx)) continue;
          src.copy(frame, at(x, y), at(sx, sy), at(sx, sy) + 4);
        }
      }
    }
    full.push(frame);
    if (k === 0) continue;
    // Keep only pixels that differ from the base frame.
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const i = at(x, y);
        if (frame.compare(src, i, i + 4, i, i + 4) === 0) continue;
        const o = (y * SIZE * (FRAMES - 1) + (k - 1) * SIZE + x) * 4;
        frame.copy(sheet, o, i, i + 4);
        sheet[o + 3] = 255;
      }
  }

  await sharp(sheet, { raw: { width: SIZE * (FRAMES - 1), height: SIZE, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, `player_${dirName}_wheels.png`));
  console.log(dirName.padEnd(2), notes.join(" · "));

  if (debug) {
    const strip = Buffer.alloc(SIZE * FRAMES * SIZE * 4);
    full.forEach((f, k) => {
      for (let y = 0; y < SIZE; y++) f.copy(strip, (y * SIZE * FRAMES + k * SIZE) * 4, y * SIZE * 4, (y + 1) * SIZE * 4);
    });
    await sharp(strip, { raw: { width: SIZE * FRAMES, height: SIZE, channels: 4 } })
      .extract({ left: 0, top: 110, width: SIZE * FRAMES, height: 135 })
      .resize(SIZE * FRAMES * 2, 270, { kernel: "nearest" })
      .flatten({ background: "#b86a48" })
      .png()
      .toFile(join(debugDir, `spin_${dirName}.png`));
  }
}

mkdirSync(OUT, { recursive: true });
for (const d of Object.keys(WHEELS)) await build(d);
