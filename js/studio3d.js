/* B0W Studio: original symbol geometry and interaction from bow-site (1).
   Polished silver finish, moving studio light and reduced-motion support. */
(() => {
  'use strict';
  const host = document.querySelector('.studio-mark');
  const canvas = document.getElementById('studio-3d');
  const THREE = window.THREE;
  if (!host || !canvas || !THREE || !window.BOW_SYMBOL) return;
  const fallback = host.querySelector('.studio-fallback');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer, frame = 0, failed = false, visible = false;
  let scene, camera, group, pitch, spin, hit, shadow, environment, sweepLight;
  let hover = false, dragging = false, pointerId = null, moved = 0, downAt = 0;
  let lx = 0, ly = 0, velocity = 0, pitchOffset = 0, angle = -.35, speed = 1;
  let jump = -1, intro = 0, elapsed = 0, lastTime = 0;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const fallbackOnly = () => {
    failed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.hidden = true;
    fallback.hidden = false;
    environment?.dispose();
    scene?.traverse(object => {
      object.geometry?.dispose();
      object.material?.map?.dispose();
      object.material?.dispose();
    });
    renderer?.dispose();
  };

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
    camera.position.z = 14;

    // The reference's generated studio reflections require no external textures.
    const lighting = document.createElement('canvas');
    lighting.width = 1024; lighting.height = 512;
    const ctx = lighting.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#f2f4f8'); gradient.addColorStop(.55, '#9a9fa8'); gradient.addColorStop(1, '#2a2b2e');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1024, 512);
    [[60, 30, 90, 400, '#fff'], [300, 0, 30, 512, '#fff'], [470, 60, 240, 50, '#fff'], [780, 20, 120, 430, '#fff'], [140, 250, 200, 14, '#111'], [620, 300, 260, 24, '#111'], [940, 120, 40, 300, '#111']]
      .forEach(([x, y, w, h, color]) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); });
    const texture = new THREE.CanvasTexture(lighting);
    texture.mapping = THREE.EquirectangularReflectionMapping; texture.encoding = THREE.sRGBEncoding;
    const pm = new THREE.PMREMGenerator(renderer);
    environment = pm.fromEquirectangular(texture);
    scene.environment = environment.texture;
    texture.dispose(); pm.dispose();
    scene.add(new THREE.AmbientLight(0xffffff, .35));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-4, 6, 7); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(6, -2, -5); scene.add(rim);
    // A narrow, feathered softbox passes across the actual metallic surface.
    // Its target moves independently of the logo's rotation and pointer input.
    sweepLight = new THREE.SpotLight(0xffffff, 0, 0, .16, .85, 1);
    sweepLight.name = 'silver-sweep';
    scene.add(sweepLight, sweepLight.target);

    const points = window.BOW_SYMBOL;
    const all = points.flat(), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const cx = (minX + maxX) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, scale = 4.2 / (maxX - minX);
    const shapes = points.map(polygon => {
      const shape = new THREE.Shape();
      polygon.forEach(([x, y], i) => shape[i ? 'lineTo' : 'moveTo']((x - cx) * scale, -(y - cy) * scale));
      return shape;
    });
    const geometry = new THREE.ExtrudeGeometry(shapes, { depth: .5, bevelEnabled: true, bevelThickness: .045, bevelSize: .035, bevelSegments: 4, curveSegments: 1 });
    geometry.translate(0, 0, -.25); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ color: 0xc4c7cc, metalness: .95, roughness: .18, clearcoat: .85, clearcoatRoughness: .07, envMapIntensity: 1.35 }));
    group = new THREE.Group(); pitch = new THREE.Group(); spin = new THREE.Group();
    const tilt = new THREE.Group(); tilt.rotation.z = Math.PI / 4;
    tilt.add(mesh); spin.add(tilt); pitch.add(spin); group.add(pitch); scene.add(group);
    hit = new THREE.Mesh(new THREE.SphereGeometry(2.35, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
    pitch.add(hit);

    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 256;
    const shadowCtx = shadowCanvas.getContext('2d');
    const radial = shadowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    radial.addColorStop(0, 'rgba(0,0,0,.6)'); radial.addColorStop(.5, 'rgba(0,0,0,.22)'); radial.addColorStop(1, 'rgba(0,0,0,0)');
    shadowCtx.fillStyle = radial; shadowCtx.fillRect(0, 0, 256, 256);
    shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false, toneMapped: false }));
    shadow.renderOrder = -1; scene.add(shadow);
  } catch (_) { fallbackOnly(); return; }

  function draw(dt = 0) {
    if (failed || !group.userData.size) return;
    const animate = !motion.matches;
    elapsed += dt;
    intro = animate ? Math.min(1, intro + dt * .75) : 1;
    const reveal = 1 - Math.pow(1 - intro, 3);
    const target = dragging ? 0 : hover ? .35 : 1;
    speed += (target - speed) * (1 - Math.exp(-dt * 5));
    if (animate) angle += dt * .55 * (1 + (1 - reveal) * 3) * speed;
    if (!dragging && animate) {
      angle += velocity * dt; velocity *= Math.exp(-dt * 3); pitchOffset *= Math.exp(-dt * 4);
    }
    let hop = 0, kick = 0;
    if (jump >= 0 && animate) {
      jump += dt / .8;
      const t = Math.min(jump, 1);
      hop = Math.sin(Math.PI * t); kick = (1 - Math.pow(1 - t, 3)) * Math.PI * 2;
      if (jump >= 1) jump = -1;
    }
    const size = group.userData.size;
    // 3.2-second light pass, then a quiet interval; no sweep in reduced motion.
    const lightPhase = elapsed % 5.8;
    const lightProgress = Math.min(lightPhase / 3.2, 1);
    const lightX = (lightProgress * 2 - 1) * size * .8;
    sweepLight.position.set(lightX - 1.5, 2.6, 5);
    sweepLight.target.position.set(lightX, -.3, 0);
    sweepLight.intensity = animate && lightPhase < 3.2 ? 6 * Math.pow(Math.sin(Math.PI * lightProgress), 2) : 0;
    spin.rotation.y = angle + kick;
    pitch.rotation.x = THREE.MathUtils.degToRad(10) + pitchOffset;
    group.scale.setScalar(size / 4.7 * (.7 + .3 * reveal));
    group.position.set(0, -.3 + hop * size * .3 + (animate ? Math.sin(elapsed * .9) * .06 : 0), 0);
    const lift = hop * .3, breadth = .3 + .7 * Math.abs(Math.cos(spin.rotation.y));
    shadow.position.set(0, -.3 - size * .52, -.4);
    shadow.scale.set(size * .85 * breadth * Math.max(.45, 1 - lift * 1.6), size * .13, 1);
    shadow.material.opacity = .85 * reveal * Math.max(.35, 1 - lift * 1.6);
    try { renderer.render(scene, camera); } catch (_) { fallbackOnly(); return; }
    canvas.hidden = false; fallback.hidden = true;
  }
  function loop(time) {
    frame = 0;
    if (failed || !visible || document.hidden) return;
    draw(lastTime ? Math.min((time - lastTime) / 1000, .05) : 0);
    lastTime = time;
    if (!failed && !motion.matches) frame = requestAnimationFrame(loop);
  }
  function wake() {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    if (!failed && visible && !document.hidden) frame = requestAnimationFrame(loop);
  }
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (failed || !w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const vh = 2 * Math.tan(Math.PI / 12) * camera.position.z;
    // Leave headroom for the reference's jump, including narrow mobile screens.
    group.userData.size = Math.min(vh * camera.aspect * .9, vh * .67);
    draw(); wake();
  }
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; wake(); }).observe(host);
  document.addEventListener('visibilitychange', wake);
  motion.addEventListener('change', () => { jump = -1; velocity = 0; draw(); wake(); });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fallbackOnly(); });

  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  function over(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    ray.setFromCamera(mouse, camera);
    return ray.intersectObject(hit).length > 0;
  }
  function cursor() {
    canvas.classList.toggle('is-grab', hover && !dragging);
    canvas.classList.toggle('is-grabbing', dragging);
  }
  canvas.addEventListener('pointermove', event => {
    if (dragging && event.pointerId === pointerId) {
      const dx = event.clientX - lx, dy = event.clientY - ly;
      lx = event.clientX; ly = event.clientY; moved += Math.abs(dx) + Math.abs(dy);
      angle += dx * .009; velocity = clamp(dx * .009 / .016, -8, 8);
      pitchOffset = clamp(pitchOffset + dy * .005, -.6, .6);
      if (motion.matches) draw();
    } else hover = over(event);
    cursor();
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || dragging || !over(event)) return;
    dragging = true; hover = true; pointerId = event.pointerId;
    moved = 0; lx = event.clientX; ly = event.clientY; downAt = performance.now(); velocity = 0;
    canvas.setPointerCapture(event.pointerId); cursor();
  });
  function release(event) {
    if (!dragging || event.pointerId !== pointerId) return;
    dragging = false;
    if (event.type === 'pointerup' && moved < 6 && performance.now() - downAt < 350 && !motion.matches) jump = 0;
    if (event.type !== 'pointerup') velocity = 0;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    pointerId = null; hover = event.pointerType === 'mouse' && over(event); cursor();
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('pointerleave', () => { if (!dragging) { hover = false; cursor(); } });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') angle -= .2;
    if (event.key === 'ArrowRight') angle += .2;
    if (event.key === 'ArrowUp') pitchOffset = clamp(pitchOffset - .1, -.6, .6);
    if (event.key === 'ArrowDown') pitchOffset = clamp(pitchOffset + .1, -.6, .6);
    if (['Enter', ' '].includes(event.key) && !motion.matches) jump = 0;
    if (event.key === 'Escape') { angle = -.35; pitchOffset = 0; jump = -1; velocity = 0; }
    draw(); wake();
  });
  resize();
})();
