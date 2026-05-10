$(function () {
  const $page = $('.screen-page[data-lesson-id]');
  if (!$page.length) return;

  const lessonId = $page.data('lesson-id');
  const lessonSlug = $page.data('lesson-slug');
  const telemetryPresets = {
    'car-components': { speed: 118, rpm: 6200, g: 1.6, state: 'Inspecting chassis' },
    tires: { speed: 164, rpm: 7900, g: 2.2, state: 'Compound analysis' },
    'tire-degradation': { speed: 228, rpm: 9600, g: 3.1, state: 'Managing stint' },
    'performance-degradation': { speed: 242, rpm: 10100, g: 3.4, state: 'Track sim active' },
    aerodynamics: { speed: 276, rpm: 11200, g: 4.0, state: 'Aero wake scan' },
    'finding-the-gap': { speed: 198, rpm: 8800, g: 2.6, state: 'Pit window watch' },
  };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function updateTelemetry(next) {
    const $hud = $('[data-live-telemetry]');
    if (!$hud.length) return;
    const speed = clamp(Math.round(next.speed), 0, 360);
    const rpm = clamp(Math.round(next.rpm), 0, 14000);
    const g = clamp(Number(next.g), 0, 6).toFixed(1);
    $hud.find('[data-telemetry-speed]').text(speed);
    $hud.find('[data-telemetry-rpm]').text(rpm.toLocaleString());
    $hud.find('[data-telemetry-g]').text(g);
    $hud.find('[data-telemetry-state]').text(next.state || 'Live update');
    $hud.find('[data-telemetry-speed-bar]').css('width', clamp((speed / 360) * 100, 8, 100) + '%');
    $hud.find('[data-telemetry-rpm-bar]').css('width', clamp((rpm / 14000) * 100, 8, 100) + '%');
    $hud.addClass('is-updating');
    clearTimeout($hud.data('pulseTimer'));
    $hud.data('pulseTimer', setTimeout(() => $hud.removeClass('is-updating'), 260));
  }

  updateTelemetry(telemetryPresets[lessonSlug] || {
    speed: 220,
    rpm: 9400,
    g: 3.0,
    state: 'Lesson active',
  });

  function logInteraction(payload) {
    $.ajax({
      url: '/learn/' + lessonId + '/interact',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
    });
  }

  // ── CAR HOTSPOTS ──
  $('.hs-dot').on('click', function () {
    const d = $(this).data('hotspot');
    $('#component-info').html(
      '<div style="font-size:2rem;margin-bottom:12px;">' + d.icon + '</div>' +
      '<div class="small-label" style="color:var(--color-base);margin-bottom:6px;">' + d.name + '</div>' +
      '<p class="text-muted small mb-0" style="line-height:1.7;">' + d.desc + '</p>'
    );
    const hotspotTelemetry = {
      frontwing: { speed: 244, rpm: 9800, g: 3.8, state: 'Front wing load' },
      fronttire: { speed: 178, rpm: 8200, g: 2.7, state: 'Front tire scan' },
      halo: { speed: 96, rpm: 5200, g: 1.2, state: 'Safety cell focus' },
      sidepod: { speed: 216, rpm: 9300, g: 3.2, state: 'Cooling flow' },
      reartire: { speed: 204, rpm: 10100, g: 3.5, state: 'Traction phase' },
      rearwing: { speed: 292, rpm: 11800, g: 4.4, state: 'Rear aero load' },
    };
    updateTelemetry(hotspotTelemetry[d.key] || telemetryPresets[lessonSlug]);
    logInteraction({ action: 'hotspot', key: d.key });
  });

  // ── TIRES ──
  $('.tire-card').on('click', function () {
    const d = $(this).data('tire');
    $('.tire-card').removeClass('active');
    $(this).addClass('active');
    $('#tire-text').css({ color: d.color, fontStyle: 'normal', fontWeight: 600 }).text(d.text);
    const tireTelemetry = {
      soft: { speed: 302, rpm: 12400, g: 4.7, state: 'Soft attack lap' },
      med: { speed: 286, rpm: 11300, g: 4.2, state: 'Balanced stint' },
      hard: { speed: 268, rpm: 10600, g: 3.8, state: 'Long-run mode' },
      inter: { speed: 232, rpm: 9600, g: 3.0, state: 'Damp track mode' },
      wet: { speed: 196, rpm: 8300, g: 2.4, state: 'Heavy rain mode' },
    };
    updateTelemetry(tireTelemetry[d.key] || telemetryPresets[lessonSlug]);
    logInteraction({ action: 'tire_select', key: d.key });
  });

  // ── WEAR SLIDER ──
  const $wear = $('#wear-slider');
  if ($wear.length) {
    function updateDegradation(v) {
      v = parseInt(v, 10);
      $wear[0].style.setProperty('--pct', v + '%');
      const base = 80.0;
      const lapTime = v < 60 ? base + (v / 60) * 3.5 : base + 3.5 + Math.pow((v - 60) / 40, 1.8) * 14;
      const mins = Math.floor(lapTime / 60);
      const secs = (lapTime % 60).toFixed(1).padStart(4, '0');
      $('#laptime-display').text(mins + ':' + secs);
      $('#grip-cover').css('width', (100 - v) + '%');
      const $grip = $('#grip-label');
      const $msg = $('#degrad-msg');
      if (v < 35)      { $grip.text('High Grip').css('color', '#00c853'); }
      else if (v < 65) { $grip.text('Medium Grip').css('color', '#ffd600'); }
      else if (v < 82) { $grip.text('Low Grip').css('color', '#ff7043'); }
      else             { $grip.text('Critical — Pit Now!').css('color', '#e10600'); }
      if (v >= 82) { $msg.text('⚠️ Cliff reached — lap times collapsing. Box box box!').css({ color: '#e10600', background: 'rgba(225,6,0,0.08)' }); }
      else if (v >= 60) { $msg.text('⚡ Approaching the cliff — consider pitting in the next 2–3 laps.').css({ color: '#ffd600', background: 'rgba(255,214,0,0.06)' }); }
      else { $msg.text('✓ Tires in good shape. Stay out and push.').css({ color: '#00c853', background: 'rgba(0,200,83,0.06)' }); }
      updateTelemetry({
        speed: 312 - v * 1.45,
        rpm: 12400 - v * 42,
        g: 4.8 - v * 0.026,
        state: v >= 82 ? 'Cliff reached' : v >= 60 ? 'Degradation rising' : 'Tires stable',
      });
    }
    $wear.on('input', function () { updateDegradation(this.value); });
    $wear.on('change', function () { logInteraction({ action: 'wear_set', value: parseInt(this.value, 10) }); });
    updateDegradation($wear.val());
  }

  // ── PERF SLIDER + ANIMATION ──
  const $perf = $('#perf-slider');
  if ($perf.length) {
    let perfWear = parseInt($perf.val(), 10);
    let carAngle = 0;
    let animFrame = null;

    function tick() {
      const speed = 0.005 + ((100 - perfWear) / 100) * 0.03;
      carAngle = ((carAngle - speed) + Math.PI * 2) % (Math.PI * 2);
      const $wrapper = $('.track-wrapper');
      const $car = $('#perf-car');
      if (!$wrapper.length || !$car.length) return;
      const w = $wrapper[0].offsetWidth;
      const h = $wrapper[0].offsetHeight;
      const rx = Math.min(w * 0.40, 252);
      const ry = Math.min(h * 0.39, 96);
      const cx = w / 2, cy = h / 2;
      const x = cx + rx * Math.cos(carAngle);
      const y = cy + ry * Math.sin(carAngle);
      const deg = (carAngle * 180 / Math.PI) - 90;
      $car.css({ left: x + 'px', top: y + 'px', transform: 'translate(-50%,-50%) rotate(' + deg + 'deg)' });
      animFrame = requestAnimationFrame(tick);
    }
    tick();

    function updatePerf(v) {
      perfWear = parseInt(v, 10);
      $perf[0].style.setProperty('--pct', v + '%');
      const lapTime = 80.0 + (perfWear / 100) * 10;
      const mins = Math.floor(lapTime / 60);
      const secs = (lapTime % 60).toFixed(1).padStart(4, '0');
      $('#perf-laptime').text(mins + ':' + secs);
      const $label = $('#perf-grip-label');
      if (perfWear < 35) $label.text('High Grip').css('color', '#00c853');
      else if (perfWear < 65) $label.text('Medium Grip').css('color', '#ffd600');
      else $label.text('Low Grip').css('color', '#e10600');
      updateTelemetry({
        speed: 318 - perfWear * 1.35,
        rpm: 12600 - perfWear * 38,
        g: 5.0 - perfWear * 0.028,
        state: perfWear < 35 ? 'Grip window optimal' : perfWear < 65 ? 'Grip fading' : 'Low grip warning',
      });
    }
    $perf.on('input', function () { updatePerf(this.value); });
    $perf.on('change', function () { logInteraction({ action: 'perf_set', value: parseInt(this.value, 10) }); });
    updatePerf($perf.val());
  }

  // ── GAP ──
  $('.gap-slot').on('click', function () {
    const g = $(this).data('gap');
    $('.gap-slot').removeClass('selected-correct selected-wrong');
    $(this).addClass(g.correct ? 'selected-correct' : 'selected-wrong');
    $('#gap-feedback').text(g.feedback).css({
      color: g.correct ? '#00c853' : (g.key === 'c' ? '#ffd600' : 'var(--color-base)'),
      fontStyle: 'normal',
    });
    updateTelemetry({
      speed: g.correct ? 224 : g.key === 'c' ? 188 : 154,
      rpm: g.correct ? 10400 : g.key === 'c' ? 9100 : 7600,
      g: g.correct ? 3.4 : g.key === 'c' ? 2.8 : 2.1,
      state: g.correct ? 'Clean air found' : g.key === 'c' ? 'Backmarker risk' : 'Dirty air warning',
    });
    logInteraction({ action: 'gap_select', key: g.key, correct: g.correct });
  });
});
