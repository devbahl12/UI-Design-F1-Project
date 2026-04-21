let selectedMode = 'learning';
let quizPlayerName = '';

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + id);
  if (el) el.classList.add('active');
  updateProgressDots(id);
}

function updateProgressDots(screenId) {
  const order = ['car-components','tires','tire-degradation','performance-degradation','aerodynamics','finding-the-gap'];
  const currentIdx = order.indexOf(screenId);
  if (currentIdx === -1) return;
  const dotContainerIds = {
    'car-components':          'pd-car',
    'tires':                   'pd-tires',
    'tire-degradation':        'pd-degrad',
    'performance-degradation': 'pd-perf',
    'aerodynamics':            'pd-aero',
    'finding-the-gap':         'pd-gap',
  };
  const container = document.getElementById(dotContainerIds[screenId]);
  if (!container) return;
  container.innerHTML = order.map((_, i) => {
    let cls = 'pd';
    if (i === currentIdx) cls += ' active';
    else if (i < currentIdx) cls += ' done';
    return `<div class="${cls}"></div>`;
  }).join('');
}

function selectMode(mode) {
  selectedMode = mode;
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('mode-' + mode).classList.add('selected');
}

function startSelected() {
  showScreen(selectedMode === 'learning' ? 'learning-menu' : 'quiz-intro');
}

// ── CAR COMPONENTS ──
const componentData = {
  frontwing: { icon: '🔻', name: 'Front Wing',  desc: 'Generates downforce at the nose. Small angle tweaks shift the handling balance — teams adjust it lap by lap via radio to counter tire wear.' },
  fronttire: { icon: '⭕', name: 'Front Tires', desc: 'Pirelli-supplied slicks. The fronts handle braking and turn-in loads, and run cooler than the rears — making them less prone to graining.' },
  halo:      { icon: '🛡️', name: 'Halo',       desc: 'Mandatory titanium safety arch above the cockpit. Protects the driver from debris and rollover forces. Introduced in 2018 and has since saved multiple lives.' },
  sidepod:   { icon: '❄️', name: 'Sidepod',    desc: 'Houses the water and oil radiators. The shape is among the most contested aerodynamic battlegrounds — teams spend millions optimizing the airflow around it.' },
  rearwing:  { icon: '✈️', name: 'Rear Wing',  desc: 'The main downforce generator. DRS opens the rear flap on designated straights, cutting drag and increasing top speed by up to 15 km/h.' },
  reartire:  { icon: '🔄', name: 'Rear Tires', desc: 'Wider than the fronts to handle power delivery. Most vulnerable to degradation under heavy acceleration — often the deciding factor in pit strategy.' }
};

function showComponent(key) {
  const d = componentData[key];
  document.getElementById('component-info').innerHTML = `
    <div style="font-size:2rem;margin-bottom:12px;">${d.icon}</div>
    <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--red);margin-bottom:6px;">${d.name}</div>
    <p style="color:var(--text-2);line-height:1.7;font-size:0.86rem;">${d.desc}</p>
  `;
}

// ── TIRES ──
const tireData = {
  soft:  { color: '#e10600', text: 'SOFT — Fastest compound on track, generating maximum grip. Typically lasts only 10–15 laps before the cliff. Used in qualifying and attack stints.' },
  med:   { color: '#ffd600', text: 'MEDIUM — The race workhorse. Balanced grip and durability, usually good for 20–30 laps. Most strategies are built around it.' },
  hard:  { color: '#e0e0e0', text: 'HARD — Slowest but can run 40+ laps. Preferred for long stints or when track temps are extreme. Less sensitive to thermal degradation.' },
  inter: { color: '#00c853', text: 'INTERMEDIATE — Built for damp or drying conditions. Deep tread evacuates water without full wet grooves. Often the fastest option in tricky weather transitions.' },
  wet:   { color: '#2979ff', text: 'FULL WET — For heavy rain. Channels up to 85 litres of water per second per tire. Teams move to slicks as soon as conditions allow.' }
};

