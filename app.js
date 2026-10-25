/* Initialized after Reveal has converted the Markdown slides. */
window.initializeTLC = () => {
  "use strict";
  const M = window.CLTMath;
  const $ = id => document.getElementById(id);
  const ns = "http://www.w3.org/2000/svg";
  const densitySvg = $("density-chart");
  if (!densitySvg || densitySvg.dataset.initialized) return;
  densitySvg.dataset.initialized = "true";
  const histogramSvg = $("histogram-chart");
  const sampleButton = $("sample-button");
  const format = (value, digits = 3) => {
    const rounded = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
    return rounded.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false });
  };
  const axisFormat = value => {
    if (Math.abs(value) < 1e-12) return "0";
    if (Math.abs(value) >= 10000 || Math.abs(value) < 0.001) return value.toExponential(1);
    return value.toLocaleString("en-US", { maximumFractionDigits: 3, useGrouping: false });
  };
  const state = {
    model: M.distribution([{ x: 0, y: 1 }, { x: 1, y: 1 }]),
    n: 1, sample: null, history: [], view: "standardized", theory: false,
    zLimit: 4, selected: null, drag: null, domain: [-0.25, 1.25]
  };
  let densityPlot;
  let renderPending = false;
  let repeatDelay = null;
  let repeatInterval = null;
  let pressSource = null;
  let samplePointer = null;
  const cells = [];
  const axisMath = new Map();

  function renderFormula(element, latex, value) {
    if (value !== undefined) element.dataset.value = value;
    if (element.dataset.latex === latex && element.querySelector(".katex")) return;
    element.dataset.latex = latex;
    window.katex.render(latex, element, { displayMode: element.dataset.display === "true", throwOnError: true, strict: "error" });
  }

  function svgElement(name, attrs = {}, text) {
    const element = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function setAttributes(element, attrs) {
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  }

  function chartPlot(svg, min, max, yMax) {
    const box = svg.getBoundingClientRect();
    const width = Math.max(200, box.width), height = Math.max(100, box.height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const left = 43, right = width - 34, top = 12, bottom = height - 29;
    return {
      width, height, left, right, top, bottom, min, max, yMax,
      x: value => left + (value - min) / (max - min) * (right - left),
      y: value => bottom - value / yMax * (bottom - top),
      fromX: pixel => min + (pixel - left) / (right - left) * (max - min),
      fromY: pixel => Math.max(0, (bottom - pixel) / (bottom - top) * yMax)
    };
  }

  function tickValues(min, max, count) {
    const raw = (max - min) / count;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const fraction = raw / magnitude;
    const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * magnitude;
    const ticks = [];
    for (let i = Math.ceil(min / step); i <= Math.floor(max / step + 1e-10); i++) ticks.push(i * step);
    return ticks;
  }

  function drawAxes(svg, plot, label) {
    const axes = document.createDocumentFragment();
    const grid = document.createDocumentFragment();
    axes.append(svgElement("line", { x1: plot.left, x2: plot.right, y1: plot.bottom, y2: plot.bottom, class: "axis-line" }));
    for (const tick of tickValues(plot.min, plot.max, plot.width < 420 ? 4 : 6)) {
      const x = plot.x(tick);
      axes.append(svgElement("line", { x1: x, x2: x, y1: plot.bottom, y2: plot.bottom + 4, class: "axis-line" }));
      axes.append(svgElement("text", { x, y: plot.bottom + 19, "text-anchor": "middle", class: "axis-text" }, axisFormat(tick)));
    }
    for (const tick of tickValues(0, plot.yMax, 3)) {
      if (tick === 0) continue;
      const y = plot.y(tick);
      grid.append(svgElement("line", { x1: plot.left, x2: plot.right, y1: y, y2: y, class: "grid-line" }));
      axes.append(svgElement("text", { x: plot.left - 7, y: y + 4, "text-anchor": "end", class: "axis-text" }, axisFormat(tick)));
    }
    const axisLabel = svgElement("foreignObject", { x: plot.right + 5, y: plot.bottom - 12, width: 29, height: 28 });
    const labelContent = document.createElement("div");
    labelContent.className = "axis-label";
    if (!axisMath.has(label)) axisMath.set(label, window.katex.renderToString(label, { throwOnError: true, strict: "error" }));
    labelContent.innerHTML = axisMath.get(label);
    axisLabel.append(labelContent);
    axes.append(axisLabel);
    svg.querySelector(".axis-layer").replaceChildren(axes);
    svg.querySelector(".grid-layer").replaceChildren(grid);
  }

  function drawDensity() {
    const points = state.model.points;
    const peak = Math.max(...points.map(p => p.y));
    const yMax = Math.max(peak * 1.25, state.drag ? state.drag.plot.yMax : 0);
    densityPlot = chartPlot(densitySvg, ...state.domain, yMax);
    const p = densityPlot;
    drawAxes(densitySvg, p, "x");
    const curve = points.map((point, i) => `${i ? "L" : "M"}${p.x(point.x)},${p.y(point.y)}`).join(" ");
    densitySvg.querySelector(".density-line").setAttribute("d", curve);
    densitySvg.querySelector(".density-area").setAttribute("d", `${curve} L${p.x(state.model.max)},${p.bottom} L${p.x(state.model.min)},${p.bottom} Z`);

    // Keep handles in the DOM during drags so pointer capture and focus survive.
    const layer = densitySvg.querySelector(".handle-layer");
    while (layer.children.length > points.length) layer.lastElementChild.remove();
    while (layer.children.length < points.length) {
      const handle = svgElement("g", { class: "handle", tabindex: "0", role: "button" });
      handle.append(svgElement("circle", { r: 19, class: "handle-hit" }), svgElement("circle", { r: 5, class: "handle-dot" }));
      layer.append(handle);
    }
    points.forEach((point, i) => {
      const handle = layer.children[i];
      setAttributes(handle, {
        transform: `translate(${p.x(point.x)} ${p.y(point.y)})`,
        "data-index": i,
        class: `handle${state.selected === i ? " selected" : ""}`,
        "aria-label": `Vertice ${i + 1}, x ${format(point.x)}, densità ${format(point.y)}. Frecce per spostare; Canc per eliminare un punto interno.`
      });
    });
    const markers = (state.sample?.values || []).map(value => svgElement("circle", { cx: p.x(value), cy: p.bottom, r: 4, class: "sample-dot" }));
    densitySvg.querySelector(".sample-layer").replaceChildren(...markers);
    $("delete-point").disabled = !isInternalSelection();
    $("delete-point").title = isInternalSelection() ? "Elimina il vertice selezionato" : "Seleziona un vertice interno da eliminare";
    renderFormula($("population-mean"), String.raw`\mu = \mathbb{E}[X] = ${format(state.model.mean)}`, format(state.model.mean));
    renderFormula($("population-sd"), String.raw`\sigma = \sqrt{\mathrm{Var}(X)} = ${format(state.model.sd)}`, format(state.model.sd));
  }

  function drawHistogram() {
    const standardized = state.view === "standardized";
    const scale = standardized ? 1 : state.model.sd / Math.sqrt(state.n);
    const center = standardized ? 0 : state.model.mean;
    const min = center - state.zLimit * scale, max = center + state.zLimit * scale;
    const values = state.history.map(entry => standardized ? entry.z : entry.mean);
    const bins = M.histogram(values, min, max);
    const normalPeak = M.normalDensity(center, center, scale);
    const yMax = Math.max(normalPeak * 1.3, ...bins.densities.map(d => d * 1.12));
    const p = chartPlot(histogramSvg, min, max, yMax);
    drawAxes(histogramSvg, p, standardized ? "z" : String.raw`\overline{x}_n`);
    const bars = bins.densities.map((density, i) => svgElement("rect", {
      x: p.x(min + i * bins.width) + 0.5, y: p.y(density),
      width: Math.max(0, (p.right - p.left) / 40 - 1), height: Math.max(0, p.bottom - p.y(density)),
      class: "histogram-bar", "data-count": bins.counts[i], "data-density": density
    }));
    histogramSvg.querySelector(".bar-layer").replaceChildren(...bars);
    const theory = histogramSvg.querySelector(".theory-line");
    theory.toggleAttribute("hidden", !state.theory);
    if (state.theory) {
      const path = Array.from({ length: 241 }, (_, i) => {
        const x = min + (max - min) * i / 240;
        return `${i ? "L" : "M"}${p.x(x)},${p.y(M.normalDensity(x, center, scale))}`;
      }).join(" ");
      theory.setAttribute("d", path);
    }

    // Aggregate overlapping rug marks by screen pixel: long runs keep a small DOM.
    const columns = new Map();
    for (const value of values) {
      const x = Math.round(p.x(value));
      columns.set(x, (columns.get(x) || 0) + 1);
    }
    const rug = Array.from(columns, ([x, count]) => svgElement("line", {
      x1: x, x2: x, y1: p.bottom - 2, y2: p.bottom + 2,
      opacity: Math.min(0.85, 1 - 0.78 ** count), class: "rug-mark"
    }));
    histogramSvg.querySelector(".rug-layer").replaceChildren(...rug);
    const latest = histogramSvg.querySelector(".latest-mean");
    latest.toggleAttribute("hidden", !values.length);
    if (values.length) setAttributes(latest, { cx: p.x(values[values.length - 1]), cy: p.bottom });
    const name = standardized ? "medie standardizzate" : "medie campionarie";
    histogramSvg.setAttribute("aria-label", `Densità di frequenze relative delle ${name}; ${values.length} campioni`);
    $("histogram-empty").hidden = values.length > 0 || state.theory;
    $("repetition-count").textContent = `${values.length} ${values.length === 1 ? "campione" : "campioni"}`;
    $("view-means").setAttribute("aria-pressed", String(!standardized));
    $("view-standardized").setAttribute("aria-pressed", String(standardized));
    $("theory-button").setAttribute("aria-pressed", String(state.theory));
    $("theory-description").hidden = !state.theory;
    renderFormula($("theory-formula"), standardized ? String.raw`\mathcal{N}(0,1)` : String.raw`\mathcal{N}(\mu,\sigma^2/n)`);
  }

  function drawSample() {
    const sample = state.sample;
    cells.forEach((cell, i) => {
      const filled = sample !== null && i < sample.values.length;
      cell.textContent = filled ? format(sample.values[i], 2) : "";
      cell.classList.toggle("is-filled", filled);
      cell.setAttribute("aria-label", filled ? `x ${i + 1}: ${format(sample.values[i], 6)}` : `Posizione ${i + 1} vuota`);
      cell.title = filled ? `x${i + 1} = ${format(sample.values[i], 6)}` : "";
      if (filled) {
        const length = cell.textContent.length;
        cell.style.fontSize = length > 5 ? `${Math.max(7, 12 - (length - 5))}px` : "";
      }
    });
    $("sample-empty").hidden = Boolean(sample);
    $("data-count").textContent = sample ? `${state.n} ${state.n === 1 ? "valore" : "valori"}` : "0 valori";
    const meanValue = sample ? format(sample.mean) : "—";
    const zValue = sample ? format(sample.z) : "—";
    renderFormula($("sample-mean"), String.raw`\overline{x}_n = \color{#2665ba}{${sample ? meanValue : String.raw`\text{—}`}}`, meanValue);
    renderFormula($("sample-z"), String.raw`\frac{\overline{x}_n - \mu}{\sigma/\sqrt{n}} = \color{#2665ba}{${sample ? zValue : String.raw`\text{—}`}}`, zValue);
    $("sample-size-value").textContent = state.n;
    $("sample-size").value = state.n;
  }

  function render() {
    renderPending = false;
    drawDensity();
    drawHistogram();
    drawSample();
  }

  function requestRender() {
    if (!renderPending) {
      renderPending = true;
      requestAnimationFrame(render);
    }
  }

  function announce(message) { $("status").textContent = message; }

  function takeSample() {
    state.sample = M.sample(state.model, state.n);
    state.history.push({ mean: state.sample.mean, z: state.sample.z });
    if (Math.abs(state.sample.z) > state.zLimit) state.zLimit = Math.ceil(Math.abs(state.sample.z) / 2) * 2;
    requestRender();
  }

  function stopSampling() {
    clearTimeout(repeatDelay);
    clearInterval(repeatInterval);
    repeatDelay = null;
    repeatInterval = null;
    pressSource = null;
    samplePointer = null;
    sampleButton.classList.remove("is-sampling");
  }

  function startSampling(source) {
    if (pressSource !== null) return;
    pressSource = source;
    sampleButton.classList.add("is-sampling");
    takeSample();
    repeatDelay = setTimeout(() => {
      takeSample();
      repeatInterval = setInterval(takeSample, 20);
    }, 350);
  }

  function clearResults() {
    stopSampling();
    state.sample = null;
    state.history = [];
    state.zLimit = 4;
  }

  function fitDomain() {
    const width = state.model.max - state.model.min;
    state.domain = [state.model.min - width * 0.25, state.model.max + width * 0.25];
  }

  function applyPoints(points) {
    try {
      const model = M.distribution(points);
      clearResults();
      state.model = model;
      requestRender();
      return true;
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      announce("Mantieni almeno due vertici distinti e un’area positiva.");
      return false;
    }
  }

  function isInternalSelection() { return state.selected !== null && state.selected > 0 && state.selected < state.model.points.length - 1; }

  function removeSelected() {
    if (!isInternalSelection()) return;
    const points = state.model.points.filter((_, i) => i !== state.selected);
    if (applyPoints(points)) {
      state.selected = null;
      announce("Punto eliminato. Risultati azzerati.");
      densitySvg.focus({ preventScroll: true });
    }
  }

  function localPoint(event) {
    const matrix = densitySvg.getScreenCTM();
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  }

  densitySvg.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0 || state.drag) return;
    stopSampling();
    const location = localPoint(event);
    const handle = event.target.closest(".handle");
    let index = handle ? Number(handle.dataset.index) : null;
    if (index === null) {
      if (location.x < densityPlot.left || location.x > densityPlot.right || location.y < densityPlot.top || location.y > densityPlot.bottom) return;
      const x = densityPlot.fromX(location.x), y = densityPlot.fromY(location.y);
      const points = state.model.points.map(p => ({ ...p }));
      const separation = (state.model.max - state.model.min) / 500;
      if (x <= state.model.min + separation || x >= state.model.max - separation) {
        state.selected = null;
        requestRender();
        return;
      }
      index = points.findIndex(p => p.x > x);
      if (points.some(p => Math.abs(p.x - x) < separation)) return;
      points.splice(index, 0, { x, y });
      if (!applyPoints(points)) return;
    }
    event.preventDefault();
    state.selected = index;
    state.drag = {
      pointerId: event.pointerId, index, origin: location,
      points: state.model.points.map(p => ({ ...p })), plot: densityPlot, moved: false
    };
    densitySvg.setPointerCapture(event.pointerId);
    densitySvg.focus({ preventScroll: true });
    requestRender();
  });

  densitySvg.addEventListener("pointermove", event => {
    const drag = state.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const location = localPoint(event);
    if (!drag.moved && Math.hypot(location.x - drag.origin.x, location.y - drag.origin.y) < 3) return;
    drag.moved = true;
    const points = drag.points.map(p => ({ ...p }));
    const i = drag.index, p = drag.plot;
    const gap = (p.max - p.min) / 750;
    const lower = i > 0 ? points[i - 1].x + gap : p.min;
    const upper = i < points.length - 1 ? points[i + 1].x - gap : p.max;
    points[i].x = Math.max(lower, Math.min(upper, p.fromX(location.x)));
    points[i].y = p.fromY(Math.max(p.top, Math.min(p.bottom, location.y)));
    applyPoints(points);
  });

  function finishDrag(event) {
    if (!state.drag || (event && event.pointerId !== state.drag.pointerId)) return;
    const id = state.drag.pointerId;
    const changed = state.drag.moved;
    state.drag = null;
    if (densitySvg.hasPointerCapture(id)) densitySvg.releasePointerCapture(id);
    if (changed) fitDomain();
    requestRender();
  }
  densitySvg.addEventListener("pointerup", finishDrag);
  densitySvg.addEventListener("pointercancel", finishDrag);
  densitySvg.addEventListener("lostpointercapture", finishDrag);
  densitySvg.addEventListener("contextmenu", event => event.preventDefault());

  densitySvg.addEventListener("focusin", event => {
    const handle = event.target.closest(".handle");
    if (handle) { state.selected = Number(handle.dataset.index); requestRender(); }
  });

  densitySvg.addEventListener("keydown", event => {
    const handle = event.target.closest(".handle");
    if (handle) state.selected = Number(handle.dataset.index);
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault(); removeSelected(); return;
    }
    if (event.key === "Escape") { finishDrag(); state.selected = null; requestRender(); return; }
    if (event.key === "+" || event.key === "Insert") {
      event.preventDefault();
      const points = state.model.points.map(p => ({ ...p }));
      const i = state.selected === null ? 0 : Math.min(state.selected, points.length - 2);
      points.splice(i + 1, 0, { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 });
      if (applyPoints(points)) state.selected = i + 1;
      return;
    }
    if (state.selected === null || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const points = state.model.points.map(p => ({ ...p }));
    const i = state.selected, width = state.model.max - state.model.min;
    const step = (event.shiftKey ? 0.05 : 0.01);
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const proposed = points[i].x + (event.key === "ArrowLeft" ? -1 : 1) * width * step;
      points[i].x = Math.max(i > 0 ? points[i - 1].x + width / 500 : -Infinity,
        Math.min(i < points.length - 1 ? points[i + 1].x - width / 500 : Infinity, proposed));
    } else {
      points[i].y = Math.max(0, points[i].y + (event.key === "ArrowDown" ? -1 : 1) * densityPlot.yMax * step);
    }
    if (applyPoints(points)) fitDomain();
  });

  sampleButton.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0 || pressSource !== null || state.drag) return;
    event.preventDefault();
    sampleButton.focus({ preventScroll: true });
    sampleButton.setPointerCapture(event.pointerId);
    samplePointer = event.pointerId;
    startSampling("pointer");
  });
  const endSamplePointer = event => {
    if (pressSource !== "pointer" || samplePointer !== event.pointerId) return;
    stopSampling();
    if (sampleButton.hasPointerCapture(event.pointerId)) sampleButton.releasePointerCapture(event.pointerId);
    announce(`Campioni raccolti: ${state.history.length}.`);
  };
  sampleButton.addEventListener("pointerup", endSamplePointer);
  sampleButton.addEventListener("pointercancel", endSamplePointer);
  sampleButton.addEventListener("lostpointercapture", endSamplePointer);
  sampleButton.addEventListener("contextmenu", event => event.preventDefault());
  sampleButton.addEventListener("keydown", event => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) startSampling("keyboard");
  });
  sampleButton.addEventListener("keyup", event => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (pressSource === "keyboard") stopSampling();
  });
  // Assistive technologies dispatch a click without a preceding pointer event.
  sampleButton.addEventListener("click", event => {
    if (event.detail === 0 && pressSource === null) {
      takeSample(); announce(`Campioni raccolti: ${state.history.length}.`);
    }
  });
  sampleButton.addEventListener("blur", stopSampling);
  window.addEventListener("blur", () => { stopSampling(); finishDrag(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stopSampling(); finishDrag(); }
  });
  window.addEventListener("pagehide", stopSampling);

  $("sample-size").addEventListener("input", event => {
    const n = Number(event.target.value);
    if (n === state.n) return;
    clearResults();
    state.n = n;
    announce(`n uguale a ${n}. Risultati azzerati.`);
    requestRender();
  });
  $("delete-point").addEventListener("click", removeSelected);
  $("view-means").addEventListener("click", () => { state.view = "means"; requestRender(); });
  $("view-standardized").addEventListener("click", () => { state.view = "standardized"; requestRender(); });
  $("theory-button").addEventListener("click", () => { state.theory = !state.theory; requestRender(); });
  $("reset-button").addEventListener("click", () => {
    finishDrag();
    clearResults();
    state.model = M.distribution([{ x: 0, y: 1 }, { x: 1, y: 1 }]);
    state.n = 1;
    state.selected = null;
    state.theory = false;
    state.view = "standardized";
    fitDomain();
    announce("Slide ripristinata: densità uniforme su [0, 1], n uguale a 1.");
    requestRender();
  });

  for (let i = 0; i < 50; i++) {
    const cell = document.createElement("div");
    cell.className = "sample-cell";
    cell.setAttribute("role", "listitem");
    cells.push(cell);
    $("sample-grid").append(cell);
  }
  document.querySelectorAll("[data-latex]").forEach(element => renderFormula(element, element.dataset.latex));
  const resizeObserver = new ResizeObserver(requestRender);
  resizeObserver.observe(densitySvg);
  resizeObserver.observe(histogramSvg);
  window.Reveal.on("slidechanged", () => { stopSampling(); finishDrag(); requestRender(); });
  render();
};
