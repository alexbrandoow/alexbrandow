(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const gsap = window.gsap;
  const scrollTrigger = window.ScrollTrigger;
  const header = $('.navbar');
  const menu = $('#mobile-menu');
  const toggle = $('.menu-toggle');
  const year = $('#year');
  document.documentElement.classList.add('js-ready');
  if (year) year.textContent = new Date().getFullYear();

  // Native dialog supplies modal semantics, focus trapping and Escape handling.
  if (menu && toggle) {
    const closeMenu = () => menu.close();
    toggle.addEventListener('click', () => {
      menu.showModal();
      document.body.classList.add('menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      if (gsap && !reducedMotion.matches) {
        gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .55, ease: 'power3.inOut', clearProps: 'clipPath' });
        gsap.fromTo($$('.mobile-links a'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .45, stagger: .045, delay: .2, clearProps: 'all' });
      }
    });
    $('.menu-close', menu).addEventListener('click', closeMenu);
    $$('a[href^="#"]', menu).forEach(link => link.addEventListener('click', closeMenu));
    menu.addEventListener('close', () => {
      document.body.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', event => {
      if (event.matches && menu.open) closeMenu();
    });
  }

  // Keep native hash links, history and keyboard behavior intact.
  $$('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }));

  const sections = $$('main > section[data-theme]');
  const progress = $('.reading-progress');
  let scheduled = false;
  function updateNavigation() {
    scheduled = false;
    const headerBottom = (header?.getBoundingClientRect().bottom || 96) + 8;
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= headerBottom) current = section;
    }
    if (header && current) header.dataset.navTheme = current.dataset.theme;
    $$('.nav-links a').forEach(link => {
      if (link.hash === `#${current?.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0})`;
  }
  function requestNavigationUpdate() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateNavigation); }
  }
  window.addEventListener('scroll', requestNavigationUpdate, { passive: true });
  window.addEventListener('resize', requestNavigationUpdate);
  updateNavigation();

  // Decorative glass cursor; the original project link remains the click target.
  const projectCursor = document.createElement('span');
  projectCursor.className = 'project-cursor';
  projectCursor.setAttribute('aria-hidden', 'true');
  projectCursor.hidden = true;
  projectCursor.innerHTML = 'Clique para ver o projeto <span>↗</span>';
  document.body.append(projectCursor);
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let hoveredProject;
  const followX = gsap?.quickTo(projectCursor, 'x', { duration: .2, ease: 'power3.out' });
  const followY = gsap?.quickTo(projectCursor, 'y', { duration: .2, ease: 'power3.out' });
  const hideProjectCursor = () => {
    projectCursor.hidden = true;
    hoveredProject?.classList.remove('is-cursor-active');
    hoveredProject = null;
    followX?.tween.pause(); followY?.tween.pause();
  };
  const moveProjectCursor = event => {
    if (!finePointer.matches || event.pointerType === 'touch') { hideProjectCursor(); return; }
    const link = event.currentTarget;
    const entering = hoveredProject !== link || projectCursor.hidden;
    if (hoveredProject !== link) hoveredProject?.classList.remove('is-cursor-active');
    hoveredProject = link;
    projectCursor.hidden = false;
    link.classList.add('is-cursor-active');
    const x = Math.max(12, Math.min(event.clientX + 18, window.innerWidth - projectCursor.offsetWidth - 12));
    const y = Math.max(12, Math.min(event.clientY + 18, window.innerHeight - projectCursor.offsetHeight - 12));
    if (gsap) {
      if (entering || reducedMotion.matches) {
        followX.tween.pause(); followY.tween.pause();
        gsap.set(projectCursor, { x, y });
      } else { followX(x); followY(y); }
    } else projectCursor.style.transform = `translate3d(${x}px,${y}px,0)`;
  };
  $$('.project-link').forEach(link => {
    link.addEventListener('pointerenter', moveProjectCursor);
    link.addEventListener('pointermove', moveProjectCursor);
    link.addEventListener('pointerleave', hideProjectCursor);
    link.addEventListener('pointercancel', hideProjectCursor);
    link.addEventListener('click', hideProjectCursor);
  });
  $('.portfolio-filters')?.addEventListener('click', hideProjectCursor);
  window.addEventListener('scroll', hideProjectCursor, { passive: true });
  window.addEventListener('resize', hideProjectCursor);
  window.addEventListener('blur', hideProjectCursor);
  document.addEventListener('visibilitychange', hideProjectCursor);
  document.addEventListener('keydown', event => { if (event.key === 'Tab' || event.key === 'Escape') hideProjectCursor(); });
  finePointer.addEventListener('change', hideProjectCursor);
  reducedMotion.addEventListener('change', hideProjectCursor);

  // The gallery is rendered in HTML; filtering enhances it without a runtime fetch.
  const gallery = $('#portfolio-grid');
  const filterGroup = $('.portfolio-filters');
  const cards = $$('.project-card');
  if (gallery && filterGroup && cards.length) {
    const filters = $$('[data-filter]', filterGroup);
    const status = $('#portfolio-status');
    let filterAnimation;
    let currentFilter = 'todos';
    const finishFilter = () => {
      if (gsap) gsap.set([gallery, ...cards], { clearProps: 'height,opacity,transform' });
      scrollTrigger?.refresh();
      requestNavigationUpdate();
    };
    const applyFilter = (category, animate = true) => {
      filterAnimation?.kill();
      const oldHeight = gallery.getBoundingClientRect().height;
      if (gsap) gsap.set([gallery, ...cards], { clearProps: 'height,opacity,transform' });
      currentFilter = category;
      cards.forEach(card => { card.hidden = category !== 'todos' && card.dataset.category !== category; });
      filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
      const visible = cards.filter(card => !card.hidden);
      const label = filters.find(button => button.dataset.filter === category)?.textContent;
      status.textContent = `${visible.length} ${visible.length === 1 ? 'projeto exibido' : 'projetos exibidos'}${category === 'todos' ? '' : ` em ${label}`}.`;
      if (gsap && animate && !reducedMotion.matches) {
        const newHeight = gallery.getBoundingClientRect().height;
        filterAnimation = gsap.timeline({ onComplete: finishFilter })
          .fromTo(gallery, { height: oldHeight }, { height: newHeight, duration: .4, ease: 'power2.inOut' })
          .fromTo(visible, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .4, stagger: .035, ease: 'power2.out' }, .08);
      } else finishFilter();
    };
    filters.forEach(button => button.addEventListener('click', () => {
      if (button.dataset.filter !== currentFilter) applyFilter(button.dataset.filter);
    }));
    const settleAnimation = () => { filterAnimation?.kill(); finishFilter(); };
    reducedMotion.addEventListener('change', settleAnimation);
    window.addEventListener('resize', settleAnimation);
    filterGroup.hidden = false;
    applyFilter('todos', false);
    $$('.project-media img').forEach(img => {
      const showFallback = () => { img.hidden = true; };
      img.addEventListener('error', showFallback, { once: true });
      if (img.complete && !img.naturalWidth) showFallback();
    });
  }

  // Content is visible by default, including when JavaScript or GSAP is unavailable.
  if (!gsap || !scrollTrigger) return;
  gsap.registerPlugin(scrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const splits = [];
    const splitText = (element, options) => {
      if (!window.SplitText) return null;
      const split = new window.SplitText(element, { aria: 'auto', ...options });
      splits.push(split);
      return split;
    };
    const bidirectionalTrigger = (trigger, start = 'top 88%', end = 'bottom 12%') => ({
      trigger, start, end, toggleActions: 'play reverse play reverse', invalidateOnRefresh: true
    });
    const preloader = $('.preloader');
    const initialHash = window.location.hash;
    const showIntro = preloader && !initialHash && window.scrollY < 50;
    let failSafe, introTimeline;
    const dismissIntro = () => {
      if (preloader) preloader.hidden = true;
      introTimeline?.kill();
      if (hero.paused()) hero.play();
      window.clearTimeout(failSafe);
      document.removeEventListener('keydown', dismissIntro);
      window.removeEventListener('wheel', dismissIntro);
      window.removeEventListener('touchstart', dismissIntro);
    };
    const hero = gsap.timeline({ id: 'hero-entrance', paused: Boolean(showIntro), defaults: { ease: 'power4.out' } });
    if (!initialHash) {
      // Reference initHero: characters, 105% rise, -65deg rotation and 16px blur.
      // Existing line wrappers preserve the designed responsive composition.
      const characters = $$('.title-line > span').flatMap(element => {
        const split = splitText(element, { type: 'words,chars', wordsClass: 'split-word', charsClass: 'hero-char' });
        return split?.chars?.length ? split.chars : [element];
      });
      hero.fromTo(characters,
        { yPercent: 105, rotationX: -65, opacity: 0, filter: 'blur(16px)', transformOrigin: '50% 100%' },
        { yPercent: 0, rotationX: 0, opacity: 1, filter: 'blur(0px)', duration: .82, stagger: .025, clearProps: 'transform,opacity,filter' }, 0)
        .from('.navbar', { y: -20, opacity: 0, duration: .55, clearProps: 'transform,opacity' }, 0)
        .from('.hero-copy', { y: 25, opacity: 0, duration: .68, clearProps: 'transform,opacity' }, .48)
        .from('.hero-actions > *', { y: 20, opacity: 0, duration: .58, stagger: .07, clearProps: 'transform,opacity' }, .58)
        .from('.hero-portrait .portrait-frame', { opacity: 0, x: 24, duration: 1.2, ease: 'power3.out', clearProps: 'opacity,transform' }, .05)
        .from('.hero-portrait img', { scale: 1.08, duration: 1.5, ease: 'power3.out', clearProps: 'transform' }, .05);
    }
    if (showIntro) {
      const lettering = $('.preloader-lettering', preloader);
      const paths = $$('path', lettering);
      const name = $('.preloader-name-text', preloader);
      const trademark = $('sup', preloader);
      lettering.removeAttribute('hidden');
      preloader.hidden = false;
      gsap.set([name, trademark], { opacity: 0 });
      // Normalized paths are generated from Clash Display; no drawing plugin needed.
      // Outline -> solid letters -> real HTML signature -> site entrance.
      introTimeline = gsap.timeline({ id: 'signature-intro', onComplete: dismissIntro })
        .fromTo(paths, { strokeDashoffset: 1, fillOpacity: 0 },
          { strokeDashoffset: 0, duration: 1.05, stagger: .09, ease: 'power1.inOut' }, .1)
        .to(paths, { fillOpacity: 1, strokeOpacity: 0, duration: .5, stagger: .06, ease: 'power2.inOut' }, 1.05)
        .fromTo(trademark, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: .3, clearProps: 'transform' }, 1.9)
        .set(name, { opacity: 1 }, 2.2)
        .set(lettering, { opacity: 0 }, 2.2)
        .to('.preloader-line', { scaleX: 1, duration: 2.2, ease: 'power2.inOut' }, 0)
        .to(preloader, { yPercent: -100, duration: .8, ease: 'power3.inOut' }, 2.4)
        .call(() => hero.play(), [], 2.55);
      failSafe = window.setTimeout(dismissIntro, 4500);
      document.addEventListener('keydown', dismissIntro, { once: true });
      window.addEventListener('wheel', dismissIntro, { once: true, passive: true });
      window.addEventListener('touchstart', dismissIntro, { once: true, passive: true });
    }
    const textSelector = '.section-title, .portfolio-heading > p, .about-copy > p, .expertise-row h3, .expertise-row p, .studio-copy > p, #contact-title, .contact-panel-title';
    $$(textSelector).forEach(element => {
      const split = splitText(element, { type: 'words', wordsClass: 'blur-word' });
      const words = split?.words?.length ? split.words : [element];
      const isHeading = element.matches('h2,h3,strong,.section-title,.about-lead');
      // Same two-stage word reveal and bidirectional scroll timing as SITE BOW 2.
      gsap.set(words, { y: -42, opacity: 0, filter: 'blur(10px)' });
      gsap.to(words, {
        keyframes: [
          { y: 5, opacity: .5, filter: 'blur(5px)', duration: .35, ease: 'none' },
          { y: 0, opacity: 1, filter: 'blur(0px)', duration: .35, ease: 'none' }
        ],
        stagger: isHeading ? .075 : .035,
        onStart: () => gsap.set(words, { willChange: 'transform,filter,opacity' }),
        onComplete: () => gsap.set(words, { clearProps: 'willChange' }),
        onReverseComplete: () => gsap.set(words, { clearProps: 'willChange' }),
        scrollTrigger: bidirectionalTrigger(element)
      });
    });
    $$('[data-reveal]').filter(element => !element.matches(textSelector) && !element.querySelector(textSelector)).forEach(element => {
      gsap.from(element, { y: 35, opacity: 0, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: element, start: 'top 92%', once: true } });
    });
    const panel = $('.contact-panel');
    if (panel) gsap.from(panel, {
      x: () => window.matchMedia('(max-width: 900px)').matches ? 0 : 42,
      y: () => window.matchMedia('(max-width: 900px)').matches ? 32 : 0,
      scale: .975, opacity: 0, duration: 1.05, ease: 'power3.out',
      scrollTrigger: bidirectionalTrigger('.contact-layout', 'top 80%', 'bottom 20%')
    });
    $$('.about-portrait .portrait-frame').forEach(frame => {
      gsap.from(frame, { clipPath: 'inset(0 0 100% 0)', duration: 1.25, ease: 'power3.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: frame, start: 'top 88%', once: true } });
      gsap.from($('img', frame), { scale: 1.08, duration: 1.5, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: frame, start: 'top 88%', once: true } });
    });
    return () => {
      dismissIntro();
      document.removeEventListener('keydown', dismissIntro);
      window.removeEventListener('wheel', dismissIntro);
      window.removeEventListener('touchstart', dismissIntro);
      splits.forEach(split => split.revert());
    };
  });
  document.fonts.ready.then(() => scrollTrigger.refresh());
  window.addEventListener('load', () => scrollTrigger.refresh(), { once: true });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { if ($('.preloader')) $('.preloader').hidden = true; scrollTrigger.refresh(); }
  });
})();