function selectTire(card, type) {
  document.querySelectorAll('.tire-card').forEach(c => c.classList.remove('active'));
  card.classList.add('active');
  const d = tireData[type];
  const el = document.getElementById('tire-text');
  el.style.color = d.color;
  el.style.fontWeight = '600';
  el.textContent = d.text;
}

// ── TIRE DEGRADATION ──
function updateDegradation(val) {
  const v = parseInt(val);
  document.getElementById('wear-slider').style.setProperty('--pct', v + '%');

  const base = 80.0;
  let lapTime = v < 60
    ? base + (v / 60) * 3.5
    : base + 3.5 + Math.pow((v - 60) / 40, 1.8) * 14;

  const mins = Math.floor(lapTime / 60);
  const secs = (lapTime % 60).toFixed(1).padStart(4, '0');
  document.getElementById('laptime-display').textContent = `${mins}:${secs}`;

  document.getElementById('grip-cover').style.width = (100 - v) + '%';

  const gripEl = document.getElementById('grip-label');
  if      (v < 35) { gripEl.textContent = 'High Grip';           gripEl.style.color = '#00c853'; }
  else if (v < 65) { gripEl.textContent = 'Medium Grip';         gripEl.style.color = '#ffd600'; }
  else if (v < 82) { gripEl.textContent = 'Low Grip';            gripEl.style.color = '#ff7043'; }
  else             { gripEl.textContent = 'Critical — Pit Now!'; gripEl.style.color = '#e10600'; }

  const msg = document.getElementById('degrad-msg');
  if (v >= 82) {
    msg.textContent = '⚠️ Cliff reached — lap times collapsing. Box box box!';
    msg.style.color = '#e10600';
    msg.style.background = 'rgba(225,6,0,0.08)';
  } else if (v >= 60) {
    msg.textContent = '⚡ Approaching the cliff — consider pitting in the next 2–3 laps.';
    msg.style.color = '#ffd600';
    msg.style.background = 'rgba(255,214,0,0.06)';
  } else {
    msg.textContent = '✓ Tires in good shape. Stay out and push.';
    msg.style.color = '#00c853';
    msg.style.background = 'rgba(0,200,83,0.06)';
  }
}

updateDegradation(20);

// ── PERFORMANCE DEGRADATION animation ──
let animFrame = null;
let carAngle  = 0;
let perfWear  = 15;

function startCarAnimation() {
  if (animFrame) return;
  tickCar();
}

function stopCarAnimation() {
  cancelAnimationFrame(animFrame);
  animFrame = null;
}

function tickCar() {
  const speed = 0.005 + ((100 - perfWear) / 100) * 0.03;
  // counterclockwise: subtract angle
  carAngle = ((carAngle - speed) + Math.PI * 2) % (Math.PI * 2);

  const wrapper = document.querySelector('.track-wrapper');
  const car     = document.getElementById('perf-car');
  if (!wrapper || !car) return;

  const w  = wrapper.offsetWidth;
  const h  = wrapper.offsetHeight;
  const rx = Math.min(w * 0.40, 252);
  const ry = Math.min(h * 0.39, 96);
  const cx = w / 2;
  const cy = h / 2;

  const x   = cx + rx * Math.cos(carAngle);
  const y   = cy + ry * Math.sin(carAngle);
  // counterclockwise tangent: deg = angle - 90
  const deg = (carAngle * 180 / Math.PI) - 90;

  car.style.left      = x + 'px';
  car.style.top       = y + 'px';
  car.style.transform = `translate(-50%,-50%) rotate(${deg}deg)`;

  animFrame = requestAnimationFrame(tickCar);
}

function updatePerf(val) {
  perfWear = parseInt(val);
  document.getElementById('perf-slider').style.setProperty('--pct', val + '%');

  const lapTime = 80.0 + (perfWear / 100) * 10;
  const mins    = Math.floor(lapTime / 60);
  const secs    = (lapTime % 60).toFixed(1).padStart(4, '0');
  document.getElementById('perf-laptime').textContent = `${mins}:${secs}`;

  const label = document.getElementById('perf-grip-label');
  if      (perfWear < 35) { label.textContent = 'High Grip';   label.style.color = '#00c853'; }
  else if (perfWear < 65) { label.textContent = 'Medium Grip'; label.style.color = '#ffd600'; }
  else                    { label.textContent = 'Low Grip';    label.style.color = '#e10600'; }
}

