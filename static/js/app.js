$(function () {
  const $page = $('.screen-page[data-lesson-id]');
  if (!$page.length) return;

  const lessonId = $page.data('lesson-id');
  const lessonSlug = $page.data('lesson-slug');

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
      '<div class="small-label" style="color:var(--red);margin-bottom:6px;">' + d.name + '</div>' +
      '<p class="text-muted small mb-0" style="line-height:1.7;">' + d.desc + '</p>'
    );
    logInteraction({ action: 'hotspot', key: d.key });
  });

  // ── TIRES ──
  $('.tire-card').on('click', function () {
    const d = $(this).data('tire');
    $('.tire-card').removeClass('active');
    $(this).addClass('active');
    $('#tire-text').css({ color: d.color, fontStyle: 'normal', fontWeight: 600 }).text(d.text);
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
      color: g.correct ? '#00c853' : (g.key === 'c' ? '#ffd600' : 'var(--red)'),
      fontStyle: 'normal',
    });
    logInteraction({ action: 'gap_select', key: g.key, correct: g.correct });
  });
});
