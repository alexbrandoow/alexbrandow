import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

// Real Three.js geometry and raycasting; GPU and reflection baking are mocked.
function setup({ reduced = false, unavailable = false } = {}) {
  const dom = new JSDOM(read('index.html'), { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, doc = w.document;
  const host = doc.querySelector('.studio-mark'), canvas = doc.querySelector('#studio-3d');
  let rendered, count = 0, callback, time = 0, intersection;
  const media = new w.EventTarget(); media.matches = reduced;
  w.matchMedia = () => media;
  w.requestAnimationFrame = fn => { callback = fn; return 1; };
  w.cancelAnimationFrame = () => { callback = null; };
  w.ResizeObserver = class { observe() {} };
  w.IntersectionObserver = class { constructor(fn) { intersection = fn; } observe() {} };
  Object.defineProperties(host, { clientWidth: { value: 600 }, clientHeight: { value: 540 } });
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 540 });
  canvas.setPointerCapture = () => {}; canvas.hasPointerCapture = () => false;
  w.HTMLCanvasElement.prototype.getContext = () => ({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), fillRect() {} });
  w.eval(read('js/vendor/three.min.js'));
  w.THREE.WebGLRenderer = class {
    constructor() { if (unavailable) throw new Error('No WebGL'); }
    setPixelRatio() {} setClearColor() {} setSize() {} dispose() {}
    render(scene) { rendered = scene; count++; }
  };
  w.THREE.PMREMGenerator = class { fromEquirectangular() { return { texture: null, dispose() {} }; } dispose() {} };
  w.eval(read('js/studio-symbol.js'));
  w.eval(read('js/studio3d.js'));
  const tick = (steps = 1) => { for (let i = 0; i < steps; i++) { const fn = callback; callback = null; time += 16; fn?.(time); } };
  const pointer = (type, x = 300, y = 290) => {
    const event = new w.Event(type);
    Object.assign(event, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: x, clientY: y });
    canvas.dispatchEvent(event);
  };
  return { w, doc, canvas, media, tick, pointer, get scene() { return rendered; }, get count() { return count; }, visible(value) { intersection([{ isIntersecting: value }]); }, close() { w.close(); } };
}

test('WebGL failure leaves original white SVG visible and hides inactive controls', () => {
  const env = setup({ unavailable: true });
  assert.equal(env.canvas.hidden, true);
  assert.equal(env.doc.querySelector('.studio-fallback').hidden, false);
  assert.match(env.doc.querySelector('.studio-fallback').src, /SIMBOLO%20BOW%20BRANCA.svg$/);
  assert.equal(env.doc.querySelector('.studio-motion'), null);
  env.close();
});

test('original geometry is silver with a moving light, turns on drag and jumps on click', () => {
  const env = setup();
  try {
    env.visible(true); env.tick(100);
    const group = env.scene.children.find(node => node.type === 'Group');
    const pitch = group.children[0], spin = pitch.children[0], tilt = spin.children[0], mesh = tilt.children[0];
    assert.equal(mesh.material.color.getHex(), 0xc4c7cc);
    assert.ok(mesh.material.metalness > .9);
    const light = env.scene.getObjectByName('silver-sweep');
    assert.ok(light.intensity > 0);
    const lightX = light.target.position.x;
    env.tick(5);
    assert.ok(light.target.position.x > lightX);
    assert.equal(mesh.geometry.type, 'ExtrudeGeometry');
    assert.ok(mesh.geometry.attributes.position.count > 1000);
    assert.equal(tilt.rotation.z, Math.PI / 4);
    assert.equal(env.canvas.hidden, false);
    assert.equal(env.doc.querySelector('.studio-fallback').hidden, true);
    const before = spin.rotation.y;
    env.pointer('pointerdown'); env.pointer('pointermove', 330); env.tick();
    assert.ok(spin.rotation.y > before);
    env.pointer('pointerup', 330);
    env.pointer('pointerdown'); env.pointer('pointerup'); env.tick(20);
    assert.ok(group.position.y > 0, 'click lifts the symbol');
    env.tick(60);
    assert.ok(group.position.y < 0, 'symbol returns after jump');
    env.visible(false);
    const count = env.count; env.tick(10);
    assert.equal(env.count, count, 'no rendering outside viewport');
  } finally { env.close(); }
});

test('reduced motion stops looping while preserving keyboard rotation; context loss restores SVG', () => {
  const env = setup({ reduced: true });
  try {
    env.visible(true); env.tick(2);
    const count = env.count; env.tick(10);
    assert.equal(env.count, count);
    assert.equal(env.scene.getObjectByName('silver-sweep').intensity, 0);
    const spin = env.scene.children.find(node => node.type === 'Group').children[0].children[0];
    const before = spin.rotation.y;
    env.canvas.dispatchEvent(new env.w.KeyboardEvent('keydown', { key: 'ArrowRight' }));
    assert.ok(spin.rotation.y > before);
    env.media.matches = false; env.media.dispatchEvent(new env.w.Event('change')); env.tick(2);
    const resumed = env.count; env.tick(3); assert.ok(env.count > resumed);
    env.canvas.dispatchEvent(new env.w.Event('webglcontextlost', { cancelable: true }));
    assert.equal(env.canvas.hidden, true);
    assert.equal(env.doc.querySelector('.studio-fallback').hidden, false);
  } finally { env.close(); }
});
