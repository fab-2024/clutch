import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const SOURCE_DIRECTORY = process.argv[2];
const OUTPUT_DIRECTORY = process.argv[3];

if (!SOURCE_DIRECTORY || !OUTPUT_DIRECTORY) {
  throw new Error('Usage: node scripts/extract-evolution-badges.mjs <source-directory> <output-directory>');
}

const BADGE_SHEETS = [
  ['01-elite-evolution.png', 'elite'],
  ['02-trace-evolution.png', 'trace'],
  ['03-cercle-evolution.png', 'cercle'],
  ['04-regard-evolution.png', 'regard'],
  ['05-heritage-evolution.png', 'heritage'],
  ['06-rituel-evolution.png', 'ritual'],
  ['07-contre-courant-evolution.png', 'countercurrent'],
  ['08-carton-plein-evolution.png', 'clean-sweep'],
  ['09-ascension-evolution.png', 'ascension'],
  ['10-duelliste-evolution.png', 'duelist'],
  ['11-pacte-evolution.png', 'pact'],
  ['12-echo-evolution.png', 'echo'],
  ['13-metamorphose-evolution.png', 'metamorphosis'],
];

const FULL_SIZE = 768;
const THUMB_SIZE = 192;
const STAGE_COUNT = 5;

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
await mkdir(path.join(OUTPUT_DIRECTORY, 'thumbs'), { recursive: true });

for (const [filename, family] of BADGE_SHEETS) {
  const source = path.join(SOURCE_DIRECTORY, filename);
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Dimensions absentes pour ${source}`);

  const top = Math.round(metadata.height * 0.05);
  const bottom = Math.round(metadata.height * 0.82);
  const sourcePixels = await sharp(source).removeAlpha().raw().toBuffer();
  const cellEdges = findStageEdges(sourcePixels, metadata.width, metadata.height, top, bottom);

  for (let index = 0; index < STAGE_COUNT; index += 1) {
    const left = cellEdges[index];
    const width = cellEdges[index + 1] - left;
    const height = bottom - top;
    const { data, info } = await sharp(source)
      .extract({ height, left, top, width })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rgba = Buffer.alloc(info.width * info.height * 4);

    for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
      const sourceOffset = pixel * 3;
      const targetOffset = pixel * 4;
      const red = data[sourceOffset];
      const green = data[sourceOffset + 1];
      const blue = data[sourceOffset + 2];
      const peak = Math.max(red, green, blue);
      const chroma = peak - Math.min(red, green, blue);
      const signal = Math.max(peak, chroma * 1.35);
      const alpha = Math.round(255 * clamp((signal - 13) / 32));

      rgba[targetOffset] = red;
      rgba[targetOffset + 1] = green;
      rgba[targetOffset + 2] = blue;
      rgba[targetOffset + 3] = alpha;
    }

    const stage = String(index + 1).padStart(2, '0');
    const fullPath = path.join(OUTPUT_DIRECTORY, `badge-${family}-${stage}.webp`);
    const thumbPath = path.join(OUTPUT_DIRECTORY, 'thumbs', `badge-${family}-${stage}-thumb.webp`);
    const trimmed = await sharp(rgba, {
      raw: { channels: 4, height: info.height, width: info.width },
    })
      .trim({ background: { alpha: 0, b: 0, g: 0, r: 0 }, threshold: 7 })
      .resize({
        background: { alpha: 0, b: 0, g: 0, r: 0 },
        fit: 'contain',
        height: Math.round(FULL_SIZE * 0.88),
        width: Math.round(FULL_SIZE * 0.88),
      })
      .extend({
        background: { alpha: 0, b: 0, g: 0, r: 0 },
        bottom: Math.round(FULL_SIZE * 0.06),
        left: Math.round(FULL_SIZE * 0.06),
        right: Math.round(FULL_SIZE * 0.06),
        top: Math.round(FULL_SIZE * 0.06),
      })
      .webp({ effort: 5, quality: 92 })
      .toBuffer();

    await sharp(trimmed).toFile(fullPath);
    await sharp(trimmed)
      .resize({ height: THUMB_SIZE, width: THUMB_SIZE })
      .webp({ effort: 5, quality: 88 })
      .toFile(thumbPath);
  }
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function findStageEdges(pixels, width, height, top, bottom) {
  const activity = Array.from({ length: width }, (_, x) => {
    let count = 0;
    for (let y = top; y < bottom; y += 1) {
      const offset = (y * width + x) * 3;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const peak = Math.max(red, green, blue);
      const chroma = peak - Math.min(red, green, blue);
      if (Math.max(peak, chroma * 1.35) > 36) count += 1;
    }
    return count;
  });
  const smoothed = activity.map((_, x) => {
    let total = 0;
    for (let offset = -4; offset <= 4; offset += 1) {
      total += activity[Math.max(0, Math.min(width - 1, x + offset))];
    }
    return total;
  });
  const edges = [0];

  for (let index = 1; index < STAGE_COUNT; index += 1) {
    const nominal = Math.round((width * index) / STAGE_COUNT);
    const radius = Math.round(width * 0.085);
    let best = nominal;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let x = Math.max(edges.at(-1) + 1, nominal - radius); x <= Math.min(width - 1, nominal + radius); x += 1) {
      const distancePenalty = Math.abs(x - nominal) * 0.004;
      const score = smoothed[x] + distancePenalty;
      if (score < bestScore) {
        best = x;
        bestScore = score;
      }
    }
    edges.push(best);
  }

  edges.push(width);
  return edges;
}
