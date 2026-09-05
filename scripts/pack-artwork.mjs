// Package imagegen cutouts without changing their alpha, and audit every active
// pack item used by the Boutique / showcase. Room backgrounds are excluded.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSET_ROOT = 'mobile/assets/shop/packs/';
const command = process.argv[2] ?? 'audit';

async function itemPaths() {
  const files = [
    'mobile/src/features/shop/originalPackCatalog.ts',
    'mobile/src/features/shop/teamPackCatalog.ts',
  ];
  const items = new Set();
  for (const file of files) {
    const source = await readFile(path.join(ROOT, file), 'utf8');
    for (const match of source.matchAll(/image: require\('([^']+)'\)/g)) {
      const relative = path.relative(ROOT, path.resolve(path.dirname(path.join(ROOT, file)), match[1]));
      if (relative.startsWith(ASSET_ROOT) && relative.includes('/items/')) items.add(relative);
    }
  }
  return [...items];
}

const items = await itemPaths();
if (!items.length) throw new Error('No pack items found; check the catalog parser before auditing.');

if (command === 'import') {
  if (!process.argv[3]) throw new Error('Usage: node scripts/pack-artwork.mjs import <manifest.json>');
  const manifest = JSON.parse(await readFile(process.argv[3], 'utf8'));
  for (const { file, generated } of manifest) {
    if (!items.includes(file) || !path.isAbsolute(generated)) throw new Error(`Invalid import: ${file}`);
    const source = sharp(generated);
    const metadata = await source.metadata();
    const stats = await source.stats();
    if (!metadata.hasAlpha || stats.isOpaque || stats.channels[3]?.min !== 0) {
      throw new Error(`The generated cutout is opaque: ${file}`);
    }
    if (stats.channels[3]?.max === 0) throw new Error(`The generated cutout is empty: ${file}`);
    // The input has already been extracted by imagegen. This only reduces its
    // delivery size, retaining true RGBA and the original aspect ratio.
    const output = await sharp(generated)
      .resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(path.join(ROOT, file), output);
    console.log(`Imported ${file}`);
  }
} else if (command === 'audit') {
  const failures = [];
  let totalBytes = 0;
  for (const file of items) {
    const pipeline = sharp(path.join(ROOT, file));
    const metadata = await pipeline.metadata();
    const stats = await pipeline.stats();
    if (!metadata.hasAlpha || stats.isOpaque) failures.push(`${file}: opaque background`);
    if (metadata.hasAlpha && stats.channels[3]?.min !== 0) failures.push(`${file}: no fully transparent background`);
    if (metadata.hasAlpha && stats.channels[3]?.max === 0) failures.push(`${file}: empty image`);
    totalBytes += metadata.size ?? (await readFile(path.join(ROOT, file))).length;
  }
  console.log(`${items.length} active pack sprites; ${(totalBytes / 1024 / 1024).toFixed(1)} MiB.`);
  failures.forEach((failure) => console.error(failure));
  if (failures.length) process.exitCode = 1;
  else console.log('Every active item has non-empty artwork and real transparency.');
} else if (command === 'proof') {
  const outputDir = process.argv[3];
  if (!outputDir) throw new Error('Usage: node scripts/pack-artwork.mjs proof <directory>');
  await mkdir(outputDir, { recursive: true });
  const packs = Map.groupBy(items, (file) => file.split('/')[4]);
  for (const [pack, files] of packs) {
    const tiles = [];
    const cellWidth = 480;
    const cellHeight = 230;
    for (const [index, file] of files.entries()) {
      const sprite = await sharp(path.join(ROOT, file))
        .resize({ width: 200, height: 192, fit: 'contain', background: '#00000000' })
        .png().toBuffer();
      const label = path.basename(file, '.png');
      const base = Buffer.from(`<svg width="480" height="230"><rect width="240" height="230" fill="#12333f"/><rect x="240" width="240" height="230" fill="#a6b3b5"/><text x="12" y="218" fill="white" font-size="12">${label}</text></svg>`);
      const tile = await sharp(base).composite([
        { input: sprite, left: 20, top: 4 },
        { input: sprite, left: 260, top: 4 },
      ]).png().toBuffer();
      tiles.push({ input: tile, left: (index % 3) * cellWidth, top: Math.floor(index / 3) * cellHeight });
    }
    await sharp({ create: { width: cellWidth * 3, height: Math.ceil(files.length / 3) * cellHeight, channels: 3, background: '#12333f' } })
      .composite(tiles).png().toFile(path.join(outputDir, `${pack}.png`));
  }
  console.log(`Visual proofs saved to ${outputDir}`);
} else {
  throw new Error(`Unknown command: ${command}`);
}
