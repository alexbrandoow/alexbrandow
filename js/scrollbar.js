/* Scrollbar adapted from the supplied B0W Studio reference. */
(() => {
  'use strict';
  if (!document.getElementById('conteudo')) return;
  const node = document.createElement('div');
  node.className = 'site-scrollbar';
  node.hidden = true;
  node.setAttribute('role', 'scrollbar');
  node.setAttribute('aria-label', 'Rolagem da página');
  node.setAttribute('aria-controls', 'conteudo');
  node.setAttribute('aria-orientation', 'vertical');
  node.setAttribute('aria-valuemin', '0');
  node.setAttribute('aria-valuemax', '0');
  node.setAttribute('aria-valuenow', '0');
  node.innerHTML = '<span class="site-scrollbar-thumb"></span>';
  document.body.append(node);
  function initScrollbar() {
    const bar = document.querySelector(".site-scrollbar");
    const thumb = bar?.querySelector(".site-scrollbar-thumb");
    if (!bar || !thumb) return;

    let frame = 0;
    let metrics = { maxScroll: 0, maxTop: 0, thumbHeight: 0 };
    let drag = null;

    const getNativeScrollTop = () => window.scrollY || document.documentElement.scrollTop || 0;
    const getScrollTop = () => drag?.scrollTop ?? getNativeScrollTop();

    const positionThumb = (scrollTop) => {
      const clampedScroll = Math.min(metrics.maxScroll, Math.max(0, scrollTop));
      const thumbTop = metrics.maxScroll ? (clampedScroll / metrics.maxScroll) * metrics.maxTop : 0;
      thumb.style.transform = `translate3d(0,${thumbTop}px,0)`;
      bar.setAttribute("aria-valuenow", String(Math.round(clampedScroll)));
    };

    const setScrollTop = (value) => {
      const target = Math.min(metrics.maxScroll, Math.max(0, value));
      if (drag) drag.scrollTop = target;
      window.scrollTo({ top: target, behavior: "instant" });
      positionThumb(target);
      window.ScrollTrigger?.update();
    };

    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const viewport = window.innerHeight;
      const scrollHeight = Math.max(root.scrollHeight, document.body.scrollHeight);
      const maxScroll = Math.max(0, scrollHeight - viewport);
      const thumbHeight = maxScroll ? Math.min(viewport, Math.max(58, viewport * viewport / scrollHeight)) : viewport;
      const maxTop = Math.max(0, viewport - thumbHeight);
      const scrollTop = Math.min(maxScroll, Math.max(0, getScrollTop()));

      metrics = { maxScroll, maxTop, thumbHeight };
      thumb.style.height = `${thumbHeight}px`;
      positionThumb(scrollTop);
      bar.classList.toggle("is-hidden", maxScroll <= 0);
      bar.hidden = maxScroll <= 0;
      bar.tabIndex = maxScroll > 0 ? 0 : -1;
      bar.setAttribute("aria-valuemax", String(Math.round(maxScroll)));
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const scrollFromPointer = (clientY) => {
      if (!drag || !metrics.maxTop) return;
      const bounds = bar.getBoundingClientRect();
      const thumbTop = Math.min(metrics.maxTop, Math.max(0, clientY - bounds.top - drag.offsetY));
      setScrollTop((thumbTop / metrics.maxTop) * metrics.maxScroll);
    };

    bar.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !metrics.maxScroll) return;
      const thumbBounds = thumb.getBoundingClientRect();
      const startedOnThumb = event.clientY >= thumbBounds.top && event.clientY <= thumbBounds.bottom;
      const currentScrollTop = getNativeScrollTop();
      drag = {
        pointerId: event.pointerId,
        offsetY: startedOnThumb ? event.clientY - thumbBounds.top : metrics.thumbHeight / 2,
        scrollTop: currentScrollTop
      };
      document.documentElement.classList.add("is-scrollbar-dragging");
      thumb.classList.add("is-dragging");
      bar.focus({ preventScroll: true });
      bar.setPointerCapture?.(event.pointerId);
      scrollFromPointer(event.clientY);
      event.preventDefault();
    });
    bar.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      scrollFromPointer(event.clientY);
      event.preventDefault();
    });
    const stopDrag = (event) => {
      if (event?.pointerId !== undefined && drag && event.pointerId !== drag.pointerId) return;
      const pointerId = drag?.pointerId;
      drag = null;
      if (pointerId !== undefined && bar.hasPointerCapture?.(pointerId)) bar.releasePointerCapture(pointerId);
      document.documentElement.classList.remove("is-scrollbar-dragging");
      thumb.classList.remove("is-dragging");
      requestUpdate();
    };
    bar.addEventListener("pointerup", stopDrag);
    bar.addEventListener("pointercancel", stopDrag);
    bar.addEventListener("lostpointercapture", stopDrag);
    window.addEventListener("blur", stopDrag);
    bar.addEventListener("keydown", (event) => {
      const steps = {
        ArrowUp: -60,
        ArrowDown: 60,
        PageUp: -window.innerHeight * .85,
        PageDown: window.innerHeight * .85,
        Home: -metrics.maxScroll,
        End: metrics.maxScroll
      };
      if (!(event.key in steps)) return;
      event.preventDefault();
      setScrollTop(getScrollTop() + steps[event.key]);
    });

    update();
    document.documentElement.classList.add("has-custom-scrollbar");
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("load", requestUpdate);
    window.addEventListener("pageshow", requestUpdate);
    document.fonts?.ready.then(requestUpdate);
    window.ScrollTrigger?.addEventListener("refresh", requestUpdate);
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(requestUpdate);
      resizeObserver.observe(document.body);
      const content = document.querySelector("main");
      if (content) resizeObserver.observe(content);
    }
  }

  initScrollbar();
})();
