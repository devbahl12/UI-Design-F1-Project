/* ============================================================
   car3d.js — Three.js scenes for the F1 learning app.
   Exposes two initializers: initHeroCar() for / and
   initLessonCar() for /learn/1.

   Loads the real Ferrari SF-25 GLB model via GLTFLoader.
   Falls back to the procedural geometry car if the file fails.
   ============================================================ */
(function (global) {
  const THREE_CDN  = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const ORBIT_CDN  = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
  const GLTF_CDN   = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
  const MODEL_URL  = '/static/models/f1car.glb';

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

  let f1AudioCtx;

  function playF1PassBySound(options) {
    options = options || {};
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    f1AudioCtx = f1AudioCtx || new AudioContext();
    if (f1AudioCtx.state === 'suspended') {
      f1AudioCtx.resume();
    }

    const now = f1AudioCtx.currentTime;
    const duration = options.duration || 2.9;
    const startAt = now + (options.delay || 0);
    const peakAt = startAt + duration * 0.42;
    const endAt = startAt + duration;
    const volume = options.volume || 0.72;

    const limiter = f1AudioCtx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-7, now);
    limiter.knee.setValueAtTime(5, now);
    limiter.ratio.setValueAtTime(14, now);
    limiter.attack.setValueAtTime(0.002, now);
    limiter.release.setValueAtTime(0.12, now);
    limiter.connect(f1AudioCtx.destination);

    const master = f1AudioCtx.createGain();
    master.gain.setValueAtTime(0.0001, startAt);
    master.gain.exponentialRampToValueAtTime(volume, startAt + 0.06);
    master.gain.setValueAtTime(volume, peakAt);
    master.gain.exponentialRampToValueAtTime(0.0001, endAt);
    master.connect(limiter);

    const pan = f1AudioCtx.createStereoPanner ? f1AudioCtx.createStereoPanner() : null;
    if (pan) {
      pan.pan.setValueAtTime(options.reverse ? 0.9 : -0.9, startAt);
      pan.pan.linearRampToValueAtTime(options.reverse ? -0.9 : 0.9, endAt - 0.35);
      pan.connect(master);
    }
    const out = pan || master;

    const engineFilter = f1AudioCtx.createBiquadFilter();
    engineFilter.type = 'bandpass';
    engineFilter.Q.setValueAtTime(7.5, startAt);
    engineFilter.frequency.setValueAtTime(1050, startAt);
    engineFilter.frequency.exponentialRampToValueAtTime(4300, peakAt);
    engineFilter.frequency.exponentialRampToValueAtTime(780, endAt);
    engineFilter.connect(out);

    const engineGain = f1AudioCtx.createGain();
    engineGain.gain.setValueAtTime(0.0001, startAt);
    engineGain.gain.exponentialRampToValueAtTime(0.42, startAt + 0.14);
    engineGain.gain.exponentialRampToValueAtTime(0.7, peakAt);
    engineGain.gain.exponentialRampToValueAtTime(0.0001, endAt);
    engineGain.connect(engineFilter);

    [1, 1.98, 3.04, 4.1].forEach((ratio, index) => {
      const osc = f1AudioCtx.createOscillator();
      const gain = f1AudioCtx.createGain();
      osc.type = index === 0 ? 'sawtooth' : 'triangle';
      gain.gain.setValueAtTime(index === 0 ? 0.36 : 0.14 / index, startAt);
      osc.frequency.setValueAtTime(320 * ratio, startAt);
      osc.frequency.exponentialRampToValueAtTime(920 * ratio, peakAt);
      osc.frequency.exponentialRampToValueAtTime(230 * ratio, endAt);
      osc.connect(gain);
      gain.connect(engineGain);
      osc.start(startAt);
      osc.stop(endAt + 0.04);
    });

    const noiseBuffer = f1AudioCtx.createBuffer(1, Math.floor(f1AudioCtx.sampleRate * duration), f1AudioCtx.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noise.length; i += 1) {
      const x = i / noise.length;
      const envelope = Math.sin(Math.PI * x);
      noise[i] = (Math.random() * 2 - 1) * envelope * envelope;
    }

    const noiseSource = f1AudioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = f1AudioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(950, startAt);
    noiseFilter.frequency.exponentialRampToValueAtTime(6200, peakAt);
    noiseFilter.frequency.exponentialRampToValueAtTime(1150, endAt);

    const noiseGain = f1AudioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, startAt);
    noiseGain.gain.exponentialRampToValueAtTime(0.42, peakAt);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, endAt);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(out);
    noiseSource.start(startAt);
    noiseSource.stop(endAt + 0.04);
  }

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

    return group;
  }

  /* Load the real GLB model. Resolves with a THREE.Group.
     Falls back to the procedural car if fetch fails. */
  async function loadCar(THREE, palette, options) {
    options = options || {};
    const modelUrl = options.url || MODEL_URL;
    try {
      const { GLTFLoader } = await import(GLTF_CDN);
      const gltf = await new Promise((resolve, reject) => {
        new GLTFLoader().load(modelUrl, resolve, undefined, reject);
      });
      const model = gltf.scene;

      /* Normalise scale — fit the car's longest axis to 5.5 units */
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 5.5 / maxDim;
      model.scale.setScalar(scale);

      /* Centre the model at origin, wheels touching y=0 */
      box.setFromObject(model);
      const centre = new THREE.Vector3();
      box.getCenter(centre);
      model.position.sub(centre);
      box.setFromObject(model);
      model.position.y -= box.min.y;

      /* Improve material quality on the loaded meshes */
      const accentHex = palette.accent.toLowerCase();
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            /* Hide bright-yellow import artifacts; synthetic DRS parts are handled below. */
            const matColor = child.material.color ? '#' + child.material.color.getHexString().toLowerCase() : '';
            if (matColor === accentHex) {
              child.visible = false;
            }
            child.material.envMapIntensity = 2.5; 
            child.material.needsUpdate = true;
          }
        }
      });

      return model;
    } catch (err) {
      console.warn('GLB load failed, falling back to procedural car:', err);
      return buildCar(THREE, palette);
    }
  }

  function disposeObject(o) {
    o.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    });
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

  function lightScene(THREE, scene, { base, accent, blue }) {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x08080C, 1.2);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(4, 5, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x00E5FF, 1.5);
    rim.position.set(-4, 3, -2);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xFF1E1E, 1.0);
    fill.position.set(0, 4, 6);
    scene.add(fill);
    const back = new THREE.DirectionalLight(0xffffff, 0.5);
    back.position.set(0, 2, -6);
    scene.add(back);
  }

  /* Apply a neutral env map so GLB metallic/roughness materials catch
     reflections. Call after renderer is created. */
  async function applyEnvMap(THREE, renderer, scene) {
    try {
      const { RoomEnvironment } = await import(
        'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js'
      );
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch (_) { /* env map is purely cosmetic — ignore if it fails */ }
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
     - Ignition locks the car to a driving angle and sends it downstage.
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
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(3.0, 1.6, 4.5);
    camera.lookAt(0, 0.5, 0);

    lightScene(THREE, scene, palette);
    const car = await loadCar(THREE, palette);
    scene.add(car);
    scene.add(buildGroundShadow(THREE));

    const renderer = makeRenderer(THREE, canvas);
    applyEnvMap(THREE, renderer, scene);

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      /* Widen FOV on narrow screens so the car fills the frame */
      camera.fov = w < 480 ? 62 : w < 768 ? 55 : 50;
      camera.updateProjectionMatrix();
    }
    resize();
    new ResizeObserver(resize).observe(canvas);

    /* Motion state. */
    const reduced = prefersReducedMotion();
    let yaw = 0, targetYawExtra = 0, pitchExtra = 0;
    let scrollBoost = 1, scrollTimer = null;
    let launchActive = false;
    let launchStart = 0;
    const launchDuration = 4300;
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

    window.addEventListener('hero:ignition', (event) => {
      const active = Boolean(event.detail && event.detail.active);
      launchActive = active;
      launchStart = active ? performance.now() : 0;
      if (!active) {
        car.position.set(0, 0, 0);
        car.rotation.z = 0;
      }
    });

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
        if (launchActive) {
          const p = Math.min(1, (performance.now() - launchStart) / launchDuration);
          const lightsOutP = Math.max(0, Math.min(1, (p - 0.57) / 0.43));
          const launchEase = 1 - Math.pow(1 - lightsOutP, 3);

          if (p >= 1) {
            launchActive = false;
            car.position.set(0, 0, 0);
            car.rotation.z = 0;
            yaw = -0.45;
          } else {
            /* F1-style start: hold on the grid through the red-light build,
               then keep the car framed while the scene implies acceleration. */
            const lockedYaw = -0.45;
            yaw += (lockedYaw - yaw) * 0.16;
            targetYawExtra += (0 - targetYawExtra) * 0.18;
            pitchExtra += (0 - pitchExtra) * 0.18;
            car.rotation.y = yaw;
            car.position.x = 0;
            car.position.z = -0.34 * launchEase;
            car.position.y = Math.sin(t * (lightsOutP > 0 ? 82 : 38)) * (lightsOutP > 0 ? 0.012 : 0.006);
            car.rotation.x = -0.02 + 0.045 * launchEase;
            car.rotation.z = Math.sin(t * 64) * (lightsOutP > 0 ? 0.006 : 0.003);
          }
        } else {
          /* One revolution every ~20s, doubled while scrolling. */
          yaw += (Math.PI * 2 / 20) * dt * scrollBoost;
          /* Mouse parallax: ±5° yaw, ±3° pitch, damped toward target. */
          targetYawExtra += (mouseX * (Math.PI / 180 * 5) - targetYawExtra) * 0.08;
          pitchExtra    += (mouseY * (Math.PI / 180 * 3) - pitchExtra)    * 0.08;
          car.rotation.y = yaw + targetYawExtra;
          /* Gentle bob: 2s period, 4px amplitude (scaled to world units). */
          car.position.x += (0 - car.position.x) * 0.12;
          car.position.y = Math.sin(t * Math.PI) * 0.02;
          car.position.z += (0 - car.position.z) * 0.12;
          car.rotation.x = pitchExtra * 0.4;
          car.rotation.z += (0 - car.rotation.z) * 0.12;
        }
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

  /* ===========================================================
     Lesson car — /learn/1
     - Orbitable via OrbitControls (damping, clamped zoom, no pan).
     - 5 hotspots placed at 3D coords on the car; projected to 2D
       each frame so DOM markers stay pinned to their part.
     - Clicking a hotspot tweens the camera to a preset angle and
       opens the side info panel.
     - Keyboard accessible: hotspots are real <button>s, arrow keys
       orbit the camera, Enter activates the focused hotspot.
     - Reduced-motion: disable auto-orbit and tween instantly.
     =========================================================== */
  async function initLessonCar(opts) {
    opts = opts || {};
    const canvas = document.getElementById(opts.canvasId || 'lesson-car');
    if (!canvas) return;
    const overlay = document.getElementById(opts.overlayId || 'lesson-car-overlay');
    const panel = document.getElementById(opts.panelId || 'component-info');
    const resetBtn = document.getElementById(opts.resetBtnId || 'reset-view');

    const THREE = await import(THREE_CDN);
    const { OrbitControls } = await import(ORBIT_CDN);

    const palette = {
      base: TOKENS.base(), accent: TOKENS.accent(),
      dark: TOKENS.dark(), mid: TOKENS.mid(),
      light: TOKENS.light(), white: TOKENS.white(),
    };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const defaultCamPos = new THREE.Vector3(5.5, 2.8, 7.5);
    camera.position.copy(defaultCamPos);
    camera.lookAt(0, 0.7, 0);

    lightScene(THREE, scene, palette);
    const car = await loadCar(THREE, palette);
    scene.add(car);
    scene.add(buildGroundShadow(THREE));

    const renderer = makeRenderer(THREE, canvas);
    applyEnvMap(THREE, renderer, scene);

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    new ResizeObserver(resize).observe(canvas);

    const reduced = prefersReducedMotion();

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 4.5;
    controls.maxDistance = 14;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 0.7, 0);
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.7;
    /* OrbitControls also binds arrow keys to camera-pan by default;
       we re-route arrows to orbit ourselves below so keyboard users
       can navigate the scene without a mouse. */
    controls.listenToKeyEvents(canvas);

    /* Hotspot 3D anchor positions — mapped to the Ferrari SF-25 GLB
       scaled to 5.5 units along longest axis, nose toward +Z.
       x=0 centre, y=0 ground. */
    const HOTSPOT_WORLD = {
      frontwing: new THREE.Vector3( 0.0, 0.10, 2.60),
      fronttire: new THREE.Vector3( 1.05, 0.45, 1.70),
      halo:      new THREE.Vector3( 0.0, 1.10, 0.20),
      sidepod:   new THREE.Vector3( 0.90, 0.50,-0.10),
      reartire:  new THREE.Vector3( 1.05, 0.45,-1.60),
      rearwing:  new THREE.Vector3( 0.0, 1.30,-1.88),
    };
    const HOTSPOT_CAM = {
      frontwing: new THREE.Vector3( 1.0, 1.2, 6.0),
      fronttire: new THREE.Vector3( 5.0, 1.6, 4.5),
      halo:      new THREE.Vector3( 0.0, 2.8, 5.0),
      sidepod:   new THREE.Vector3( 5.0, 2.0, 3.0),
      reartire:  new THREE.Vector3( 5.0, 1.6,-4.0),
      rearwing:  new THREE.Vector3(-1.0, 3.0,-5.2),
    };

    const hotspotEls = {};
    if (overlay) {
      overlay.querySelectorAll('[data-hotspot-key]').forEach((el) => {
        hotspotEls[el.dataset.hotspotKey] = el;
      });
    }

    /* Project 3D hotspot anchors to 2D each frame so DOM markers
       track with the car as it rotates. */
    function updateOverlayPositions() {
      const rect = canvas.getBoundingClientRect();
      const v = new THREE.Vector3();
      for (const [key, worldPos] of Object.entries(HOTSPOT_WORLD)) {
        const el = hotspotEls[key];
        if (!el) continue;
        v.copy(worldPos).project(camera);
        const x = ( v.x * 0.5 + 0.5) * rect.width;
        const y = (-v.y * 0.5 + 0.5) * rect.height;
        /* Hide markers that are behind the camera (z > 1 in NDC). */
        const visible = v.z < 1;
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        el.style.opacity = visible ? '1' : '0';
        el.style.pointerEvents = visible ? 'auto' : 'none';
      }
    }

    /* Camera tween for hotspot focus. */
    let tweenState = null;
    function tweenCameraTo(targetPos, duration) {
      if (reduced || duration === 0) {
        camera.position.copy(targetPos);
        controls.target.set(0, 0.7, 0);
        controls.update();
        return;
      }
      const startPos = camera.position.clone();
      const startTime = performance.now();
      tweenState = { startPos, targetPos, startTime, duration };
    }

    function stepTween() {
      if (!tweenState) return;
      const t = (performance.now() - tweenState.startTime) / tweenState.duration;
      if (t >= 1) {
        camera.position.copy(tweenState.targetPos);
        tweenState = null;
        return;
      }
      /* cubic-bezier(0.4, 0, 0.2, 1) approximated. */
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.lerpVectors(tweenState.startPos, tweenState.targetPos, e);
    }

    function focusHotspot(key, data) {
      const camTarget = HOTSPOT_CAM[key];
      if (!camTarget) return;
      controls.autoRotate = false;
      tweenCameraTo(camTarget, 400);

      Object.values(hotspotEls).forEach((el) => el.classList.remove('is-active'));
      if (hotspotEls[key]) hotspotEls[key].classList.add('is-active');

      if (panel && data) {
        panel.innerHTML =
          '<div style="font-size:2rem;margin-bottom:12px;">' + (data.icon || '') + '</div>' +
          '<div class="t-caption" style="color:var(--color-base);margin-bottom:6px;">' + (data.name || '') + '</div>' +
          '<p class="t-body" style="color:var(--color-light-grey);">' + (data.desc || '') + '</p>';
      }
    }

    Object.entries(hotspotEls).forEach(([key, el]) => {
      el.addEventListener('click', () => {
        let data = {};
        try { data = JSON.parse(el.dataset.hotspot || '{}'); } catch (_) {}
        focusHotspot(key, data);
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        Object.values(hotspotEls).forEach((el) => el.classList.remove('is-active'));
        controls.autoRotate = !reduced;
        tweenCameraTo(defaultCamPos, 400);
        if (panel) {
          panel.innerHTML = '<p class="t-body" style="color:var(--color-light-grey);text-align:center;">Click a red hotspot on the car to learn more.</p>';
        }
      });
    }

    let running = true;
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) tick();
    });

    function tick() {
      if (!running) return;
      stepTween();
      controls.update();
      renderer.render(scene, camera);
      updateOverlayPositions();
      requestAnimationFrame(tick);
    }
    tick();

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

  global.initLessonCar = initLessonCar;

  /* ===========================================================
     Garage car — /garage
     - Reuses the current GLB in an orbitable studio.
     - Presets update camera, telemetry, lights, aero-flow speed.
     - Launch mode creates a short pit-lane blast without leaving page.
     =========================================================== */
  async function initGarageCar(opts) {
    opts = opts || {};
    const canvas = document.getElementById(opts.canvasId || 'garage-car');
    if (!canvas) return;
    const page = document.querySelector('[data-garage-page]');

    const THREE = await import(THREE_CDN);
    const { OrbitControls } = await import(ORBIT_CDN);
    const palette = {
      base: TOKENS.base(), accent: TOKENS.accent(),
      dark: TOKENS.dark(), mid: TOKENS.mid(),
      light: TOKENS.light(), white: TOKENS.white(),
    };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const camTargets = {
      qualifying: new THREE.Vector3(0.8, 2.25, 6.9),
      wet: new THREE.Vector3(0.2, 3.0, 7.4),
      monza: new THREE.Vector3(1.55, 1.75, 7.1),
    };
    camera.position.copy(camTargets.qualifying);
    camera.lookAt(0, 0.55, 0);

    const GARAGE_MODELS = {
      ferrari: {
        name: 'Ferrari SF-25',
        url: '/static/models/f1car.glb',
        yaw: 0,
        rpmBias: 0,
        dfBias: 0,
      },
      mclaren: {
        name: 'McLaren MCL39',
        url: '/static/models/2025_mclaren_mcl39.glb',
        yaw: 0,
        rpmBias: 180,
        dfBias: -3,
      },
      alpine: {
        name: 'Alpine A525',
        url: '/static/models/2025_alpine_a525.glb',
        yaw: 0,
        rpmBias: -120,
        dfBias: 4,
      },
      mercedes: {
        name: 'Mercedes W11',
        url: '/static/models/2020_f1_mercedes_benz_w11.glb',
        yaw: 0,
        rpmBias: 260,
        dfBias: -5,
      },
      redbull: {
        name: 'Red Bull RB7',
        url: '/static/models/redbull_rb7.glb',
        yaw: 0,
        rpmBias: 420,
        dfBias: -8,
      },
    };

    const hemi = new THREE.HemisphereLight(0xffffff, 0x08080c, 0.9);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 6, 3);
    const rim = new THREE.DirectionalLight(0x00e5ff, 1.8);
    rim.position.set(-4, 3, -3);
    const redKick = new THREE.DirectionalLight(0xff1e1e, 1.1);
    redKick.position.set(0, 2, 6);
    scene.add(hemi, key, rim, redKick);

    let activeModelKey = 'ferrari';
    let car = await loadCar(THREE, palette, { url: GARAGE_MODELS[activeModelKey].url });
    car.rotation.y = GARAGE_MODELS[activeModelKey].yaw;
    scene.add(car);

    const grid = new THREE.GridHelper(8, 16, 0x2b2c36, 0x181922);
    grid.position.y = -0.01;
    scene.add(grid);
    scene.add(buildGroundShadow(THREE));

    const trackLineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.18,
    });
    [-1.9, 1.9].forEach((x) => {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 8), trackLineMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.005, 0);
      scene.add(stripe);
    });

    const flowGroup = new THREE.Group();
    const flowMaterials = [
      new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.55 }),
      new THREE.LineBasicMaterial({ color: 0xff1e1e, transparent: true, opacity: 0.35 }),
    ];
    for (let i = 0; i < 54; i += 1) {
      const z = -3.6 + (i % 18) * 0.42;
      const y = 0.34 + (i % 3) * 0.25;
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (0.75 + ((i * 19) % 38) / 100);
      const points = [
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(x + side * 0.12, y + 0.03, z + 0.72),
      ];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        flowMaterials[i % flowMaterials.length]
      );
      line.userData = {
        baseX: x, baseY: y, baseZ: z,
        speed: 0.45 + (i % 7) * 0.08,
        phase: i * 0.37,
      };
      flowGroup.add(line);
    }
    scene.add(flowGroup);

    const drsFlap = null;

    const renderer = makeRenderer(THREE, canvas);
    applyEnvMap(THREE, renderer, scene);

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < 540 ? 48 : 38;
      camera.updateProjectionMatrix();
    }
    resize();
    new ResizeObserver(resize).observe(canvas);

    const reduced = prefersReducedMotion();
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3.8;
    controls.maxDistance = 11;
    controls.minPolarAngle = Math.PI / 7;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.target.set(0, 0.62, 0);
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.7;

    const PRESETS = {
      qualifying: { rpm: 12800, df: 62, grip: 86, drag: 28, energy: 74, flow: 1.2, rim: 1.9, key: 2.2 },
      wet:        { rpm: 10850, df: 88, grip: 92, drag: 48, energy: 64, flow: 0.8, rim: 2.6, key: 1.8 },
      monza:      { rpm: 13550, df: 38, grip: 78, drag: 16, energy: 90, flow: 1.65, rim: 1.4, key: 2.5 },
    };
    let preset = 'qualifying';
    let flowSpeed = PRESETS[preset].flow;
    let drsOpen = false;
    let launchMode = false;
    let launchEnd = 0;
    let camTween = null;
    const clock = new THREE.Clock();

    function $(selector) {
      return page ? page.querySelector(selector) : null;
    }

    function setText(selector, value) {
      const el = $(selector);
      if (el) el.textContent = value;
    }

    function setBar(selector, value) {
      const el = $(selector);
      if (el) el.style.width = value + '%';
    }

    function currentModel() {
      return GARAGE_MODELS[activeModelKey] || GARAGE_MODELS.ferrari;
    }

    function setTelemetry(values) {
      const model = currentModel();
      const rpm = values.rpm + model.rpmBias;
      const df = Math.max(18, Math.min(95, values.df + model.dfBias));
      setText('[data-garage-rpm]', rpm.toLocaleString());
      setText('[data-garage-df]', df + '%');
      setText('[data-garage-grip-value]', values.grip);
      setText('[data-garage-drag-value]', values.drag);
      setText('[data-garage-energy-value]', values.energy);
      setBar('[data-garage-grip]', values.grip);
      setBar('[data-garage-drag]', values.drag);
      setBar('[data-garage-energy]', values.energy);
    }

    function tweenCameraTo(target) {
      if (reduced) {
        camera.position.copy(target);
        controls.update();
        return;
      }
      camTween = {
        from: camera.position.clone(),
        to: target.clone(),
        started: performance.now(),
        duration: 520,
      };
    }

    function applyPreset(name) {
      if (!PRESETS[name]) return;
      preset = name;
      const values = PRESETS[name];
      flowSpeed = values.flow;
      key.intensity = values.key;
      rim.intensity = values.rim;
      setTelemetry(values);
      setText('[data-garage-status]', name === 'monza' ? 'Low drag map' : name === 'wet' ? 'Wet race map' : 'Quali map');
      if (page) {
        page.querySelectorAll('[data-garage-preset]').forEach((btn) => {
          btn.classList.toggle('is-active', btn.dataset.garagePreset === name);
        });
      }
      tweenCameraTo(camTargets[name]);
    }

    async function switchModel(keyName) {
      const next = GARAGE_MODELS[keyName];
      if (!next || keyName === activeModelKey) return;
      setText('[data-model-status]', 'Loading...');
      if (page) page.classList.add('is-model-loading');
      try {
        const nextCar = await loadCar(THREE, palette, { url: next.url });
        nextCar.rotation.y = next.yaw;
        nextCar.position.y = car.position.y;
        scene.remove(car);
        disposeObject(car);
        car = nextCar;
        scene.add(car);
        activeModelKey = keyName;
        setTelemetry(PRESETS[preset]);
        setText('[data-model-status]', next.name);
        setText('[data-garage-status]', 'Model loaded');
        if (page) {
          page.querySelectorAll('[data-garage-model]').forEach((btn) => {
            btn.classList.toggle('is-active', btn.dataset.garageModel === keyName);
          });
        }
      } catch (err) {
        console.warn('Garage model switch failed:', err);
        setText('[data-model-status]', 'Load failed');
      } finally {
        if (page) page.classList.remove('is-model-loading');
      }
    }

    function playGarageLaunch() {
      launchMode = true;
      launchEnd = performance.now() + 2600;
      if (page) page.classList.add('is-garage-launching');
      setText('[data-garage-status]', 'Launch active');
      playF1PassBySound({
        duration: 3.0,
        volume: 0.78,
        reverse: preset === 'monza',
      });
    }

    if (page) {
      page.querySelectorAll('[data-garage-preset]').forEach((btn) => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.garagePreset));
      });
      page.querySelectorAll('[data-garage-model]').forEach((btn) => {
        btn.addEventListener('click', () => switchModel(btn.dataset.garageModel));
      });
      const launchBtn = $('[data-garage-launch]');
      if (launchBtn) launchBtn.addEventListener('click', playGarageLaunch);
      const orbitBtn = $('[data-garage-orbit]');
      if (orbitBtn) {
        orbitBtn.addEventListener('click', () => {
          controls.autoRotate = !controls.autoRotate;
          orbitBtn.classList.toggle('is-active', controls.autoRotate);
          setText('[data-garage-status]', controls.autoRotate ? 'Auto orbit' : 'Manual orbit');
        });
        orbitBtn.classList.toggle('is-active', controls.autoRotate);
      }
      const flowBtn = $('[data-garage-system="flow"]');
      if (flowBtn) {
        flowBtn.addEventListener('click', () => {
          flowGroup.visible = !flowGroup.visible;
          flowBtn.classList.toggle('is-active', flowGroup.visible);
          setText('[data-flow-state]', flowGroup.visible ? 'On' : 'Off');
        });
      }
      const drsBtn = $('[data-garage-system="drs"]');
      if (drsBtn) {
        drsBtn.addEventListener('click', () => {
          drsOpen = !drsOpen;
          drsBtn.classList.toggle('is-active', drsOpen);
          setText('[data-drs-state]', drsOpen ? 'Open' : 'Closed');
        });
      }
      const lightsBtn = $('[data-garage-system="lights"]');
      if (lightsBtn) {
        lightsBtn.addEventListener('click', () => {
          page.classList.toggle('is-grid-lit');
          const active = page.classList.contains('is-grid-lit');
          lightsBtn.classList.toggle('is-active', active);
          setText('[data-lights-state]', active ? 'Live' : 'Armed');
        });
      }
    }

    applyPreset(preset);

    function stepCameraTween() {
      if (!camTween) return;
      const t = Math.min(1, (performance.now() - camTween.started) / camTween.duration);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.lerpVectors(camTween.from, camTween.to, e);
      if (t >= 1) camTween = null;
    }

    let running = true;
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) tick();
    });

    function tick() {
      if (!running) return;
      const t = clock.getElapsedTime();
      stepCameraTween();
      const launching = launchMode && performance.now() < launchEnd;
      if (launchMode && !launching) {
        launchMode = false;
        if (page) page.classList.remove('is-garage-launching');
        setText('[data-garage-status]', preset === 'monza' ? 'Low drag map' : 'Studio idle');
        setTelemetry(PRESETS[preset]);
      }

      flowGroup.children.forEach((line) => {
        const d = line.userData;
        const shift = ((t * d.speed * flowSpeed) + d.phase) % 1.65;
        line.position.z = shift;
        line.position.y = Math.sin(t * 2 + d.phase) * 0.035;
      });
      if (drsFlap) {
        drsFlap.rotation.x += ((drsOpen ? -0.52 : 0.12) - drsFlap.rotation.x) * 0.1;
      }

      if (!reduced) {
        const launchAmp = launching ? 0.08 : 0.012;
        car.position.y = Math.sin(t * (launching ? 18 : 2.4)) * launchAmp;
        car.position.z = launching ? Math.sin(t * 24) * 0.07 : 0;
        redKick.intensity = launching ? 2.4 + Math.sin(t * 28) * 0.6 : 1.1;
      }
      if (launching) {
        const p = PRESETS[preset];
        const rpm = Math.round(p.rpm + currentModel().rpmBias + Math.sin(t * 20) * 650);
        setText('[data-garage-rpm]', rpm.toLocaleString());
      }

      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();

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

  global.initGarageCar = initGarageCar;

  /* ===========================================================
     Victory lap — optional canvas (e.g. celebratory screen)
     - Car orbits slowly around a torus ground track.
     - Always facing forward along the path (tangent rotation).
     - Reduced-motion: pin car to a static 3/4 view on the track.
     =========================================================== */
  async function initVictoryCar(opts) {
    opts = opts || {};
    const canvas = document.getElementById(opts.canvasId || 'victory-car');
    if (!canvas) return;

    const THREE = await import(THREE_CDN);
    const palette = {
      base: TOKENS.base(), accent: TOKENS.accent(),
      dark: TOKENS.dark(), mid: TOKENS.mid(),
      light: TOKENS.light(), white: TOKENS.white(),
    };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 4.4, 8.5);
    camera.lookAt(0, 0, 0);

    lightScene(THREE, scene, palette);
    const carPromise = loadCar(THREE, palette);

    /* Track: a torus lying flat on the ground + a thin accent inner rim. */
    const track = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.55, 14, 80),
      new THREE.MeshStandardMaterial({ color: palette.mid, metalness: 0.2, roughness: 0.8 })
    );
    track.rotation.x = Math.PI / 2;
    scene.add(track);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.05, 10, 80),
      new THREE.MeshStandardMaterial({ color: palette.base, emissive: palette.base, emissiveIntensity: 0.25 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.6;
    scene.add(rim);

    const car = await carPromise;
    car.scale.multiplyScalar(0.55);
    scene.add(car);

    scene.add(buildGroundShadow(THREE));

    const renderer = makeRenderer(THREE, canvas);
    applyEnvMap(THREE, renderer, scene);

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    new ResizeObserver(resize).observe(canvas);

    const reduced = prefersReducedMotion();
    let angle = 0;
    const RADIUS = 3.4;

    function tick() {
      if (reduced) {
        car.position.set(RADIUS, 0.4, 0);
        car.rotation.y = -Math.PI / 2;
      } else {
        angle += 0.006;
        car.position.set(Math.cos(angle) * RADIUS, 0.4, Math.sin(angle) * RADIUS);
        /* Face tangent to the circle. */
        car.rotation.y = -angle + Math.PI / 2;
      }
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();

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

  global.initVictoryCar = initVictoryCar;
})(window);
