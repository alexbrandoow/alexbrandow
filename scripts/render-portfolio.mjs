import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { projects } = JSON.parse(readFileSync(resolve(root, 'data/projects.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ids = new Set();
const cards = projects.map(project => {
  if (ids.has(project.id)) throw new Error(`Duplicate project ID: ${project.id}`);
  ids.add(project.id);
  const url = new URL(project.url);
  if (url.protocol !== 'https:' || url.hostname !== 'www.behance.net' || !url.pathname.startsWith(`/gallery/${project.id}/`)) throw new Error(`Invalid project URL: ${project.id}`);
  if (!['web-design', 'identidade-visual', 'social-media', 'outros'].includes(project.category)) throw new Error(`Invalid category: ${project.id}`);
  if (!/^ASSETS\/portfolio\/[\w.-]+$/.test(project.cover)) throw new Error(`Invalid local image path: ${project.id}`);
  const image = existsSync(resolve(root, project.cover)) ? `<img src="${escape(project.cover)}" alt="Capa de ${escape(project.title)}" width="${project.width}" height="${project.height}" loading="lazy" decoding="async">` : '';
  return `          <article class="project-card" data-project-id="${escape(project.id)}" data-category="${escape(project.category)}">
            <a class="project-link" href="${escape(project.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(project.title)}${project.conceptual ? ', projeto fictício' : ''} — ver projeto completo no Behance, abre em uma nova aba">
              <div class="project-media"><span class="project-fallback" aria-hidden="true">${escape(project.title)}</span>${image}</div>
              <div class="project-caption"><div><h3>${escape(project.title)}</h3><p>${escape(project.categoryLabel)}${project.conceptual ? ' · Projeto fictício' : ''}</p></div><span class="project-arrow" aria-hidden="true">↗</span></div>
            </a>
          </article>`;
}).join('\n');
const filename = resolve(root, 'index.html');
const html = readFileSync(filename, 'utf8');
const result = html.replace(/<!-- PORTFOLIO:START -->[\s\S]*?<!-- PORTFOLIO:END -->/, `<!-- PORTFOLIO:START -->\n${cards}\n          <!-- PORTFOLIO:END -->`);
if (result === html && !html.includes('data-project-id=')) throw new Error('Portfolio insertion point missing');
if (process.argv.includes('--check')) {
  if (result !== html) throw new Error('Run node scripts/render-portfolio.mjs to refresh the gallery');
  console.log(`PASS: ${projects.length} project cards match the local catalog.`);
} else {
  writeFileSync(filename, result);
  console.log(`Rendered ${projects.length} project cards.`);
}
