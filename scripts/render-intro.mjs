import { readFileSync, writeFileSync } from 'node:fs';
import opentype from 'opentype.js';
import { fileURLToPath } from 'node:url';

// Derive the drawing from the real local font, never an approximated wordmark.
const root = new URL('../', import.meta.url);
const font = opentype.loadSync(fileURLToPath(new URL('FONTS/ClashDisplay-Medium.otf', root)));
const size = 1000, lineHeight = 1040, tracking = -.055 * size;
const scale = size / font.unitsPerEm;
const baseline = (lineHeight - (font.ascender - font.descender) * scale) / 2 + font.ascender * scale;
const glyphs = font.stringToGlyphs('Alex Brandow');
let x = 0;
const paths = [];
glyphs.forEach((glyph, index) => {
  const path = glyph.getPath(x, baseline, size);
  if (path.commands.length) paths.push(`<path pathLength="1" d="${path.toPathData(2)}"/>`);
  x += glyph.advanceWidth * scale + tracking;
  if (index < glyphs.length - 1) x += font.getKerningValue(glyph, glyphs[index + 1]) * scale;
});
const svg = `<svg class="preloader-lettering" viewBox="0 0 ${x.toFixed(2)} ${lineHeight}" preserveAspectRatio="none" aria-hidden="true" focusable="false" hidden>${paths.join('')}</svg>`;
const path = new URL('index.html', root);
const current = readFileSync(path, 'utf8');
const next = current.replace(/<!-- INTRO:START -->[\s\S]*?<!-- INTRO:END -->/, `<!-- INTRO:START -->${svg}<!-- INTRO:END -->`);
if (process.argv.includes('--check')) {
  if (current !== next) throw new Error('Intro lettering is stale. Run node scripts/render-intro.mjs');
  console.log('PASS: intro paths match local Clash Display Medium.');
} else writeFileSync(path, next);
