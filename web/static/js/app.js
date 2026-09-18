/* ==========================================================================
   Iris // KNN front-end controller
   Vanilla JS, no dependencies. Everything below is CSP-safe (no inline code).
   ========================================================================== */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const SVG_NS = "http://www.w3.org/2000/svg";
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SPECIES = ["setosa", "versicolor", "virginica"];
  const COLORS = {
    setosa: "#74a636",
    versicolor: "#d9566f",
    virginica: "#2f8fd6",
  };
  const FEATURE_KEYS = ["sepal_length", "sepal_width", "petal_length", "petal_width"];
  const FEATURE_LABELS = ["Sepal length", "Sepal width", "Petal length", "Petal width"];

  const state = {
    model: null,
    dataset: null,
    lastResult: null,
    histIndex: 2,
    controller: null,
  };

  /* --- helpers --- */

  function svg(tag, attrs = {}, parent = null) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  }

  function el(tag, attrs = {}, text = "") {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else node.setAttribute(k, v);
    }
    if (text) node.textContent = text;
    return node;
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmt = (n, d = 1) => Number(n).toFixed(d);

  function niceTicks(min, max, count = 5) {
    const span = max - min;
    const rough = span / count;
    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    const candidates = [1, 2, 2.5, 5, 10].map((m) => m * pow);
    const step = candidates.find((c) => c >= rough) || candidates[candidates.length - 1];
    const start = Math.ceil(min / step) * step;
    const ticks = [];
    for (let v = start; v <= max + 1e-9; v += step) ticks.push(+v.toFixed(6));
    return ticks;
  }

  /* --- toast --- */

  const toastEl = $("#toast");
  let toastTimer;
  function toast(message, isError = false) {
    toastEl.textContent = message;
    toastEl.classList.toggle("is-error", isError);
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 2600);
  }

  /* --- tooltip --- */

  const tooltipEl = $("#tooltip");
  function showTooltip(html, x, y) {
    tooltipEl.innerHTML = html;
    tooltipEl.hidden = false;
    const pad = 14;
    const rect = tooltipEl.getBoundingClientRect();
    let left = x + pad;
    let top = y + pad;
    if (left + rect.width > window.innerWidth - 8) left = x - rect.width - pad;
    if (top + rect.height > window.innerHeight - 8) top = y - rect.height - pad;
    tooltipEl.style.left = `${Math.max(8, left)}px`;
    tooltipEl.style.top = `${Math.max(8, top)}px`;
  }
  function hideTooltip() {
    tooltipEl.hidden = true;
  }
  const ttRow = (k, v) => `<div class="tt-row"><span class="tt-k">${k}</span><span>${v}</span></div>`;

  /* --- navigation --- */

  function initNav() {
    const toggle = $("#nav-toggle");
    const menu = $("#nav-menu");
    if (!toggle || !menu) return;

    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("is-open", open);
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    $$(".nav-link", menu).forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });

    // accent line under the nav once the hero is scrolled past
    const nav = $(".nav");
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // scroll-spy: highlight the section in view and slide the underline to it
    const list = $(".nav-list", menu);
    const links = $$(".nav-link", menu).filter((a) => a.getAttribute("href").startsWith("#"));
    const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const indicator = el("span", { class: "nav-indicator", "aria-hidden": "true" });
    list.appendChild(indicator);

    const moveIndicator = (link) => {
      if (!link) {
        indicator.classList.remove("is-on");
        return;
      }
      const l = link.getBoundingClientRect();
      const p = list.getBoundingClientRect();
      indicator.style.width = `${l.width - 30}px`;
      indicator.style.transform = `translateX(${l.left - p.left + 15}px)`;
      indicator.classList.add("is-on");
    };

    let active = null;
    const setActive = (id) => {
      if (active === id) return;
      active = id;
      let current = null;
      links.forEach((a) => {
        const on = a.getAttribute("href") === `#${id}`;
        a.classList.toggle("is-active", on);
        if (on) current = a;
      });
      moveIndicator(current);
    };

    const spy = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (hit) setActive(hit.target.id);
      else if (window.scrollY < sections[0].offsetTop - 200) setActive(null);
    }, { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.1, 0.5] });
    sections.forEach((sec) => spy.observe(sec));
    window.addEventListener("resize", debounce(() => moveIndicator(links.find((a) => a.classList.contains("is-active"))), 100));
  }

  /* --- hero title: each word rises out of a clip mask, then the glitch fires once --- */

  function initHeroTitle() {
    const title = $("#hero-title");
    if (!title || REDUCED) return;
    const words = title.textContent.trim().split(/\s+/);
    title.textContent = "";
    words.forEach((word, i) => {
      const inner = el("span", { class: "w-in" }, word);
      inner.style.setProperty("--i", i);
      const wrap = el("span", { class: "w" });
      wrap.appendChild(inner);
      title.appendChild(wrap);
      if (i < words.length - 1) title.appendChild(document.createTextNode(" "));
    });
    // the reveal observer flips is-visible; fire the glitch once the last word has landed
    const done = 600 + (words.length - 1) * 90 + 150;
    setTimeout(() => {
      title.classList.add("glitch-flash", "is-glitching");
      setTimeout(() => title.classList.remove("glitch-flash", "is-glitching"), 600);
    }, done);
  }

  /* --- run something once an element is on screen --- */

  function whenVisible(target, fn) {
    if (!("IntersectionObserver" in window) || REDUCED) {
      fn();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    }, { threshold: 0.2 });
    io.observe(target);
  }

  /* --- reveal on scroll --- */

  function initReveal() {
    const items = $$(".reveal");
    if (!("IntersectionObserver" in window) || REDUCED) {
      items.forEach((i) => i.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    items.forEach((i) => io.observe(i));
  }

  /* --- count-up numbers --- */

  function initCountUp() {
    const nodes = $$(".count");
    if (REDUCED) return;
    nodes.forEach((node) => {
      const target = parseFloat(node.dataset.target);
      const decimals = parseInt(node.dataset.decimals || "0", 10);
      const duration = 1100;
      const start = performance.now();
      node.textContent = (0).toFixed(decimals);
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        node.textContent = (target * eased).toFixed(decimals);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* --- form: sliders + number inputs --- */

  const form = $("#predict-form");
  const predictBtn = $("#predict-btn");
  const autoPredict = $("#auto-predict");
  const fields = FEATURE_KEYS.map((key) => ({
    key,
    range: $(`#${key}`),
    number: $(`#${key}-number`),
    error: $(`#${key}-error`),
    wrap: $(`.field[data-key="${key}"]`),
  }));

  function paintRange(range) {
    const min = parseFloat(range.min);
    const max = parseFloat(range.max);
    const val = parseFloat(range.value);
    const pct = ((val - min) / (max - min)) * 100;
    range.style.setProperty("--pct", `${pct}%`);
    range.setAttribute("aria-valuetext", `${fmt(val)} centimetres`);
  }

  function readValues() {
    const out = {};
    fields.forEach((f) => (out[f.key] = parseFloat(f.number.value)));
    return out;
  }

  function setValues(values, { predict = true } = {}) {
    fields.forEach((f, i) => {
      const v = Array.isArray(values) ? values[i] : values[f.key];
      f.range.value = v;
      f.number.value = fmt(v);
      paintRange(f.range);
      clearFieldError(f);
    });
    updateScatterQuery();
    if (predict) requestPredict(0);
  }

  function clearFieldError(f) {
    f.wrap.classList.remove("is-invalid");
    f.error.hidden = true;
    f.error.textContent = "";
  }

  function validateField(f) {
    const v = parseFloat(f.number.value);
    if (Number.isNaN(v)) {
      f.wrap.classList.add("is-invalid");
      f.error.textContent = "Enter a number.";
      f.error.hidden = false;
      return false;
    }
    if (v <= 0 || v > 30) {
      f.wrap.classList.add("is-invalid");
      f.error.textContent = "Must be between 0 and 30 cm.";
      f.error.hidden = false;
      return false;
    }
    clearFieldError(f);
    return true;
  }

  function initFields() {
    fields.forEach((f) => {
      paintRange(f.range);

      let tickTimer = 0;
      f.range.addEventListener("input", () => {
        f.number.value = fmt(f.range.value);
        paintRange(f.range);
        f.wrap.classList.add("is-tick");
        clearTimeout(tickTimer);
        tickTimer = setTimeout(() => f.wrap.classList.remove("is-tick"), 220);
        clearFieldError(f);
        clearActiveChip();
        updateScatterQuery();
        if (autoPredict.checked) requestPredict(160);
      });

      f.number.addEventListener("input", () => {
        const v = parseFloat(f.number.value);
        if (!Number.isNaN(v)) {
          f.range.value = Math.min(Math.max(v, parseFloat(f.range.min)), parseFloat(f.range.max));
          paintRange(f.range);
        }
        clearActiveChip();
        updateScatterQuery();
        if (validateField(f) && autoPredict.checked) requestPredict(350);
      });

      f.number.addEventListener("blur", () => {
        if (validateField(f)) f.number.value = fmt(f.number.value);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const ok = fields.map(validateField).every(Boolean);
      if (!ok) {
        const first = fields.find((f) => f.wrap.classList.contains("is-invalid"));
        first && first.number.focus();
        return;
      }
      requestPredict(0);
    });

    autoPredict.addEventListener("change", () => {
      toast(autoPredict.checked ? "Auto-predict on" : "Auto-predict off. Use the button to run the model.");
      if (autoPredict.checked) requestPredict(0);
    });
  }

  /* --- presets --- */

  function clearActiveChip() {
    $$(".chip.is-active").forEach((c) => c.classList.remove("is-active"));
  }

  function initPresets() {
    $$(".chip[data-preset]").forEach((chip) => {
      chip.addEventListener("click", () => {
        clearActiveChip();
        chip.classList.add("is-active");
        setValues(chip.dataset.preset.split(",").map(Number));
      });
    });
    $("#preset-random").addEventListener("click", () => {
      if (!state.dataset) return;
      clearActiveChip();
      const pts = state.dataset.points;
      const p = pts[Math.floor(Math.random() * pts.length)];
      setValues(p.x);
      toast(`Loaded a real ${SPECIES[p.y]} sample from the dataset`);
    });
  }

  /* --- prediction --- */

  const resultPanel = $("#result");
  const views = {
    empty: $('[data-view="empty"]'),
    error: $('[data-view="error"]'),
    result: $('[data-view="result"]'),
  };
  const live = $("#result-live");

  function showView(name) {
    Object.entries(views).forEach(([k, v]) => (v.hidden = k !== name));
    resultPanel.dataset.state = name;
  }

  const requestPredict = (() => {
    let timer;
    return (delay) => {
      clearTimeout(timer);
      timer = setTimeout(runPredict, delay);
    };
  })();

  async function runPredict() {
    const ok = fields.map(validateField).every(Boolean);
    if (!ok) return;

    if (state.controller) state.controller.abort();
    state.controller = new AbortController();

    predictBtn.classList.add("is-loading");
    predictBtn.setAttribute("aria-busy", "true");
    if (resultPanel.dataset.state === "empty") resultPanel.dataset.state = "loading";

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(readValues()),
        signal: state.controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server responded ${res.status}`);
      renderResult(data);
    } catch (err) {
      if (err.name === "AbortError") return;
      $("#error-copy").textContent =
        err.message === "Failed to fetch"
          ? "Could not reach the server. Check your connection and try again."
          : err.message;
      showView("error");
      live.textContent = "Prediction failed.";
    } finally {
      predictBtn.classList.remove("is-loading");
      predictBtn.removeAttribute("aria-busy");
    }
  }

  function renderResult(data) {
    state.lastResult = data;
    const color = COLORS[data.species] || "#82b440";
    resultPanel.style.setProperty("--species-color", color);

    const name = $("#result-name");
    const changed = name.textContent !== data.label;
    name.textContent = data.label;
    name.dataset.text = data.label;
    if (changed && !REDUCED) {
      name.classList.remove("is-glitching");
      void name.offsetWidth; // restart animation
      name.classList.add("is-glitching");
    }
    if (!REDUCED) {
      resultPanel.classList.remove("is-fresh");
      void resultPanel.offsetWidth;
      resultPanel.classList.add("is-fresh");
      clearTimeout(state.freshTimer);
      state.freshTimer = setTimeout(() => resultPanel.classList.remove("is-fresh"), 900);
    }

    $("#result-summary").textContent = data.summary;
    $("#result-detail").textContent = data.detail;

    // confidence ring
    const circumference = 2 * Math.PI * 52;
    const ringFill = $("#ring-fill");
    $("#ring").setAttribute("aria-label", `${data.confidence}% confidence`);
    $("#ring-value").textContent = Math.round(data.confidence);
    requestAnimationFrame(() => {
      ringFill.style.strokeDashoffset = circumference * (1 - data.confidence / 100);
    });

    // warnings
    const warn = $("#warnings");
    warn.innerHTML = "";
    if (data.warnings && data.warnings.length) {
      data.warnings.forEach((w) => warn.appendChild(el("p", {}, w)));
      warn.hidden = false;
    } else {
      warn.hidden = true;
    }

    // probabilities
    const list = $("#prob-list");
    list.innerHTML = "";
    SPECIES.forEach((s) => {
      const pct = data.probabilities[s] ?? 0;
      const row = el("li", { class: `prob-row${s === data.species ? " is-winner" : ""}` });
      const nameEl = el("span", { class: "prob-name" });
      nameEl.appendChild(el("span", { class: `legend-swatch dot-${s}`, "aria-hidden": "true" }));
      nameEl.appendChild(document.createTextNode(s));
      const track = el("div", { class: "prob-track", role: "img", "aria-label": `${s} ${pct}%` });
      const fill = el("div", { class: "prob-fill" });
      fill.style.background = COLORS[s];
      track.appendChild(fill);
      row.appendChild(nameEl);
      row.appendChild(track);
      row.appendChild(el("span", { class: "prob-value" }, `${pct}%`));
      list.appendChild(row);
      requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = `${pct}%`)));
    });

    // neighbours
    const body = $("#neighbors-body");
    body.innerHTML = "";
    data.neighbors.forEach((n, i) => {
      const tr = el("tr", { class: n.species === data.species ? "is-match" : "is-other" });
      tr.appendChild(el("td", { class: "num" }, String(i + 1)));
      const sp = el("td");
      sp.appendChild(el("span", { class: `legend-swatch dot-${n.species}`, "aria-hidden": "true" }));
      sp.appendChild(document.createTextNode(cap(n.species)));
      tr.appendChild(sp);
      tr.appendChild(el("td", { class: "num" }, fmt(n.distance, 3)));
      tr.appendChild(el("td", { class: "num" }, `${fmt(n.features[0])} × ${fmt(n.features[1])}`));
      tr.appendChild(el("td", { class: "num" }, `${fmt(n.features[2])} × ${fmt(n.features[3])}`));
      body.appendChild(tr);
    });
    const votes = data.votes[data.species];
    $("#vote-note").textContent = `(${votes} of ${data.neighbors.length} voted ${data.species})`;

    showView("result");
    live.textContent = `Predicted ${data.label} with ${data.confidence}% confidence.`;
    updateScatterQuery();
  }

  $("#error-retry").addEventListener("click", () => requestPredict(0));

  /* --- scatter plot --- */

  const scatterEl = $("#scatter");
  const scatterX = $("#scatter-x");
  const scatterY = $("#scatter-y");
  let scatterScale = null;

  function renderScatter() {
    if (!state.dataset) return;
    const xi = +scatterX.value;
    const yi = +scatterY.value;
    const feats = state.dataset.features;
    const pts = state.dataset.points;

    const W = Math.max(280, scatterEl.clientWidth || 600);
    const narrow = W < 520;
    const H = Math.round(narrow ? W * 0.9 : W * 0.62);
    const m = { t: 16, r: 16, b: 46, l: 48 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;

    const pad = (f) => (f.max - f.min) * 0.06;
    const xMin = feats[xi].min - pad(feats[xi]), xMax = feats[xi].max + pad(feats[xi]);
    const yMin = feats[yi].min - pad(feats[yi]), yMax = feats[yi].max + pad(feats[yi]);
    const sx = (v) => m.l + ((v - xMin) / (xMax - xMin)) * iw;
    const sy = (v) => m.t + ih - ((v - yMin) / (yMax - yMin)) * ih;
    scatterScale = { sx, sy, xi, yi, xMin, xMax, yMin, yMax };

    scatterEl.innerHTML = "";
    const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" }, scatterEl);

    const grid = svg("g", { class: "grid" }, root);
    const xTicks = niceTicks(xMin, xMax, narrow ? 4 : 6);
    xTicks.forEach((t) => svg("line", { x1: sx(t), x2: sx(t), y1: m.t, y2: m.t + ih }, grid));
    niceTicks(yMin, yMax, 5).forEach((t) => svg("line", { x1: m.l, x2: m.l + iw, y1: sy(t), y2: sy(t) }, grid));

    const axis = svg("g", { class: "axis" }, root);
    svg("line", { x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih }, axis);
    svg("line", { x1: m.l, x2: m.l, y1: m.t, y2: m.t + ih }, axis);
    xTicks.forEach((t) => {
      const tx = svg("text", { x: sx(t), y: m.t + ih + 16, "text-anchor": "middle" }, axis);
      tx.textContent = t;
    });
    niceTicks(yMin, yMax, 5).forEach((t) => {
      const tx = svg("text", { x: m.l - 8, y: sy(t) + 4, "text-anchor": "end" }, axis);
      tx.textContent = t;
    });
    const xl = svg("text", { class: "axis-label", x: m.l + iw / 2, y: H - 8, "text-anchor": "middle" }, root);
    xl.textContent = `${feats[xi].label} (cm)`;
    const yl = svg("text", { class: "axis-label", x: 12, y: m.t + ih / 2, "text-anchor": "middle", transform: `rotate(-90 12 ${m.t + ih / 2})` }, root);
    yl.textContent = `${feats[yi].label} (cm)`;

    const dots = svg("g", { class: "dots" }, root);
    pts.forEach((p) => {
      const c = svg("circle", {
        class: "dot",
        cx: sx(p.x[xi]).toFixed(1),
        cy: sy(p.x[yi]).toFixed(1),
        r: 4.5,
        fill: COLORS[SPECIES[p.y]],
        tabindex: "-1",
      }, dots);
      const show = (e) => showTooltip(
        `<strong>${cap(SPECIES[p.y])}</strong>` +
        ttRow(feats[xi].label, `${fmt(p.x[xi])} cm`) +
        ttRow(feats[yi].label, `${fmt(p.x[yi])} cm`),
        e.clientX, e.clientY
      );
      c.addEventListener("mouseenter", show);
      c.addEventListener("mousemove", show);
      c.addEventListener("mouseleave", hideTooltip);
      c.addEventListener("click", () => {
        clearActiveChip();
        setValues(p.x);
      });
    });

    svg("g", { class: "query-layer" }, root);
    updateScatterQuery();

    if (!REDUCED) {
      const circles = $$(".dot", dots);
      circles.forEach((c) => (c.style.transitionDelay = `${Math.round(((+c.getAttribute("cx") - m.l) / iw) * 600)}ms`));
      dots.classList.add("is-pending");
      whenVisible(scatterEl, () => {
        dots.classList.add("is-sweeping");
        requestAnimationFrame(() => requestAnimationFrame(() => dots.classList.remove("is-pending")));
        setTimeout(() => {
          dots.classList.remove("is-sweeping");
          circles.forEach((c) => (c.style.transitionDelay = ""));
        }, 1300);
      });
    }
  }

  function updateScatterQuery() {
    if (!scatterScale) return;
    const layer = $(".query-layer", scatterEl);
    if (!layer) return;
    layer.innerHTML = "";
    const v = readValues();
    const x = v[FEATURE_KEYS[scatterScale.xi]];
    const y = v[FEATURE_KEYS[scatterScale.yi]];
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    const cx = scatterScale.sx(x).toFixed(1);
    const cy = scatterScale.sy(y).toFixed(1);
    svg("circle", { class: "query-pulse", cx, cy, r: 9 }, layer);
    const q = svg("circle", { class: "query", cx, cy, r: 8 }, layer);
    const species = state.lastResult ? state.lastResult.label : "Not yet predicted";
    const show = (e) => showTooltip(
      `<strong>Your input</strong>` + ttRow("Prediction", species) +
      ttRow(FEATURE_LABELS[scatterScale.xi], `${fmt(x)} cm`) +
      ttRow(FEATURE_LABELS[scatterScale.yi], `${fmt(y)} cm`),
      e.clientX, e.clientY
    );
    q.addEventListener("mouseenter", show);
    q.addEventListener("mousemove", show);
    q.addEventListener("mouseleave", hideTooltip);
    scatterEl.setAttribute(
      "aria-label",
      `Scatter plot of ${FEATURE_LABELS[scatterScale.xi]} against ${FEATURE_LABELS[scatterScale.yi]} for all 150 samples. Your input is at ${fmt(x)} and ${fmt(y)} centimetres.`
    );
  }

  /* --- confusion matrix --- */

  function renderConfusion() {
    const cm = state.model.metrics.confusion_matrix;
    const root = $("#confusion-matrix");
    root.innerHTML = "";
    const max = Math.max(...cm.flat());

    const head = el("div", { class: "cm-row", role: "row" });
    head.appendChild(el("div", { class: "cm-corner", role: "columnheader" }));
    SPECIES.forEach((s) => head.appendChild(el("div", { class: "cm-head", role: "columnheader", "aria-label": `predicted ${s}` }, s)));
    root.appendChild(head);

    cm.forEach((row, r) => {
      const tr = el("div", { class: "cm-row", role: "row" });
      tr.appendChild(el("div", { class: "cm-row-head", role: "rowheader", "aria-label": `true ${SPECIES[r]}` }, SPECIES[r]));
      row.forEach((v, c) => {
        const cell = el("div", {
          class: `cm-cell ${r === c ? "is-diag" : "is-off"}`,
          role: "cell",
          tabindex: "0",
          "data-v": v,
          "aria-label": `${v} ${SPECIES[r]} samples predicted as ${SPECIES[c]}`,
        });
        cell.style.setProperty("--v", (v / max).toFixed(3));
        cell.appendChild(document.createTextNode(String(v)));
        cell.appendChild(el("small", {}, r === c ? "correct" : "missed"));
        tr.appendChild(cell);
      });
      root.appendChild(tr);
    });

    if (!REDUCED) {
      const cells = $$(".cm-cell", root);
      cells.forEach((cell, i) => {
        cell.classList.add("is-pending");
        cell.style.transitionDelay = `${i * 40}ms`;
      });
      whenVisible(root, () => {
        cells.forEach((cell) => cell.classList.add("is-entering"));
        requestAnimationFrame(() => requestAnimationFrame(() => {
          cells.forEach((cell, i) => {
            cell.classList.remove("is-pending");
            if (cell.classList.contains("is-diag")) {
              cell.style.setProperty("--flash-delay", `${i * 40 + 350}ms`);
              cell.classList.add("is-flash");
            }
          });
        }));
        setTimeout(() => cells.forEach((cell) => {
          cell.classList.remove("is-entering");
          cell.style.transitionDelay = "";
        }), 1400);
      });
    }
  }

  /* --- K-curve line chart --- */

  function renderKCurve() {
    const kc = state.model.k_curve;
    const host = $("#k-curve");
    host.innerHTML = "";
    const W = Math.max(280, host.clientWidth || 800);
    const narrow = W < 520;
    const H = narrow ? Math.round(W * 0.8) : Math.round(W * 0.4);
    const m = { t: 20, r: 20, b: 44, l: 48 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;

    const yMin = Math.max(0, Math.floor((Math.min(...kc.accuracy) - 5) / 5) * 5);
    const yMax = 100;
    const sx = (k) => m.l + ((k - 1) / (kc.k.length - 1)) * iw;
    const sy = (a) => m.t + ih - ((a - yMin) / (yMax - yMin)) * ih;

    const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" }, host);
    const grid = svg("g", { class: "grid" }, root);
    niceTicks(yMin, yMax, 5).forEach((t) => svg("line", { x1: m.l, x2: m.l + iw, y1: sy(t), y2: sy(t) }, grid));

    const axis = svg("g", { class: "axis" }, root);
    svg("line", { x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih }, axis);
    kc.k.forEach((k) => {
      if (narrow && k % 2 === 0) return;
      const t = svg("text", { x: sx(k), y: m.t + ih + 16, "text-anchor": "middle" }, axis);
      t.textContent = k;
    });
    niceTicks(yMin, yMax, 5).forEach((v) => {
      const t = svg("text", { x: m.l - 8, y: sy(v) + 4, "text-anchor": "end" }, axis);
      t.textContent = `${v}%`;
    });
    const xl = svg("text", { class: "axis-label", x: m.l + iw / 2, y: H - 6, "text-anchor": "middle" }, root);
    xl.textContent = "K (number of neighbours)";

    // reference line for chosen K
    svg("line", { class: "ref-line", x1: sx(kc.chosen_k), x2: sx(kc.chosen_k), y1: m.t, y2: m.t + ih }, root);
    const rl = svg("text", { class: "ref-label", x: sx(kc.chosen_k) + 6, y: m.t + 12 }, root);
    rl.textContent = `chosen K = ${kc.chosen_k}`;

    const pathD = kc.k.map((k, i) => `${i ? "L" : "M"}${sx(k).toFixed(1)},${sy(kc.accuracy[i]).toFixed(1)}`).join(" ");
    const areaD = `${pathD} L${sx(kc.k[kc.k.length - 1]).toFixed(1)},${m.t + ih} L${sx(1)},${m.t + ih} Z`;
    svg("path", { class: "series-area", d: areaD }, root);
    const line = svg("path", { class: "series-line", d: pathD }, root);
    if (!REDUCED) {
      const len = line.getTotalLength();
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      line.style.transition = "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)";
      requestAnimationFrame(() => requestAnimationFrame(() => (line.style.strokeDashoffset = 0)));
    }

    const markers = kc.k.map((k, i) => {
      const cls = ["marker"];
      if (k === kc.chosen_k) cls.push("marker-chosen");
      if (k === kc.best_k) cls.push("marker-best");
      return svg("circle", { class: cls.join(" "), cx: sx(k), cy: sy(kc.accuracy[i]), r: 4 }, root);
    });

    const cross = svg("line", { class: "crosshair", x1: 0, x2: 0, y1: m.t, y2: m.t + ih, visibility: "hidden" }, root);
    const hit = svg("rect", { class: "hit", x: m.l, y: m.t, width: iw, height: ih }, root);
    let active = -1;
    const move = (e) => {
      const rect = root.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      const i = Math.round(((px - m.l) / iw) * (kc.k.length - 1));
      const idx = Math.min(kc.k.length - 1, Math.max(0, i));
      if (idx !== active) {
        markers.forEach((mk, j) => mk.classList.toggle("is-active", j === idx));
        active = idx;
      }
      cross.setAttribute("x1", sx(kc.k[idx]));
      cross.setAttribute("x2", sx(kc.k[idx]));
      cross.setAttribute("visibility", "visible");
      showTooltip(
        `<strong>K = ${kc.k[idx]}</strong>` + ttRow("Test accuracy", `${kc.accuracy[idx]}%`) +
        (kc.k[idx] === kc.chosen_k ? ttRow("", "chosen for the model") : ""),
        e.clientX, e.clientY
      );
    };
    hit.addEventListener("mousemove", move);
    hit.addEventListener("mouseleave", () => {
      cross.setAttribute("visibility", "hidden");
      markers.forEach((mk) => mk.classList.remove("is-active"));
      active = -1;
      hideTooltip();
    });
  }

  /* --- histogram with tabs --- */

  function renderHistogram() {
    if (!state.dataset) return;
    const fi = state.histIndex;
    const feat = state.dataset.features[fi];
    const host = $("#hist-panel");
    host.innerHTML = "";
    host.setAttribute("aria-labelledby", `tab-${feat.key}`);

    const W = Math.max(280, host.clientWidth || 800);
    const narrow = W < 520;
    const H = narrow ? Math.round(W * 0.8) : Math.round(W * 0.4);
    const m = { t: 16, r: 16, b: 44, l: 40 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;

    const bins = narrow ? 8 : 12;
    const lo = feat.min, hi = feat.max;
    const width = (hi - lo) / bins;
    const counts = SPECIES.map(() => new Array(bins).fill(0));
    state.dataset.points.forEach((p) => {
      let b = Math.floor((p.x[fi] - lo) / width);
      if (b >= bins) b = bins - 1;
      counts[p.y][b] += 1;
    });
    const maxCount = Math.max(...counts.flat());
    const yMax = Math.ceil(maxCount / 5) * 5 || 5;

    const sx = (b) => m.l + (b / bins) * iw;
    const sy = (c) => m.t + ih - (c / yMax) * ih;
    const groupW = iw / bins;
    const gap = 2;
    const barW = (groupW - gap * 4) / 3;

    const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" }, host);
    const grid = svg("g", { class: "grid" }, root);
    niceTicks(0, yMax, 4).forEach((t) => svg("line", { x1: m.l, x2: m.l + iw, y1: sy(t), y2: sy(t) }, grid));
    const axis = svg("g", { class: "axis" }, root);
    svg("line", { x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih }, axis);
    for (let b = 0; b <= bins; b += narrow ? 2 : 1) {
      const t = svg("text", { x: sx(b), y: m.t + ih + 16, "text-anchor": "middle" }, axis);
      t.textContent = fmt(lo + b * width);
    }
    niceTicks(0, yMax, 4).forEach((v) => {
      const t = svg("text", { x: m.l - 8, y: sy(v) + 4, "text-anchor": "end" }, axis);
      t.textContent = v;
    });
    const xl = svg("text", { class: "axis-label", x: m.l + iw / 2, y: H - 6, "text-anchor": "middle" }, root);
    xl.textContent = `${feat.label} (cm)`;
    const yl = svg("text", { class: "axis-label", x: 10, y: m.t + ih / 2, "text-anchor": "middle", transform: `rotate(-90 10 ${m.t + ih / 2})` }, root);
    yl.textContent = "Samples";

    for (let b = 0; b < bins; b++) {
      SPECIES.forEach((s, si) => {
        const c = counts[si][b];
        if (!c) return;
        const x = sx(b) + gap + si * (barW + gap);
        const y = sy(c);
        const h = m.t + ih - y;
        const bar = svg("rect", {
          class: "bar",
          x: x.toFixed(1), y: y.toFixed(1),
          width: barW.toFixed(1), height: h.toFixed(1),
          rx: Math.min(4, barW / 2), ry: Math.min(4, barW / 2),
          fill: COLORS[s],
        }, root);
        // square off the baseline so only the top end is rounded
        svg("rect", {
          x: x.toFixed(1), y: (m.t + ih - Math.min(4, h)).toFixed(1),
          width: barW.toFixed(1), height: Math.min(4, h).toFixed(1),
          fill: COLORS[s],
        }, root);
        const show = (e) => showTooltip(
          `<strong>${cap(s)}</strong>` +
          ttRow(feat.label, `${fmt(lo + b * width)} to ${fmt(lo + (b + 1) * width)} cm`) +
          ttRow("Samples", c),
          e.clientX, e.clientY
        );
        bar.addEventListener("mouseenter", show);
        bar.addEventListener("mousemove", show);
        bar.addEventListener("mouseleave", hideTooltip);
        if (!REDUCED) {
          bar.style.transformOrigin = `${x + barW / 2}px ${m.t + ih}px`;
          bar.style.transform = "scaleY(0)";
          bar.style.transition = `transform 0.6s cubic-bezier(0.16,1,0.3,1) ${b * 30}ms`;
          requestAnimationFrame(() => requestAnimationFrame(() => (bar.style.transform = "scaleY(1)")));
        }
      });
    }
  }

  function initTabs() {
    const tabs = $$("#hist-tabs .tab");
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      state.histIndex = +tab.dataset.index;
      renderHistogram();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (e) => {
        let next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          next.focus();
          select(next);
        }
      });
    });
  }

  /* --- copy buttons --- */

  function initCopy() {
    $$(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const src = $(`#${btn.dataset.copy}`);
        const text = src ? src.textContent.trim() : "";
        try {
          await navigator.clipboard.writeText(text);
          btn.classList.add("is-copied");
          btn.textContent = "Copied";
          setTimeout(() => {
            btn.classList.remove("is-copied");
            btn.textContent = "Copy";
          }, 1600);
        } catch {
          toast("Clipboard unavailable. Select the text to copy it.", true);
        }
      });
    });
  }

  /* --- data loading --- */

  async function loadData() {
    try {
      const [modelRes, dataRes] = await Promise.all([fetch("/api/model"), fetch("/api/dataset")]);
      if (!modelRes.ok || !dataRes.ok) throw new Error("Model data unavailable");
      state.model = await modelRes.json();
      state.dataset = await dataRes.json();
      renderScatter();
      renderConfusion();
      renderKCurve();
      renderHistogram();
      // Show a real prediction immediately so the panel is never empty.
      if (resultPanel.dataset.state === "empty") requestPredict(0);
    } catch (err) {
      toast("Charts could not be loaded. Predictions still work.", true);
      console.error(err);
    }
  }

  /* --- boot --- */

  document.documentElement.classList.remove("no-js");
  initNav();
  initHeroTitle();
  initReveal();
  initCountUp();
  initFields();
  initPresets();
  initTabs();
  initCopy();
  scatterX.addEventListener("change", renderScatter);
  scatterY.addEventListener("change", renderScatter);
  window.addEventListener("resize", debounce(() => {
    if (!state.model) return;
    renderScatter();
    renderKCurve();
    renderHistogram();
  }, 200));
  loadData();
})();
