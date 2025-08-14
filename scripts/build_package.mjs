// scripts/build_package.mjs
import { execSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');

// 1️⃣ připrav složku dist
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

// 2️⃣ sestav frontend
execSync('npm run build', { stdio: 'inherit' }); // vytváří ./build

// 3️⃣ nakopíruj runtime soubory
await cp('build', path.join(dist, 'build'), { recursive: true });
await cp('public', path.join(dist, 'public'), { recursive: true });
await cp('server.js', path.join(dist, 'server.js'));
try { await cp('.env.example', path.join(dist, '.env.example')); } catch {}

// 4️⃣ osekej package.json
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const out = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  main: 'server.js',
  scripts: { start: 'node server.js' },
  engines: pkg.engines,
  dependencies: pkg.dependencies
};
await writeFile(path.join(dist, 'package.json'), JSON.stringify(out, null, 2));

// 5️⃣ odstraň dev závislosti
execSync('npm prune --omit=dev', { cwd: dist, stdio: 'inherit' });

console.log('✅ dist/ připraveno pro deploy');
