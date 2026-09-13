import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = await readFile(new URL('../public/icon.svg', import.meta.url));

const targets = [
  { file: 'icon-192.png', size: 192, padding: 0 },
  { file: 'icon-512.png', size: 512, padding: 0 },
  // maskable: платформа обрезает края, поэтому рисунок ужимается внутрь.
  { file: 'icon-maskable-512.png', size: 512, padding: 64 },
];

for (const { file, size, padding } of targets) {
  const inner = size - padding * 2;
  const image = await sharp(source, { density: 512 })
    .resize(inner, inner)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: '#0a092d',
    })
    .png()
    .toBuffer();
  await writeFile(new URL(`../public/${file}`, import.meta.url), image);
  console.log(`wrote public/${file}`);
}
