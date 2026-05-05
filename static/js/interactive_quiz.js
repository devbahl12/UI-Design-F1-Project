/**
 * Interactive setup lab: tyre + wing vs weather → relative pace on ellipse track.
 */
(function () {
  const root = document.querySelector("[data-interactive-quiz]");
  if (!root) return;

  const dataEl = document.getElementById("iq-scenarios-data");
  let scenarios = [];
  try {
    scenarios = JSON.parse(dataEl ? dataEl.textContent : "[]");
  } catch (_) {
    scenarios = [];
  }
  let scenarioIndex = 0;
  let selectedTire = "med";
  let selectedWing = "balanced";
  let animFrame = null;
  const angles = [Math.PI, 0, Math.PI / 2];
  const speeds = [0.015, 0.015, 0.015];

  const TIRE_PACE = {
    dry: {
      hot: { soft: 94, med: 90, hard: 84, inter: 46, wet: 36 },
      mid: { soft: 93, med: 93, hard: 89, inter: 49, wet: 39 },
      cold: { soft: 88, med: 93, hard: 91, inter: 51, wet: 41 },
    },
    wet: {
      hot: { soft: 34, med: 37, hard: 41, inter: 83, wet: 97 },
      mid: { soft: 33, med: 36, hard: 40, inter: 85, wet: 98 },
      cold: { soft: 32, med: 35, hard: 39, inter: 86, wet: 99 },
    },
    mixed: {
      hot: { soft: 60, med: 67, hard: 63, inter: 93, wet: 74 },
      mid: { soft: 56, med: 71, hard: 65, inter: 95, wet: 72 },
      cold: { soft: 54, med: 69, hard: 67, inter: 94, wet: 75 },
    },
  };

  const WING_PACE = {
    dry: { low: 8, balanced: 6, high: 4 },
    wet: { low: 2, balanced: 5, high: 9 },
    mixed: { low: 4, balanced: 7, high: 8 },
  };

  function weatherBucket(sc) {
    const w = sc.weather || "dry";
    const t = sc.track_temp || "mid";
    const tempKey = t === "hot" || t === "cold" || t === "mid" ? t : "mid";
    return { w: w === "wet" || w === "mixed" || w === "dry" ? w : "dry", tempKey };
  }

  function paceFor(tire, wing, sc) {
    const { w, tempKey } = weatherBucket(sc);
    const tireTable = TIRE_PACE[w] && TIRE_PACE[w][tempKey];
    const wingTable = WING_PACE[w];
    if (!tireTable || !wingTable) return 75;
    const tk = tireTable[tire] != null ? tire : "med";
    const wk = wingTable[wing] != null ? wing : "balanced";
    return tireTable[tk] + wingTable[wk];
  }

  function lapSecondsFromPace(pace) {
    const base = 102;
    return base - (pace - 72) * 0.42;
  }

  function formatLap(sec) {
    const clamped = Math.max(58, Math.min(140, sec));
    const m = Math.floor(clamped / 60);
    const s = (clamped % 60).toFixed(1);
    return m + ":" + s.padStart(4, "0");
  }

  function relativeSpeed(pace) {
    return Math.round(285 + (pace - 78) * 1.15);
  }

  function normSpeed(pace) {
    const n = (pace - 72) / (118 - 72);
    return 0.007 + Math.max(0, Math.min(1, n)) * 0.034;
  }

  function applyScenarioDOM(idx) {
    const sc = scenarios[idx];
    if (!sc) return;
    const headline = root.querySelector("[data-iq-headline]");
    const cond = root.querySelector("[data-iq-conditions]");
    const rivalRows = root.querySelector("[data-iq-rivals]");
    if (headline) headline.textContent = sc.headline;
    if (cond) cond.textContent = sc.conditions;
    if (rivalRows && sc.rivals) {
      rivalRows.innerHTML = sc.rivals
        .map(
          (r) =>
            `<li class="t-body iq-rival-line"><strong>${r.name}</strong> — ${r.blurb}</li>`
        )
        .join("");
    }

    root.querySelectorAll("[data-scenario-tab]").forEach((btn, i) => {
      btn.classList.toggle("is-active", i === idx);
      btn.setAttribute("aria-pressed", String(i === idx));
    });
  }

  function refreshTelemetry() {
    const sc = scenarios[scenarioIndex];
    if (!sc) return;

    const userP = paceFor(selectedTire, selectedWing, sc);
    const r1 = sc.rivals[0];
    const r2 = sc.rivals[1];
    const p1 = r1 ? paceFor(r1.tire, r1.wing, sc) : userP;
    const p2 = r2 ? paceFor(r2.tire, r2.wing, sc) : userP;

    speeds[0] = normSpeed(userP);
    speeds[1] = normSpeed(p1);
    speeds[2] = normSpeed(p2);

    const uLap = formatLap(lapSecondsFromPace(userP));
    const lapEls = root.querySelectorAll("[data-lap-user]");
    lapEls.forEach((el) => {
      el.textContent = uLap;
    });

    const rows = root.querySelector("[data-lap-rows]");
    if (rows) {
      rows.innerHTML = [
        { tag: "You", lap: uLap, spd: relativeSpeed(userP), cls: "iq-row--user" },
        r1 && {
          tag: r1.name,
          lap: formatLap(lapSecondsFromPace(p1)),
          spd: relativeSpeed(p1),
          cls: "iq-row--r1",
        },
        r2 && {
          tag: r2.name,
          lap: formatLap(lapSecondsFromPace(p2)),
          spd: relativeSpeed(p2),
          cls: "iq-row--r2",
        },
      ]
        .filter(Boolean)
        .map(
          (row) =>
            `<div class="iq-lap-row ${row.cls}"><span>${row.tag}</span><span class="t-mono">${row.lap}</span><span class="t-mono iq-kmh">${row.spd} km/h</span></div>`
        )
        .join("");
    }

    const narrative = root.querySelector("[data-iq-narrative]");
    if (narrative) {
      const best = Math.max(userP, p1, p2);
      let msg = "";
      if (userP >= best - 0.5) {
        msg =
          "Your setup matches this window well — you're near the top of the modeled pace stack.";
      } else if (userP >= best - 4) {
        msg =
          "Close — a different tyre or wing trade-off might buy a few tenths under these conditions.";
      } else {
        msg =
          "This combo leaves pace on the table — try leaning toward inters/wets in rain, or softer slicks when it's hot and dry.";
      }
      narrative.textContent = msg;
    }
  }

  function tick() {
    const wrapper = root.querySelector(".iq-track-wrapper");
    const cars = [
      root.querySelector("[data-race-car=\"user\"]"),
      root.querySelector("[data-race-car=\"r1\"]"),
      root.querySelector("[data-race-car=\"r2\"]"),
    ];
    if (!wrapper || cars.some((c) => !c)) return;

    const w = wrapper.offsetWidth;
    const h = wrapper.offsetHeight;
    const rx = Math.min(w * 0.4, 268);
    const ry = Math.min(h * 0.38, 108);
    const cx = w / 2;
    const cy = h / 2;

    for (let i = 0; i < 3; i++) {
      angles[i] = (angles[i] - speeds[i] + Math.PI * 2) % (Math.PI * 2);
      const x = cx + rx * Math.cos(angles[i]);
      const y = cy + ry * Math.sin(angles[i]);
      const deg = (angles[i] * 180) / Math.PI - 90;
      cars[i].style.left = x + "px";
      cars[i].style.top = y + "px";
      cars[i].style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
    }
    animFrame = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(tick);
  }

  root.querySelectorAll("[data-scenario-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      scenarioIndex = parseInt(btn.dataset.scenarioIndex, 10) || 0;
      applyScenarioDOM(scenarioIndex);
      refreshTelemetry();
    });
  });

  root.querySelectorAll("[data-tire-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedTire = btn.dataset.tireKey || "med";
      root.querySelectorAll("[data-tire-pick]").forEach((b) => {
        b.classList.toggle("is-selected", b === btn);
        b.setAttribute("aria-pressed", String(b === btn));
      });
      refreshTelemetry();
    });
  });

  root.querySelectorAll("[data-wing-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedWing = btn.dataset.wingKey || "balanced";
      root.querySelectorAll("[data-wing-pick]").forEach((b) => {
        b.classList.toggle("is-selected", b === btn);
        b.setAttribute("aria-pressed", String(b === btn));
      });
      refreshTelemetry();
    });
  });

  const runBtn = root.querySelector("[data-run-setup]");
  if (runBtn) {
    runBtn.addEventListener("click", () => {
      refreshTelemetry();
      angles[0] = Math.PI;
      angles[1] = 0;
      angles[2] = Math.PI / 2;
      startLoop();
    });
  }

  applyScenarioDOM(0);
  root.querySelectorAll("[data-tire-pick]").forEach((b) => {
    if ((b.dataset.tireKey || "") === selectedTire) {
      b.classList.add("is-selected");
      b.setAttribute("aria-pressed", "true");
    }
  });
  root.querySelectorAll("[data-wing-pick]").forEach((b) => {
    if ((b.dataset.wingKey || "") === selectedWing) {
      b.classList.add("is-selected");
      b.setAttribute("aria-pressed", "true");
    }
  });
  refreshTelemetry();
  startLoop();
})();