// intercept showScreen to start/stop the lap animation
const _origShowScreen = showScreen;
showScreen = function(id) {
  _origShowScreen(id);
  if (id === 'performance-degradation') startCarAnimation();
  else stopCarAnimation();
};

// ── AERODYNAMICS INTERACTIVE ──
(function initAeroSim() {
  let aeroGap = 55; // 0 = right behind, 100 = far behind

  function renderAero(gap) {
    const simWrap  = document.getElementById('aero-sim-wrap');
    const carFollow = document.getElementById('aero-car-follow');
    const turbulence = document.getElementById('aero-turbulence');
    const dfBar    = document.getElementById('aero-df-bar');
    const dfLabel  = document.getElementById('aero-df-label');
    const tireBar  = document.getElementById('aero-tire-bar');
    const aeroMsg  = document.getElementById('aero-msg');
    if (!simWrap) return;

    const leadLeft = 22; // % across the sim strip
    // following car: gap=0 means right behind lead (leadLeft + small offset), gap=100 means far right
    const followLeft = leadLeft + 8 + (gap / 100) * 45;
    const turbLeft   = leadLeft + 5;
    const turbWidth  = Math.max(0, followLeft - leadLeft - 2);

    // downforce drops steeply when gap < 30
    const df = gap < 30
      ? 40 + (gap / 30) * 60
      : 70 + Math.min((gap - 30) / 70, 1) * 30;
    const tireHeat = gap < 30
      ? 90 - (gap / 30) * 60
      : 30 - Math.min((gap - 30) / 70, 1) * 25;

    if (carFollow) carFollow.style.left = followLeft + '%';
    if (turbulence) {
      turbulence.style.left  = turbLeft + '%';
      turbulence.style.width = turbWidth + '%';
      turbulence.style.opacity = Math.max(0, 1 - gap / 60);
    }
    if (dfBar)   dfBar.style.width   = df + '%';
    if (tireBar) tireBar.style.width = Math.min(100, tireHeat) + '%';

    const dfColor = df > 80 ? '#00c853' : df > 60 ? '#ffd600' : '#e10600';
    if (dfBar)   dfBar.style.background   = dfColor;
    if (dfLabel) {
      dfLabel.textContent = Math.round(df) + '%';
      dfLabel.style.color = dfColor;
    }

    if (aeroMsg) {
      if (gap < 20) {
        aeroMsg.textContent = '🌀 Deep in dirty air — massive downforce loss, tires overheating fast.';
        aeroMsg.style.color = '#e10600';
      } else if (gap < 40) {
        aeroMsg.textContent = '⚠ Turbulent wake — noticeably slower in corners, tires sliding.';
        aeroMsg.style.color = '#ffd600';
      } else {
        aeroMsg.textContent = '✓ Clean air — full downforce, tires behaving predictably.';
        aeroMsg.style.color = '#00c853';
      }
    }
  }

  window.setAeroGap = function(val) {
    aeroGap = parseInt(val);
    const slider = document.getElementById('aero-gap-slider');
    if (slider) slider.style.setProperty('--pct', aeroGap + '%');
    renderAero(aeroGap);
  };

  // init on load (DOM may not be ready yet — use a small delay)
  setTimeout(() => renderAero(aeroGap), 100);
})();

