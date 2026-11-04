import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const main = readFileSync(new URL('js/main.js', root), 'utf8');
const contact = readFileSync(new URL('js/contact.js', root), 'utf8');
const catalog = JSON.parse(readFileSync(new URL('data/projects.json', root), 'utf8'));

function setup({ motion = false, withGSAP = false, prepare } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  virtualConsole.on('error', message => errors.push(message));
  const dom = new JSDOM(html, { url: 'http://127.0.0.1:5173/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  const queries = new Map();
  window.matchMedia = query => {
    if (!queries.has(query)) {
      const media = new window.EventTarget();
      media.media = query;
      media.matches = query.includes('no-preference') ? motion : query.includes('reduce') ? !motion : false;
      media.addListener = fn => media.addEventListener('change', fn);
      media.removeListener = fn => media.removeEventListener('change', fn);
      queries.set(query, media);
    }
    return queries.get(query);
  };
  window.scrollTo = () => {};
  window.document.fonts = { ready: Promise.resolve(), status: 'loaded', addEventListener() {}, removeEventListener() {} };
  window.fetch = async () => { throw new Error('Live network is disabled in tests'); };
  const dialog = window.document.querySelector('dialog');
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.dispatchEvent(new window.Event('close')); };
  if (withGSAP) {
    window.eval(readFileSync(new URL('js/vendor/gsap.min.js', root), 'utf8'));
    window.eval(readFileSync(new URL('js/vendor/ScrollTrigger.min.js', root), 'utf8'));
    window.eval(readFileSync(new URL('js/vendor/SplitText.min.js', root), 'utf8'));
  }
  prepare?.(window);
  window.eval(contact);
  window.eval(main);
  window.eval(readFileSync(new URL('js/accordion-gallery.js', root), 'utf8'));
  return { dom, window, document: window.document, queries, errors, close: () => { window.ScrollTrigger?.killAll(); window.gsap?.globalTimeline.clear(); window.gsap?.ticker.sleep(); window.close(); } };
}

test('all ten real projects are readable and linked even without JavaScript', () => {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const cards = [...doc.querySelectorAll('.project-card')];
  assert.equal(cards.length, 10);
  assert.deepEqual([...doc.querySelectorAll('main > section')].map(s => s.id), ['inicio', 'portfolio', 'sobre', 'atuacao', 'studio', 'contato']);
  assert.ok(cards.every(c => !c.hidden));
  assert.equal(doc.querySelector('.portfolio-filters').hidden, true);
  cards.forEach((card, i) => {
    const project = catalog.projects[i];
    const link = card.querySelector('a');
    assert.equal(link.href, project.url);
    assert.equal(link.target, '_blank');
    assert.match(link.rel, /noopener/);
    assert.equal(card.querySelector('img').getAttribute('src'), project.cover);
    assert.equal(card.textContent.includes('Projeto fictício'), project.conceptual);
    const bytes = readFileSync(new URL(project.cover, root));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
  });
  assert.ok(cards.slice(0, 2).every(c => c.dataset.category === 'web-design'));
  dom.window.close();
});

test('styles parse and preserve responsive grids, local fonts and reduced-motion rules', () => {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const css = readFileSync(new URL('css/style.css', root), 'utf8');
  const dom = new JSDOM(`<style>${css}</style>`, { virtualConsole });
  assert.deepEqual(errors, []);
  const rules = [...dom.window.document.styleSheets[0].cssRules];
  assert.equal(rules.filter(rule => rule.type === 5).length, 7);
  assert.ok(rules.some(rule => rule.conditionText === '(max-width:700px)'));
  assert.ok(rules.some(rule => rule.conditionText === '(prefers-reduced-motion:reduce)'));
  assert.ok(rules.some(rule => rule.selectorText === '.portfolio-grid'));
  dom.window.close();
});

test('all filters show exact categories and update accessible state without GSAP', () => {
  const env = setup();
  try {
    const { document } = env;
    assert.equal(document.querySelector('.portfolio-filters').hidden, false);
    for (const [category, count] of [['web-design', 2], ['identidade-visual', 3], ['social-media', 4], ['outros', 1], ['todos', 10]]) {
      document.querySelector(`[data-filter="${category}"]`).click();
      const visible = [...document.querySelectorAll('.project-card')].filter(c => !c.hidden);
      assert.equal(visible.length, count);
      assert.ok(visible.every(c => category === 'todos' || c.dataset.category === category));
      assert.equal(document.querySelectorAll('[data-filter][aria-pressed="true"]').length, 1);
      assert.equal(document.querySelector('[aria-pressed="true"]').dataset.filter, category);
      assert.match(document.querySelector('#portfolio-status').textContent, new RegExp(`^${count} `));
    }
    assert.deepEqual(env.errors, []);
  } finally { env.close(); }
});

test('glass project cursor follows the pointer, stays inside the viewport and clears on exit or touch', () => {
  const env = setup({ prepare(window) {
    window.matchMedia('(hover: hover) and (pointer: fine)').matches = true;
  } });
  try {
    const { window, document } = env;
    const link = document.querySelector('.project-link');
    const cursor = document.querySelector('.project-cursor');
    Object.defineProperties(cursor, { offsetWidth: { value: 220 }, offsetHeight: { value: 49 } });
    const pointer = (type, x, y, pointerType = 'mouse') => {
      const event = new window.MouseEvent(type, { clientX: x, clientY: y });
      Object.defineProperty(event, 'pointerType', { value: pointerType });
      link.dispatchEvent(event);
    };
    assert.equal(document.querySelector('.project-open'), null);
    assert.equal(cursor.hidden, true);
    pointer('pointerenter', 100, 150);
    assert.equal(cursor.hidden, false);
    assert.equal(cursor.style.transform, 'translate3d(118px,168px,0)');
    pointer('pointermove', window.innerWidth - 2, window.innerHeight - 2);
    assert.equal(cursor.style.transform, `translate3d(${window.innerWidth - 232}px,${window.innerHeight - 61}px,0)`);
    window.dispatchEvent(new window.Event('scroll'));
    assert.equal(cursor.hidden, true);
    assert.equal(link.classList.contains('is-cursor-active'), false);
    pointer('pointerenter', 100, 150, 'touch');
    assert.equal(cursor.hidden, true);
    pointer('pointerenter', 100, 150);
    pointer('pointerleave', 100, 150);
    assert.equal(cursor.hidden, true);
    assert.match(link.href, /behance.net\/gallery/);
    assert.equal(cursor.getAttribute('aria-hidden'), 'true');
    assert.deepEqual(env.errors, []);
  } finally { env.close(); }
});

test('About gallery uses all six local photos and switches with touch and keyboard without GSAP', () => {
  const env = setup();
  try {
    const panels = [...env.document.querySelectorAll('.ag-panel')];
    assert.equal(panels.length, 6);
    assert.equal(env.document.querySelector('.about-portrait'), null);
    panels.forEach((panel, index) => {
      assert.match(decodeURIComponent(panel.querySelector('img').getAttribute('src')), new RegExp(`ASSETS/FOTOS CAR/FOTO ${index + 1}\\.`));
    });
    assert.equal(panels[2].getAttribute('aria-pressed'), 'true');
    panels[4].click();
    assert.equal(panels[4].getAttribute('aria-pressed'), 'true');
    panels[4].dispatchEvent(new env.window.KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
    assert.equal(env.document.activeElement, panels[5]);
    assert.equal(panels[5].getAttribute('aria-pressed'), 'true');
    panels[5].dispatchEvent(new env.window.KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
    assert.equal(env.document.activeElement, panels[0]);
    assert.equal(env.document.querySelectorAll('.ag-panel[aria-pressed="true"]').length, 1);
    assert.deepEqual(env.errors, []);
  } finally { env.close(); }
});

test('GSAP accordion settles after rapid hover, responds to mobile resize and reduced motion', () => {
  const env = setup({ motion: true, withGSAP: true, prepare(window) {
    window.matchMedia('(hover: hover)').matches = true;
    window.document.querySelector('.accordion-gallery').getBoundingClientRect = () => ({ width: 600, height: 640 });
  } });
  try {
    const panels = [...env.document.querySelectorAll('.ag-panel')];
    panels[0].dispatchEvent(new env.window.Event('pointerenter'));
    panels[5].dispatchEvent(new env.window.Event('pointerenter'));
    const tween = env.window.gsap.getTweensOf(panels[5])[0];
    tween.parent.progress(1);
    assert.ok(Math.abs(Number(panels[5].style.flexGrow) - 5.416667) < .001);
    assert.equal(panels[5].querySelector('.ag-panel__media').style.getPropertyValue('--ag-gray'), '0');
    assert.equal(panels[0].querySelector('.ag-panel__media').style.getPropertyValue('--ag-gray'), '1');
    const mobile = env.queries.get('(max-width: 520px)');
    mobile.matches = true; mobile.dispatchEvent(new env.window.Event('change'));
    assert.equal(env.document.querySelector('.accordion-gallery').style.getPropertyValue('--ag-media-size'), '374.296px');
    const reduced = env.queries.get('(prefers-reduced-motion: reduce)');
    reduced.matches = true; reduced.dispatchEvent(new env.window.Event('change'));
    panels[1].click();
    assert.ok(Math.abs(Number(panels[1].style.flexGrow) - 5.416667) < .001);
    assert.equal(Number(env.window.gsap.getProperty(panels[0], 'rotationY')), 0);
    assert.deepEqual(env.errors, []);
  } finally { env.close(); }
});

test('missing image reveals the typographic fallback and retains the Behance link', () => {
  const env = setup();
  try {
    const image = env.document.querySelector('.project-media img');
    image.dispatchEvent(new env.window.Event('error'));
    assert.equal(image.hidden, true);
    assert.match(image.parentElement.querySelector('.project-fallback').textContent, /VOID/);
    assert.match(image.closest('a').href, /257803581/);
  } finally { env.close(); }
});

test('menu opens, follows portfolio anchor and closes without leaving scroll locked', () => {
  const env = setup();
  try {
    const button = env.document.querySelector('.menu-toggle');
    const menu = env.document.querySelector('#mobile-menu');
    button.click();
    assert.equal(menu.open, true);
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    menu.querySelector('[href="#portfolio"]').click();
    assert.equal(menu.open, false);
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.equal(env.document.body.classList.contains('menu-open'), false);
    assert.equal(env.document.activeElement.id, 'portfolio');
  } finally { env.close(); }
});

test('GSAP loaded with reduced motion leaves the intro hidden and filtering instant', () => {
  const env = setup({ withGSAP: true });
  try {
    env.document.querySelector('[data-filter="outros"]').click();
    assert.equal(env.document.querySelector('.preloader').hidden, true);
    assert.equal(env.document.querySelector('#portfolio-grid').style.height, '');
    assert.equal([...env.document.querySelectorAll('.project-card')].filter(c => !c.hidden).length, 1);
    assert.deepEqual(env.errors, []);
  } finally { env.close(); }
});

test('rapid animated filter changes settle on the last category', async () => {
  const env = setup({ withGSAP: true, motion: true });
  try {
    for (const category of ['web-design', 'outros', 'identidade-visual', 'social-media']) env.document.querySelector(`[data-filter="${category}"]`).click();
    await new Promise(resolve => setTimeout(resolve, 900));
    const visible = [...env.document.querySelectorAll('.project-card')].filter(c => !c.hidden);
    assert.equal(visible.length, 4);
    assert.ok(visible.every(c => c.dataset.category === 'social-media'));
    assert.equal(env.document.querySelector('#portfolio-grid').style.height, '');
    assert.ok(visible.every(c => !c.style.opacity && !c.style.transform));
    assert.deepEqual(env.errors, []);
  } finally { env.close(); }
});

test('updated identity, formations and contact preserve original assets and other Behance links', () => {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  assert.doesNotMatch(doc.body.textContent, /BØW|\bBOW\b|Alex Brandon|Alex Brandão/);
  assert.match(doc.querySelector('.about-copy').textContent, /formado em Design Gráfico e Análise e Desenvolvimento de Sistemas/);
  assert.equal(doc.querySelector('.hero .signature'), null);
  assert.equal(doc.querySelector('.footer-main .signature').innerHTML, doc.querySelector('.navbar .signature').innerHTML);
  assert.equal(doc.querySelectorAll('#contato a').length, 0);
  assert.equal(doc.querySelectorAll('#portfolio a[href*="behance.net"]').length, 10);
  assert.equal(doc.querySelector('.contact-form').method, 'post');
  assert.equal(doc.querySelector('.contact-form').action, 'https://formsubmit.co/bowstudiorioclaro@gmail.com');
  dom.window.close();
});

test('SplitText uses accessible characters and word reveals; reduced-motion change restores text', async () => {
  const env = setup({ withGSAP: true, motion: true });
  try {
    assert.ok(env.document.querySelectorAll('.hero-char').length > 20);
    assert.ok(env.document.querySelectorAll('#sobre .blur-word').length > 30);
    assert.equal(env.document.querySelector('h1').getAttribute('aria-label'), 'Web Designer & Diretor Criativo.');
    const wordTriggers = env.window.ScrollTrigger.getAll().filter(trigger => trigger.vars.start === 'top 88%');
    assert.ok(wordTriggers.length > 5);
    assert.ok(wordTriggers.every(trigger => trigger.vars.toggleActions === 'play reverse play reverse'));
    const query = env.queries.get('(prefers-reduced-motion: no-preference)');
    query.matches = false;
    query.dispatchEvent(new env.window.Event('change'));
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(env.document.querySelectorAll('.hero-char,.blur-word').length, 0);
    assert.match(env.document.querySelector('.about-copy').textContent, /Designer Gráfico/);
    assert.deepEqual(env.errors, []);
  } finally { env.close(); }
});

test('intro draws the local glyphs in sequence, fills the name and then starts the hero', () => {
  const env = setup({ withGSAP: true, motion: true });
  try {
    const { document, window } = env;
    const intro = window.gsap.getById('signature-intro');
    const hero = window.gsap.getById('hero-entrance');
    const paths = [...document.querySelectorAll('.preloader-lettering path')];
    assert.equal(paths.length, 11);
    assert.equal(hero.paused(), true);
    intro.pause().totalTime(.55, false);
    assert.ok(Number(paths[0].style.strokeDashoffset) < 1);
    assert.equal(Number(paths.at(-1).style.strokeDashoffset), 1);
    assert.equal(Number(paths[0].style.fillOpacity), 0);
    intro.totalTime(2.3, false);
    assert.ok(paths.every(path => Number(path.style.fillOpacity) === 1));
    assert.equal(document.querySelector('.preloader-name-text').style.opacity, '1');
    assert.equal(document.querySelector('.preloader-lettering').style.opacity, '0');
    assert.equal(hero.paused(), true);
    intro.totalTime(2.7, false);
    assert.equal(hero.paused(), false);
    intro.totalTime(intro.duration(), false);
    assert.equal(document.querySelector('.preloader').hidden, true);
    assert.deepEqual(env.errors, []);
  } finally { env.close(); }
});

test('skipping the drawing releases the hero and cancels the intro', () => {
  const env = setup({ withGSAP: true, motion: true });
  try {
    const hero = env.window.gsap.getById('hero-entrance');
    assert.equal(hero.paused(), true);
    env.window.dispatchEvent(new env.window.Event('wheel'));
    assert.equal(env.document.querySelector('.preloader').hidden, true);
    assert.equal(hero.paused(), false);
    assert.equal(env.window.gsap.getById('signature-intro'), undefined);
  } finally { env.close(); }
});

function fillContact(env) {
  const values = { 'contact-name': 'Pessoa de teste', 'contact-company': 'Empresa de teste', 'contact-email': 'teste@example.com', 'contact-message': 'Solicitação de teste local, sem envio real.' };
  for (const [id, value] of Object.entries(values)) env.document.getElementById(id).value = value;
  env.document.querySelector('input[name="Serviços[]"]').checked = true;
}
function submitContact(env) {
  env.document.querySelector('.contact-form').dispatchEvent(new env.window.Event('submit', { bubbles: true, cancelable: true }));
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

test('form validates required fields, whitespace, email and a service before any network request', () => {
  let requests = 0;
  const env = setup({ prepare: window => { window.fetch = async () => { requests++; }; } });
  try {
    submitContact(env);
    assert.equal(requests, 0);
    assert.equal(env.document.activeElement.id, 'contact-name');
    assert.equal(env.document.querySelectorAll('input[aria-invalid="true"],textarea[aria-invalid="true"]').length, 4);
    fillContact(env);
    env.document.getElementById('contact-name').value = '   ';
    env.document.getElementById('contact-email').value = 'not-an-email';
    submitContact(env);
    assert.equal(requests, 0);
    assert.match(env.document.getElementById('contact-email-error').textContent, /válido/);
    fillContact(env);
    env.document.querySelector('input[name="Serviços[]"]').checked = false;
    submitContact(env);
    assert.equal(requests, 0);
    assert.equal(env.document.getElementById('services-error').hidden, false);
    assert.equal(env.document.activeElement.name, 'Serviços[]');
  } finally { env.close(); }
});

test('honeypot blocks submission without pretending success', () => {
  let requests = 0;
  const env = setup({ prepare: window => { window.fetch = async () => { requests++; }; } });
  try {
    fillContact(env);
    env.document.getElementById('contact-website').value = 'spam';
    submitContact(env);
    assert.equal(requests, 0);
    assert.equal(env.document.querySelector('.contact-form-status').classList.contains('is-error'), true);
    assert.equal(env.document.getElementById('contact-name').value, 'Pessoa de teste');
  } finally { env.close(); }
});

test('form sends actual field payload once and displays success only after positive server confirmation', async () => {
  let complete;
  const calls = [];
  const env = setup({ prepare: window => {
    window.fetch = (url, options) => { calls.push({ url, options }); return new Promise(resolve => { complete = resolve; }); };
  } });
  try {
    fillContact(env);
    submitContact(env);
    submitContact(env);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://formsubmit.co/ajax/bowstudiorioclaro@gmail.com');
    assert.equal(calls[0].options.body.get('email'), 'teste@example.com');
    assert.equal(calls[0].options.body.get('Serviços desejados'), 'Web Design');
    assert.equal(calls[0].options.body.has('Serviços[]'), false);
    assert.equal(env.document.querySelector('[type="submit"]').disabled, true);
    assert.equal(env.document.querySelector('form').getAttribute('aria-busy'), 'true');
    assert.equal(env.document.querySelector('.is-success'), null);
    complete({ ok: true, json: async () => ({ success: true, message: 'Submission accepted' }) });
    await settle();
    assert.match(env.document.querySelector('.contact-form-status.is-success').textContent, /Mensagem enviada/);
    assert.equal(env.document.querySelector('[type="submit"]').disabled, false);
    assert.equal(env.document.getElementById('contact-name').value, '');
    assert.equal(env.document.querySelector('form').hasAttribute('aria-busy'), false);
  } finally { env.close(); }
});

for (const [name, response] of [
  ['HTTP failure', { ok: false, json: async () => ({ success: true }) }],
  ['rejected submission', { ok: true, json: async () => ({ success: 'false' }) }],
  ['unrecognized JSON', { ok: true, json: async () => ({}) }],
  ['malformed JSON', { ok: true, json: async () => { throw new Error('Invalid JSON'); } }],
  ['pending activation', { ok: true, json: async () => ({ success: 'true', message: 'This form needs Activation' }) }],
]) {
  test(`form preserves data and shows error for ${name}`, async () => {
    const env = setup({ prepare: window => { window.fetch = async () => response; } });
    try {
      fillContact(env);
      submitContact(env);
      await settle();
      assert.equal(env.document.querySelector('.contact-form-status').classList.contains('is-error'), true);
      assert.equal(env.document.getElementById('contact-message').value, 'Solicitação de teste local, sem envio real.');
      assert.equal(env.document.querySelector('[type="submit"]').disabled, false);
      assert.deepEqual(env.errors, []);
    } finally { env.close(); }
  });
}

test('network failure releases the form and preserves the draft for retry', async () => {
  const env = setup();
  try {
    fillContact(env);
    submitContact(env);
    await settle();
    assert.match(env.document.querySelector('.contact-form-status').textContent, /Não foi possível confirmar/);
    assert.equal(env.document.getElementById('contact-email').value, 'teste@example.com');
    assert.equal(env.document.getElementById('contact-email').disabled, false);
  } finally { env.close(); }
});
