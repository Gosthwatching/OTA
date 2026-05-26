import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const src = path.resolve(appRoot, '..', 'OTA', 'json');
const dest = path.resolve(appRoot, 'public', 'json');
const files = ['beach.geojson', 'lighthouse.geojson', 'bunkers.geojson', 'departements.geojson'];

if (!fs.existsSync(src)) {
  console.error('Source JSON folder not found:', src);
  process.exit(2);
}

fs.mkdirSync(dest, { recursive: true });

for (const f of files) {
  const from = path.join(src, f);
  const to = path.join(dest, f);
  if (!fs.existsSync(from)) {
    console.warn('Skipping missing file:', from);
    continue;
  }
  fs.copyFileSync(from, to);
  console.log(`Copied ${from} -> ${to}`);
}

console.log('Done.');