// ── FINDING THE GAP ──
function selectGap(gap) {
  const ids = ['gap-a', 'gap-b', 'gap-c'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    el.style.borderColor = 'var(--border)';
    el.style.background  = 'var(--surface2)';
    el.style.color       = 'var(--text-3)';
  });

  const fb = document.getElementById('gap-feedback');
  fb.style.border = '1px solid var(--border)';

  if (gap === 'b') {
    document.getElementById('gap-b').style.borderColor = '#00c853';
    document.getElementById('gap-b').style.background  = 'rgba(0,200,83,0.1)';
    document.getElementById('gap-b').style.color       = '#00c853';
    fb.textContent      = '✓ Perfect call! This gap gives enough clean air and track position after the pit stop.';
    fb.style.color      = '#00c853';
    fb.style.border     = '1px solid rgba(0,200,83,0.25)';
    fb.style.background = 'rgba(0,200,83,0.06)';
  } else if (gap === 'a') {
    document.getElementById('gap-a').style.borderColor = 'var(--red)';
    document.getElementById('gap-a').style.background  = 'rgba(225,6,0,0.1)';
    document.getElementById('gap-a').style.color       = 'var(--red)';
    fb.textContent      = '✗ Too tight — you\'d emerge right behind that car and lose all fresh tire advantage in dirty air.';
    fb.style.color      = 'var(--red)';
    fb.style.border     = '1px solid rgba(225,6,0,0.25)';
    fb.style.background = 'rgba(225,6,0,0.06)';
  } else {
    document.getElementById('gap-c').style.borderColor = '#ffd600';
    document.getElementById('gap-c').style.background  = 'rgba(255,214,0,0.08)';
    document.getElementById('gap-c').style.color       = '#ffd600';
    fb.textContent      = '⚠ Possible, but you\'d lap behind a backmarker. Gap B gives cleaner air and stronger track position.';
    fb.style.color      = '#ffd600';
    fb.style.border     = '1px solid rgba(255,214,0,0.2)';
    fb.style.background = 'rgba(255,214,0,0.06)';
  }
  fb.style.fontStyle = 'normal';
}

// ── QUIZ ──
const questions = [
  {
    topic: 'tires',
    text: 'Which tire compound is the most durable and typically used for the longest stints?',
    options: ['Soft', 'Medium', 'Hard', 'Intermediate'],
    correct: 2,
    explanation: 'The Hard compound can last 40+ laps, making it the go-to for teams planning a one-stop strategy.'
  },
  {
    topic: 'tires',
    text: 'A driver is told "box box box" over the radio. What does this mean?',
    options: ['Push harder — attack mode', 'Pit this lap', 'Let the car behind pass', 'Save fuel'],
    correct: 1,
    explanation: '"Box" is F1 shorthand for pit lane (from the German "Box"). "Box box box" means come in and pit immediately.'
  },
  {
    topic: 'aero',
    text: 'Why is "dirty air" harmful to a following car\'s performance?',
    options: ['It contains exhaust gases that overheat the engine', 'It reduces downforce, causing slower corners and tire overheating', 'It only affects top speed on straights', 'It improves fuel economy for the chasing car'],
    correct: 1,
    explanation: 'Turbulent wake from the car ahead can cut downforce by up to 30%, making corners slower and tires overheat faster.'
  },
  {
    topic: 'aero',
    text: 'What does DRS (Drag Reduction System) do when activated?',
    options: ['Increases braking force', 'Opens the rear wing flap to reduce drag', 'Cools the rear tires', 'Locks the front differential'],
    correct: 1,
    explanation: 'DRS opens a slot in the rear wing element, reducing aerodynamic drag and adding up to 15 km/h of top speed on designated straight sections.'
  },
  {
    topic: 'pit',
    text: 'What is the "undercut" strategy in F1?',
    options: ['Pitting before a rival to gain track position on fresher tires', 'Staying out longer than a rival to save pit stop time', 'Pitting twice in a row to beat a safety car', 'Using a softer compound to set the fastest qualifying lap'],
    correct: 0,
    explanation: 'The undercut means pitting before your rival. Your new tires are faster, so if the gap is large enough you emerge ahead when they eventually pit.'
  }
];

let currentQuestion = 0;
let quizScore       = 0;
let userAnswers     = [];
let topicScores     = {};
let topicTotals     = {};

function startQuiz() {
  const nameInput = document.getElementById('quiz-name-input');
  quizPlayerName  = nameInput ? nameInput.value.trim() : '';
  currentQuestion = 0;
  quizScore       = 0;
  userAnswers     = [];
  topicScores     = { tires: 0, aero: 0, pit: 0 };
  topicTotals     = { tires: 0, aero: 0, pit: 0 };
  showScreen('quiz-question');
  showQuestion();
}

