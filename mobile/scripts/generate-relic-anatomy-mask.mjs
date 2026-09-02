import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const assetDirectory = path.resolve(scriptDirectory, '../assets/social/relic-evolution');
const sourcePath = path.join(assetDirectory, 'relic-scene-ampoule.png');
const outputPath = path.join(assetDirectory, 'relic-scene-ampoule-anatomy.png');
const dormantOutputPath = path.join(assetDirectory, 'relic-scene-ampoule-anatomy-dormant.png');

const source = PNG.sync.read(fs.readFileSync(sourcePath));
const output = new PNG({ height: source.height, width: source.width });
const dormantOutput = new PNG({ height: source.height, width: source.width });

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0, edge1, value) {
  const normalized = clamp01((value - edge0) / (edge1 - edge0));
  return normalized * normalized * (3 - 2 * normalized);
}

for (let index = 0; index < source.data.length; index += 4) {
  const red = source.data[index];
  const green = source.data[index + 1];
  const blue = source.data[index + 2];
  const brightness = Math.max(red, green, blue) / 255;
  const pixel = index / 4;
  const x = (pixel % source.width) / source.width * 1_000;
  const y = Math.floor(pixel / source.width) / source.height * 1_000;
  const insideRoots = x >= 445 && x <= 555 && y >= 430 && y <= 625;
  const insideHeart = x >= 465 && x <= 535 && y >= 585 && y <= 705;

  // The relic anatomy is the only warm orange subject inside the vessel.
  // Red-vs-blue separation preserves its antialiased pixels while rejecting
  // the surrounding violet liquid and blue chamber.
  const warmth = 1.6 * red + .2 * green - 1.5 * blue - .16 * 255;
  const coverage = (insideRoots || insideHeart)
    ? smoothstep(5, 105, warmth) * (.42 + brightness * .58)
    : 0;

  output.data[index] = 255;
  output.data[index + 1] = Math.round(38 + 95 * brightness);
  output.data[index + 2] = Math.round(2 + 10 * brightness);
  output.data[index + 3] = Math.round(255 * coverage * .94);

  // Keep the exact extracted anatomy readable at rest: the original version
  // flattened every covered pixel to one value and turned the heart into a
  // black cut-out. Brightness is retained as restrained violet relief while
  // the high opacity still neutralises the orange source beneath it.
  dormantOutput.data[index] = Math.round(66 + 35 * brightness);
  dormantOutput.data[index + 1] = Math.round(25 + 20 * brightness);
  dormantOutput.data[index + 2] = Math.round(96 + 48 * brightness);
  // Reuse the exact warm-pixel extraction for the immersed colour. A steeper
  // alpha curve makes the purple opaque enough to replace orange without
  // widening the mask onto the glass or the background.
  const dormantCoverage = smoothstep(.008, .16, coverage);
  dormantOutput.data[index + 3] = Math.round(255 * dormantCoverage * .985);
}

fs.writeFileSync(outputPath, PNG.sync.write(output));
fs.writeFileSync(dormantOutputPath, PNG.sync.write(dormantOutput));
console.log(outputPath);
console.log(dormantOutputPath);
