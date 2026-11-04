import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
for (const name of ['index.html', 'identidade.html']) {
  const html = readFileSync(resolve(root, name), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  if (ids.length !== new Set(ids).size) errors.push(`${name}: duplicate IDs`);
  for (const [, ref] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    if (/^[a-z]+:/i.test(ref)) continue;
    if (ref.startsWith('#')) {
      if (!ids.includes(ref.slice(1))) errors.push(`${name}: missing anchor ${ref}`);
    } else if (!existsSync(resolve(root, decodeURIComponent(ref)))) errors.push(`${name}: missing ${ref}`);
  }
  if (/Brandão|Brandao|Brandon|Gazzeta|®/i.test(html)) errors.push(`${name}: invalid identity`);
  if (name === 'index.html' && [...html.matchAll(/<img\b[^>]*src="ASSETS\/ALEX.png"/g)].length !== 1) errors.push('Hero must retain the original photo');
}
const css = readFileSync(resolve(root, 'css/style.css'), 'utf8');
for (const [, ref] of css.matchAll(/url\("([^"]+)"\)/g)) {
  if (/^https?:/.test(ref) || !existsSync(resolve(root, 'css', ref))) errors.push(`Invalid local CSS resource: ${ref}`);
}
for (const name of readdirSync(resolve(root, 'FONTS'))) {
  const expected = name.endsWith('.otf') ? 'OTTO' : name.endsWith('.woff2') ? 'wOF2' : null;
  if (expected && readFileSync(resolve(root, 'FONTS', name)).subarray(0, 4).toString() !== expected) errors.push(`Invalid font: ${name}`);
}
let checked = 0;
for (const manifest of ['asset-hashes.json', 'reference-hashes.json']) {
  const records = JSON.parse(readFileSync(resolve(root, 'scripts', manifest), 'utf8').replace(/^\uFEFF/, ''));
  for (const record of records) {
    if (!existsSync(record.Path)) { errors.push(`Integrity reference unavailable: ${record.Path}`); continue; }
    const actual = createHash('sha256').update(readFileSync(record.Path)).digest('hex');
    if (actual.toLowerCase() !== record.Hash.toLowerCase()) errors.push(`Changed original: ${record.Path}`);
    checked++;
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`PASS: resources, anchors, font files, identity and ${checked} original-file hashes.`);
