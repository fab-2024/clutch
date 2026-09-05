import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const assetDirectory = path.resolve(scriptDirectory, '../assets/social/relic-evolution');

const relics = [
  {
    name: 'ampoule',
    regions: [
      { bottom: 625, left: 445, right: 555, top: 430 },
      { bottom: 705, left: 465, right: 535, top: 585 },
    ],
  },
  {
    activeBoost: 1.15,
    name: 'fiole',
    regions: [
      { bottom: 478, left: 470, right: 530, top: 300 },
      { bottom: 650, left: 470, right: 530, top: 535 },
      { bottom: 685, left: 472, right: 528, top: 615 },
    ],
  },
  {
    activeBoost: 1.1,
    name: 'flacon',
    regions: [
      { centerX: 500, centerY: 540, radiusX: 110, radiusY: 112 },
      { bottom: 650, left: 490, right: 510, top: 585 },
      { bottom: 615, left: 462, right: 538, top: 500 },
    ],
  },
  {
    activeBoost: 1.15,
    name: 'bonbonne',
    regions: [
      { bottom: 600, left: 430, right: 570, top: 285 },
      { bottom: 645, left: 450, right: 550, top: 535 },
    ],
  },
  {
    activeBoost: 1.75,
    name: 'cuve',
    regions: [
      { bottom: 610, left: 415, right: 585, top: 270 },
      { bottom: 445, left: 455, right: 545, top: 305 },
    ],
  },
];
const requestedNames = new Set(process.argv.slice(2));
const selectedRelics = requestedNames.size
  ? relics.filter((relic) => requestedNames.has(relic.name))
  : relics;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0, edge1, value) {
  const normalized = clamp01((value - edge0) / (edge1 - edge0));
  return normalized * normalized * (3 - 2 * normalized);
}

function insideRegion(x, y, region) {
  if ('centerX' in region) {
    const normalizedX = (x - region.centerX) / region.radiusX;
    const normalizedY = (y - region.centerY) / region.radiusY;
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  }
  return x >= region.left && x <= region.right && y >= region.top && y <= region.bottom;
}

for (const relic of selectedRelics) {
  const sourcePath = path.join(assetDirectory, `relic-scene-${relic.name}.png`);
  const outputPath = path.join(assetDirectory, `relic-scene-${relic.name}-anatomy.png`);
  const dormantOutputPath = path.join(
    assetDirectory,
    `relic-scene-${relic.name}-anatomy-dormant.png`,
  );
  const source = PNG.sync.read(fs.readFileSync(sourcePath));
  const output = new PNG({ height: source.height, width: source.width });
  const dormantOutput = new PNG({ height: source.height, width: source.width });

  for (let index = 0; index < source.data.length; index += 4) {
    const red = source.data[index];
    const green = source.data[index + 1];
    const blue = source.data[index + 2];
    const brightness = Math.max(red, green, blue) / 255;
    const pixel = index / 4;
    const x = (pixel % source.width) / source.width * 1_000;
    const y = Math.floor(pixel / source.width) / source.height * 1_000;
    const insideAnatomy = relic.regions.some((region) => insideRegion(x, y, region));

    // In every source scene, the heart and roots are the warm subject inside
    // the configured anatomy regions. Red-vs-blue separation preserves their
    // antialiasing while rejecting the violet chamber and the clear glass.
    const warmth = 1.6 * red + .2 * green - 1.5 * blue - .16 * 255;
    const coverage = insideAnatomy
      ? smoothstep(5, 105, warmth) * (.42 + brightness * .58)
      : 0;

    output.data[index] = 255;
    output.data[index + 1] = Math.round(38 + 95 * brightness);
    output.data[index + 2] = Math.round(2 + 10 * brightness);
    const activeCoverage = clamp01(coverage * (relic.activeBoost ?? 1));
    output.data[index + 3] = Math.round(255 * activeCoverage * .94);

    // Brightness is retained as restrained violet relief at rest, while the
    // steep alpha curve replaces the submerged orange without widening the
    // mask onto surrounding glass or scenery.
    dormantOutput.data[index] = Math.round(66 + 35 * brightness);
    dormantOutput.data[index + 1] = Math.round(25 + 20 * brightness);
    dormantOutput.data[index + 2] = Math.round(96 + 48 * brightness);
    const dormantCoverage = smoothstep(.008, .16, coverage);
    dormantOutput.data[index + 3] = Math.round(255 * dormantCoverage * .985);
  }

  fs.writeFileSync(outputPath, PNG.sync.write(output));
  fs.writeFileSync(dormantOutputPath, PNG.sync.write(dormantOutput));
  console.log(outputPath);
  console.log(dormantOutputPath);
}
