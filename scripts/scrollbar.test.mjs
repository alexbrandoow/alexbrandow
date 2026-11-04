import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

test('reference scrollbar tracks scrolling, supports drag and keys, and resizes with content', () => {
  const dom = new JSDOM('<main id="conteudo"></main>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, root = w.document.documentElement;
  let height = 4000, pending, resize;
  Object.defineProperty(root, 'scrollHeight', { get: () => height });
  Object.defineProperty(w, 'innerHeight', { value: 800 });
  w.requestAnimationFrame = fn => { pending = fn; return 1; };
  w.ResizeObserver = class { constructor(fn) { resize = fn; } observe() {} };
  w.scrollTo = ({ top, behavior }) => {
    assert.equal(behavior, 'instant');
    w.scrollY = top;
    w.dispatchEvent(new w.Event('scroll'));
  };
  const flush = () => { const fn = pending; pending = null; fn?.(); };
  try {
    w.eval(readFileSync(new URL('../js/scrollbar.js', import.meta.url), 'utf8'));
    const bar = w.document.querySelector('.site-scrollbar'), thumb = bar.firstElementChild;
    assert.equal(thumb.style.height, '160px');
    assert.equal(bar.getAttribute('aria-valuemax'), '3200');
    assert.ok(root.classList.contains('has-custom-scrollbar'));
    w.scrollY = 1600; w.dispatchEvent(new w.Event('scroll')); flush();
    assert.equal(thumb.style.transform, 'translate3d(0,320px,0)');
    assert.equal(bar.getAttribute('aria-valuenow'), '1600');
    bar.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'End', cancelable: true }));
    assert.equal(w.scrollY, 3200);
    bar.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Home', cancelable: true }));
    assert.equal(w.scrollY, 0);
    bar.getBoundingClientRect = () => ({ top: 0 });
    thumb.getBoundingClientRect = () => ({ top: 0, bottom: 160 });
    const pointer = (type, y) => {
      const event = new w.MouseEvent(type, { clientY: y, button: 0, cancelable: true });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      bar.dispatchEvent(event);
    };
    pointer('pointerdown', 80); pointer('pointermove', 400);
    assert.equal(w.scrollY, 1600);
    assert.ok(root.classList.contains('is-scrollbar-dragging'));
    pointer('pointerup', 400); flush();
    assert.equal(root.classList.contains('is-scrollbar-dragging'), false);
    height = 800; resize(); flush();
    assert.equal(bar.hidden, true);
    assert.equal(bar.tabIndex, -1);
    assert.equal(bar.getAttribute('aria-valuemax'), '0');
  } finally { w.close(); }
});