function showQuestion() {
  const q = questions[currentQuestion];
  const n = questions.length;

  document.getElementById('quiz-nav-label').textContent  = `${currentQuestion + 1} / ${n}`;
  document.getElementById('quiz-q-num').textContent      = `Question ${currentQuestion + 1} of ${n}`;
  document.getElementById('quiz-q-text').textContent     = q.text;
  document.getElementById('quiz-prog').style.width       = `${((currentQuestion + 1) / n) * 100}%`;
  document.getElementById('quiz-feedback').textContent   = '';
  document.getElementById('quiz-next-btn').style.display = 'none';

  document.getElementById('quiz-answers').innerHTML = q.options
    .map((opt, i) => `<button class="answer-btn" onclick="selectAnswer(${i})">${opt}</button>`)
    .join('');
}

function selectAnswer(idx) {
  const q    = questions[currentQuestion];
  const btns = document.querySelectorAll('.answer-btn');
  btns.forEach(b => b.disabled = true);

  const correct = idx === q.correct;
  btns[idx].classList.add(correct ? 'correct' : 'incorrect');
  if (!correct) btns[q.correct].classList.add('correct');

  if (correct) quizScore++;
  topicScores[q.topic] = (topicScores[q.topic] || 0) + (correct ? 1 : 0);
  topicTotals[q.topic] = (topicTotals[q.topic] || 0) + 1;
  userAnswers.push(idx);

  const fb = document.getElementById('quiz-feedback');
  fb.textContent = (correct ? '✓ Correct! ' : '✗ Not quite. ') + q.explanation;
  fb.style.color = correct ? '#00c853' : '#ff7043';

  document.getElementById('quiz-next-btn').style.display = 'block';
}

function nextQuestion() {
  currentQuestion++;
  if (currentQuestion >= questions.length) showResults();
  else showQuestion();
}

function showResults() {
  showScreen('quiz-complete');
  const n    = questions.length;
  const name = quizPlayerName || 'Racer';

  document.getElementById('final-score').textContent = `${quizScore} / ${n}`;

  // personalised, fun titles based on score
  const titleData = [
    { title: 'Back to the Pits, ' + name + '! 😬',          sub: 'Everyone starts somewhere. Hit the learning modules and come back stronger!' },
    { title: name + ', Keep Pushing! 💪',                    sub: 'You\'ve got the basics down — now fine-tune your strategy knowledge.' },
    { title: name + ', Not Bad at All! 👍',                  sub: 'Solid effort! A couple more sessions and you\'ll be calling strategy like a pro.' },
    { title: name + ', You\'re Race Ready! 🏎️',             sub: 'Strong performance! You understand the fundamentals that win championships.' },
    { title: 'Flawless, ' + name + '! 🏆 P1 Finish!',       sub: 'Perfect score. You could be on the pit wall at the next race weekend.' },
  ];
  const td = titleData[Math.min(quizScore, titleData.length - 1)];

  document.getElementById('score-title').textContent   = td.title;
  document.getElementById('score-sub').textContent     = td.sub;

  const scoreEl = document.getElementById('final-score');
  if (quizScore >= 4)      scoreEl.style.color = '#00c853';
  else if (quizScore >= 3) scoreEl.style.color = '#ffd600';
  else                     scoreEl.style.color = 'var(--red)';

  const tireQ = questions.filter(q => q.topic === 'tires').length;
  const aeroQ = questions.filter(q => q.topic === 'aero').length;
  const pitQ  = questions.filter(q => q.topic === 'pit').length;
  document.getElementById('breakdown-tires').textContent = `${topicScores.tires || 0}/${tireQ}`;
  document.getElementById('breakdown-aero').textContent  = `${topicScores.aero  || 0}/${aeroQ}`;
  document.getElementById('breakdown-pit').textContent   = `${topicScores.pit   || 0}/${pitQ}`;
}

function retakeQuiz() { startQuiz(); }
