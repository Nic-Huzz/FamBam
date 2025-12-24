import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Icon sizes needed for PWA
const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

// Read the SVG source (use the base icon without emojis)
const svgPath = join(publicDir, 'icon-base.svg');
const svgBuffer = readFileSync(svgPath);

async function generateIcons() {
  console.log('Generating PNG icons...\n');

  for (const { name, size } of sizes) {
    const outputPath = join(publicDir, name);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Created: ${name} (${size}x${size})`);
  }

  console.log('\nDone! PNG icons generated in /public/');
}

generateIcons().catch(console.error);
