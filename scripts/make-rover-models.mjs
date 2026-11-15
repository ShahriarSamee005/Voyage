// Builds the Rover Hub's 3D models (Phase J) from NASA's official glTF files in assets-src/models/
// into lighter copies in public/assets/models/ (run: `npm run rover-models`).
//
// Geometry is copied untouched. Only the embedded textures are shrunk: each is resized to at most
// MAX_TEX px and re-encoded (JPEG when it has no transparency, otherwise PNG). Every buffer view is
// re-packed in its original order with 4-byte alignment, so accessors keep pointing at the same data.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "assets-src/models");
const OUT = join(ROOT, "public/assets/models");
const MAX_TEX = 1024;

// [source file (NASA), output file]
const MODELS = [["MER_static.glb", "mer.glb"]]; // NASA/JPL-Caltech — Spirit & Opportunity (twins)

const pad4 = (n) => (n + 3) & ~3;

async function shrinkGlb(srcPath, outPath) {
  const glb = readFileSync(srcPath);
  if (glb.toString("ascii", 0, 4) !== "glTF") throw new Error(`${srcPath} is not a GLB`);
  const jsonLen = glb.readUInt32LE(12);
  const json = JSON.parse(glb.toString("utf8", 20, 20 + jsonLen));
  const binStart = 20 + pad4(jsonLen) + 8;
  const bin = glb.subarray(binStart, binStart + glb.readUInt32LE(20 + pad4(jsonLen)));

  // Re-encode each embedded image.
  const replaced = new Map(); // bufferView index -> new bytes
  for (const img of json.images ?? []) {
    if (img.bufferView === undefined) continue;
    const view = json.bufferViews[img.bufferView];
    const bytes = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    const pipeline = sharp(bytes).resize(MAX_TEX, MAX_TEX, { fit: "inside", withoutEnlargement: true });
    const { isOpaque } = await sharp(bytes).stats();
    const out = isOpaque
      ? await pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer()
      : await pipeline.png({ compressionLevel: 9, palette: false }).toBuffer();
    img.mimeType = isOpaque ? "image/jpeg" : "image/png";
    replaced.set(img.bufferView, out);
  }

  // Re-pack every buffer view in order.
  const parts = [];
  let offset = 0;
  json.bufferViews.forEach((view, i) => {
    const data = replaced.get(i) ?? bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    const aligned = pad4(offset);
    if (aligned > offset) parts.push(Buffer.alloc(aligned - offset));
    view.byteOffset = aligned;
    view.byteLength = data.length;
    view.buffer = 0;
    parts.push(data);
    offset = aligned + data.length;
  });
  const newBin = Buffer.concat([...parts, Buffer.alloc(pad4(offset) - offset)]);
  json.buffers = [{ byteLength: newBin.length }];

  let jsonBuf = Buffer.from(JSON.stringify(json), "utf8");
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(pad4(jsonBuf.length) - jsonBuf.length, 0x20)]);

  const header = Buffer.alloc(12);
  header.write("glTF", 0, "ascii");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + newBin.length, 8);
  const chunk = (len, type) => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(len, 0);
    b.write(type, 4, "ascii");
    return b;
  };
  writeFileSync(outPath, Buffer.concat([header, chunk(jsonBuf.length, "JSON"), jsonBuf, chunk(newBin.length, "BIN\0"), newBin]));
  return { before: glb.length, after: 12 + 16 + jsonBuf.length + newBin.length };
}

mkdirSync(OUT, { recursive: true });
for (const [src, out] of MODELS) {
  const { before, after } = await shrinkGlb(join(SRC, src), join(OUT, out));
  console.log(`${out}: ${(before / 1e6).toFixed(2)} MB -> ${(after / 1e6).toFixed(2)} MB`);
}
