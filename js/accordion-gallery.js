/* React Bits AccordionGallery adapted from the user's supplied component.
   Same GSAP layout, parallax and tilt; native buttons support touch and keyboard. */
(() => {
  'use strict';
  const root = document.querySelector('.accordion-gallery');
  if (!root) return;
  const panels = [...root.querySelectorAll('.ag-panel')];
  if (!panels.length) return;
  const gsap = window.gsap;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 520px)');
  const hover = matchMedia('(hover: hover)');
  let active = Math.min(2, panels.length - 1), mediaSize = 320, timeline;
  const ratio = .52, grow = panels.length > 1 ? ratio * (panels.length - 1) / (1 - ratio) : 1;
  root.classList.add('is-enhanced');

  function layout(animate = true) {
    timeline?.kill();
    const duration = animate && !reduced.matches ? .6 : 0;
    const vertical = mobile.matches;
    timeline = gsap?.timeline();
    panels.forEach((panel, i) => {
      const selected = i === active;
      const media = panel.querySelector('.ag-panel__media');
      const rotation = selected || reduced.matches || vertical ? 0 : i < active ? 8 : -8;
      const shift = selected || reduced.matches ? 0 : Math.max(-1.5, Math.min(1.5, active - i)) * .5 * mediaSize * .06;
      panel.classList.toggle('ag-panel--active', selected);
      panel.setAttribute('aria-pressed', String(selected));
      if (gsap) {
        timeline.to(panel, { flexGrow: selected ? grow : 1, rotationX: 0, rotationY: rotation, '--ag-dim': selected ? 0 : .35, duration, ease: 'power3.out' }, 0);
        timeline.to(media, { xPercent: -50, yPercent: -50, x: vertical ? 0 : shift, y: vertical ? shift : 0, '--ag-gray': selected ? 0 : 1, duration, ease: 'power3.out' }, 0);
      } else {
        panel.style.flexGrow = selected ? grow : 1;
        panel.style.setProperty('--ag-dim', selected ? 0 : .35);
        media.style.setProperty('--ag-gray', selected ? 0 : 1);
      }
    });
    if (!duration) timeline?.progress(1);
  }
  function select(index) {
    if (index === active) return;
    active = index;
    layout();
  }
  function measure() {
    const rect = root.getBoundingClientRect();
    const total = mobile.matches ? rect.height : rect.width;
    const usable = Math.max(total - 10 * (panels.length - 1), 120);
    mediaSize = Math.max(140, usable * ratio * 1.22);
    root.style.setProperty('--ag-media-size', `${mediaSize}px`);
    layout(false);
  }
  panels.forEach((panel, index) => {
    panel.addEventListener('pointerenter', event => { if (hover.matches && event.pointerType !== 'touch') select(index); });
    panel.addEventListener('click', () => select(index));
    panel.addEventListener('focus', () => select(index));
    panel.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % panels.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + panels.length) % panels.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = panels.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(next);
      panels[next].focus({ preventScroll: true });
    });
  });
  mobile.addEventListener('change', measure);
  reduced.addEventListener('change', () => layout(false));
  if (window.ResizeObserver) new ResizeObserver(measure).observe(root);
  else window.addEventListener('resize', measure);
  measure();
})();
