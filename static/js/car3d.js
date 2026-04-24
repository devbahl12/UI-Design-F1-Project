/* ============================================================
   car3d.js — Three.js scenes for the F1 learning app.
   Exposes two initializers: initHeroCar() for / and
   initLessonCar() for /learn/1.

   The car is built procedurally from primitives so we're never at
   the mercy of a remote GLB URL going 404 on submission day. It's
   an open-wheel silhouette: chassis, nose, two wings, halo arch,
   four wheels — stylized, not photoreal.
   ============================================================ */
(function (global) {
  const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const ORBIT_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

  /* Pull design tokens out of CSS so JS materials match the
     stylesheet exactly. Fallbacks mirror :root. */
  function readToken(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  const TOKENS = {
    base:      () => readToken('--color-base',      '#DC0000'),
    accent:    () => readToken('--color-accent',    '#FFF200'),
    dark:      () => readToken('--color-dark-grey', '#0F0F12'),
    mid:       () => readToken('--color-mid-grey',  '#1E1E24'),
    light:     () => readToken('--color-light-grey','#A1A1AA'),
    white:     () => readToken('--color-white',     '#FAFAFA'),
  };

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Procedural F1 car ---- */
  function buildCar(THREE, { base, accent, dark, light }) {
    const group = new THREE.Group();

    const carBody = new THREE.MeshStandardMaterial({
      color: base, metalness: 0.55, roughness: 0.35,
    });
    const carAccent = new THREE.MeshStandardMaterial({
      color: accent, metalness: 0.3, roughness: 0.5,
    });
    const carDark = new THREE.MeshStandardMaterial({
      color: dark, metalness: 0.6, roughness: 0.4,
    });
    const carTire = new THREE.MeshStandardMaterial({
      color: '#15151a', metalness: 0.1, roughness: 0.9,
    });
    const carRim = new THREE.MeshStandardMaterial({
      color: light, metalness: 0.8, roughness: 0.3,
    });

    /* Chassis — long low box that forms the monocoque. */
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.22, 3.6),
      carBody
    );
    chassis.position.y = 0.30;
    group.add(chassis);

    /* Engine cover sitting on top of the monocoque. */
    const engine = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 1.1),
      carBody
    );
    engine.position.set(0, 0.52, -0.3);
    group.add(engine);

    /* Airbox — stubby tapered piece behind cockpit. */
    const airbox = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.55, 4),
      carDark
    );
    airbox.rotation.y = Math.PI / 4;
    airbox.position.set(0, 0.78, -0.35);
    group.add(airbox);

    /* Nose cone — tapered toward front wing. */
    const nose = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.22, 1.3, 18),
      carBody
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.34, 1.5);
    group.add(nose);

    /* Front wing — wide low airfoil. */
    const frontWing = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.05, 0.38),
      carBody
    );
    frontWing.position.set(0, 0.22, 2.05);
    group.add(frontWing);

    const frontWingEndplateL = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.18, 0.38),
      carAccent
    );
    frontWingEndplateL.position.set(-0.95, 0.27, 2.05);
    group.add(frontWingEndplateL);
    const frontWingEndplateR = frontWingEndplateL.clone();
    frontWingEndplateR.position.x = 0.95;
    group.add(frontWingEndplateR);

    /* Rear wing — tall vertical element at back. */
    const rearWingPostL = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.62, 0.08),
      carDark
    );
    rearWingPostL.position.set(-0.25, 0.72, -1.75);
    group.add(rearWingPostL);
    const rearWingPostR = rearWingPostL.clone();
    rearWingPostR.position.x = 0.25;
    group.add(rearWingPostR);

    const rearWing = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.08, 0.42),
      carBody
    );
    rearWing.position.set(0, 1.0, -1.75);
    group.add(rearWing);

    const rearWingUpper = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.05, 0.28),
      carAccent
    );
    rearWingUpper.position.set(0, 1.08, -1.75);
    group.add(rearWingUpper);

    /* Sidepods — flanking the monocoque. */
    const sidepodL = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.32, 1.8),
      carBody
    );
    sidepodL.position.set(-0.7, 0.36, -0.15);
    group.add(sidepodL);
    const sidepodR = sidepodL.clone();
    sidepodR.position.x = 0.7;
    group.add(sidepodR);

    /* Halo — mandatory safety arch above cockpit. */
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.035, 12, 24, Math.PI),
      carDark
    );
    halo.position.set(0, 0.72, 0.28);
    halo.rotation.x = -Math.PI / 2;
    halo.rotation.z = Math.PI;
    group.add(halo);

    /* Cockpit opening — small dark rounded cut. */
    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      carDark
    );
    cockpit.position.set(0, 0.42, 0.28);
    cockpit.rotation.x = Math.PI;
    group.add(cockpit);

    /* Wheels — CylinderGeometry rotated around Z so they roll around X. */
    function wheel(x, z) {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.28, 20),
        carTire
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, 0.34, z);
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.30, 16),
        carRim
      );
      rim.rotation.z = Math.PI / 2;
      rim.position.set(x, 0.34, z);
      const g = new THREE.Group();
      g.add(tire); g.add(rim);
      return g;
    }
    group.add(wheel(-0.8, 1.25));  // front left
    group.add(wheel( 0.8, 1.25));  // front right
    group.add(wheel(-0.8, -1.25)); // rear left
    group.add(wheel( 0.8, -1.25)); // rear right

    /* Tiny livery stripes over the engine cover for visual interest. */
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.23, 1.1),
      carAccent
    );
    stripe.position.set(0, 0.53, -0.3);
    group.add(stripe);

    return group;
  }

  /* Soft ground shadow plane — simple radial gradient sprite so
     we don't need ContactShadows from addons. */
  function buildGroundShadow(THREE) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(256, 256, 20, 256, 256, 240);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false,
    });
    const geo = new THREE.PlaneGeometry(6, 6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.001;
    return mesh;
  }

  function lightScene(THREE, scene, { base, accent }) {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x101018, 0.6);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(base, 0.85);
    key.position.set(4, 5, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(accent, 0.45);
    rim.position.set(-4, 3, -2);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(0, 4, 6);
    scene.add(fill);
  }

  /* Cap devicePixelRatio at 2 — beyond that, fill-rate hurts. */
  function makeRenderer(THREE, canvas) {
    const renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    return renderer;
  }

  /* ===========================================================
     Hero car — /
     - Continuous slow yaw, subtle floating bob.
     - Scroll doubles rotation speed while user is scrolling.
     - Mouse parallax on canvas: ±5° yaw, ±3° pitch with damping.
     - Reduced-motion: pin to a 3/4 static pose.
     =========================================================== */
  async function initHeroCar(opts) {
    opts = opts || {};
    const canvas = document.getElementById(opts.canvasId || 'hero-car');
    if (!canvas) return;

    const THREE = await import(THREE_CDN);
    const palette = {
      base: TOKENS.base(), accent: TOKENS.accent(),
      dark: TOKENS.dark(), mid: TOKENS.mid(),
      light: TOKENS.light(), white: TOKENS.white(),
    };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(3.4, 1.8, 5.2);
    camera.lookAt(0, 0.45, 0);

    lightScene(THREE, scene, palette);
    const car = buildCar(THREE, palette);
    scene.add(car);
    scene.add(buildGroundShadow(THREE));

    const renderer = makeRenderer(THREE, canvas);

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    new ResizeObserver(resize).observe(canvas);

    /* Motion state. */
    const reduced = prefersReducedMotion();
    let yaw = 0, targetYawExtra = 0, pitchExtra = 0;
    let scrollBoost = 1, scrollTimer = null;
    let mouseX = 0, mouseY = 0;

    if (!reduced) {
      window.addEventListener('scroll', () => {
        scrollBoost = 2;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => { scrollBoost = 1; }, 200);
      }, { passive: true });
    }

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;   // -1..1
      mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    });
    canvas.addEventListener('pointerleave', () => { mouseX = 0; mouseY = 0; });

    /* Pause when tab hidden to save CPU. */
    let running = true;
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) tick();
    });

    const clock = new THREE.Clock();

    function tick() {
      if (!running) return;
      const dt = clock.getDelta();
      const t = clock.getElapsedTime();

      if (reduced) {
        car.rotation.y = -0.5;
      } else {
        /* One revolution every ~20s, doubled while scrolling. */
        yaw += (Math.PI * 2 / 20) * dt * scrollBoost;
        /* Mouse parallax: ±5° yaw, ±3° pitch, damped toward target. */
        targetYawExtra += (mouseX * (Math.PI / 180 * 5) - targetYawExtra) * 0.08;
        pitchExtra    += (mouseY * (Math.PI / 180 * 3) - pitchExtra)    * 0.08;
        car.rotation.y = yaw + targetYawExtra;
        /* Gentle bob: 2s period, 4px amplitude (scaled to world units). */
        car.position.y = Math.sin(t * Math.PI) * 0.02;
        car.rotation.x = pitchExtra * 0.4;
      }

      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();

    /* Dispose on unload to avoid WebGL context leaks. */
    window.addEventListener('pagehide', () => {
      renderer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }, { once: true });
  }

  global.initHeroCar = initHeroCar;
})(window);
