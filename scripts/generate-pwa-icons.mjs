import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'icons');
const sourceSvg = path.join(root, 'public', 'brand', 'pethub-mark.svg');

/** PetHub brand aqua #00F0C8 */
const BRAND_BG = { r: 0, g: 240, b: 200, alpha: 1 };

async function renderFromSvg(size, filename, { insetRatio = 0 } = {}) {
  const svgBuffer = await readFile(sourceSvg);

  if (insetRatio <= 0) {
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(outDir, filename));
    console.log(`Created ${filename} (${size}x${size})`);
    return;
  }

  const inset = Math.round(size * insetRatio);
  const inner = size - inset * 2;
  const logo = await sharp(svgBuffer).resize(inner, inner).png().toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: logo, top: inset, left: inset }])
    .png()
    .toFile(path.join(outDir, filename));

  console.log(`Created ${filename} (${size}x${size}, inset ${insetRatio})`);
}

await mkdir(outDir, { recursive: true });

await renderFromSvg(512, 'icon-512.png');
await renderFromSvg(512, 'icon-maskable-512.png', { insetRatio: 0.14 });
await renderFromSvg(192, 'icon-192.png');
await renderFromSvg(180, 'apple-touch-icon.png');
await renderFromSvg(32, 'favicon-32.png');
