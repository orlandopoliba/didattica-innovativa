/* Local Canvas renderer: orthographic 3D projection, no network dependencies. */
(() => {
  'use strict';
  const defaults = [[1, 2], [3, 3.8], [5, 4.2], [7, 7.4], [9, 8]];
  const mse = (points, a, b) => points.length
    ? points.reduce((sum, [x, y]) => sum + (a * x + b - y) ** 2, 0) / points.length : NaN;
  function fit(points) {
    if (!points.length) return null;
    const mx = points.reduce((s, p) => s + p[0], 0) / points.length;
    const my = points.reduce((s, p) => s + p[1], 0) / points.length;
    const variance = points.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
    const a = variance > 1e-20
      ? points.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / variance : 0;
    return { a, b: my - a * mx, unique: variance > 1e-20 };
  }
  // Also usable by the numerical tests without a DOM.
  if (typeof module !== 'undefined') module.exports = { mse, fit };
  if (typeof window === 'undefined') return;
  window.initializeRegression = () => {
    const root = document.querySelector('.regression-slide');
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    const el = id => document.getElementById(`reg-${id}`);
    const scatter = el('scatter'), surface = el('surface');
    const controls = [el('a'), el('b')];
    let points, a, b, yaw, tilt, animation = 0, frame = 0, mesh = [], zMax = 1;
    let cursor = [5, 5], gesture = null;
    const fmt = x => (Math.abs(x) < .0005 ? 0 : x).toLocaleString('en-US', { maximumFractionDigits: 3, useGrouping: false });
    const texNumber = x => fmt(x);
    const math = (node, source) => {
      if (node.dataset.tex === source) return;
      katex.render(source, node, { throwOnError: false });
      node.dataset.tex = source;
    };
    root.querySelectorAll('[data-reg-math]').forEach(node => math(node, node.dataset.regMath));
    el('mse').innerHTML = '<span></span><span></span>';
    math(el('mse').firstChild, 'MSE(a,b)=\\frac{1}{n}\\sum_{i=1}^{n}(ax_i+b-y_i)^2');
    const ranges = () => controls.map(input => [+input.min, +input.max]);
    function rebuild() {
      mesh = [];
      if (!points.length) return;
      const [[amin, amax], [bmin, bmax]] = ranges();
      zMax = Math.max(1, ...[amin, amax].flatMap(aa => [bmin, bmax].map(bb => mse(points, aa, bb))));
      const steps = 32;
      for (let i = 0; i <= steps; i++) {
        mesh[i] = [];
        for (let j = 0; j <= steps; j++) {
          const aa = amin + (amax - amin) * i / steps;
          const bb = bmin + (bmax - bmin) * j / steps;
          mesh[i][j] = [i / steps * 2 - 1, j / steps * 2 - 1, mse(points, aa, bb) / zMax];
        }
      }
    }
    function prepare(canvas) {
      const { width: w, height: h } = canvas.getBoundingClientRect();
      if (!w || !h) return null;
      const ratio = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
        canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.font = '12px system-ui'; ctx.lineWidth = 1;
      return { ctx, w, h };
    }
    function line(ctx, vertices, color, width = 1) {
      ctx.beginPath(); vertices.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }
    function scatterPlot() {
      const box = prepare(scatter); if (!box) return;
      const { ctx, w, h } = box;
      const px = x => 38 + x / 10 * (w - 58), py = y => h - 30 - y / 10 * (h - 48);
      ctx.fillStyle = '#68768a'; ctx.textAlign = 'center';
      for (let v = 0; v <= 10; v += 2) {
        line(ctx, [[px(v), py(0)], [px(v), py(10)]], '#e1e6ed');
        line(ctx, [[px(0), py(v)], [px(10), py(v)]], '#e1e6ed');
        ctx.fillText(v, px(v), h - 10); ctx.fillText(v, 22, py(v) + 4);
      }
      ctx.save(); ctx.beginPath(); ctx.rect(px(0), py(10), w - 58, h - 48); ctx.clip();
      // Residuals connect each observation to its prediction on the line.
      ctx.setLineDash([4, 4]);
      points.forEach(([x, y]) => line(ctx, [[px(x), py(y)], [px(x), py(a * x + b)]], '#d6a5a1', 1.5));
      ctx.setLineDash([]);
      line(ctx, [[px(0), py(b)], [px(10), py(a * 10 + b)]], '#2665ba', 2.5);
      ctx.restore();
      points.forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(px(x), py(y), 6, 0, Math.PI * 2);
        ctx.fillStyle = '#168477'; ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
      });
      if (document.activeElement === scatter) {
        const [x, y] = cursor;
        line(ctx, [[px(x) - 9, py(y)], [px(x) + 9, py(y)]], '#273447');
        line(ctx, [[px(x), py(y) - 9], [px(x), py(y) + 9]], '#273447');
      }
      scatter.dataset.count = points.length;
    }
    function surfacePlot() {
      const box = prepare(surface); if (!box) return;
      const { ctx, w, h } = box;
      const scale = Math.min(w / 3.7, h / 3.4);
      const project = ([x, y, z]) => {
        const u = x * Math.cos(yaw) - y * Math.sin(yaw);
        const v = x * Math.sin(yaw) + y * Math.cos(yaw);
        return [w / 2 + scale * u, h * .62 + scale * (v * Math.sin(tilt) - z * 1.65 * Math.cos(tilt)),
          v * Math.cos(tilt) + z * 1.65 * Math.sin(tilt)];
      };
      const draw3 = (vertices, color, width) => line(ctx, vertices.map(project), color, width);
      for (let i = 0; i <= 4; i++) {
        const t = -1 + i / 2;
        draw3([[t, -1, 0], [t, 1, 0]], '#e1e6ed');
        draw3([[-1, t, 0], [1, t, 0]], '#e1e6ed');
      }
      const faces = [];
      for (let i = 0; i < mesh.length - 1; i++) for (let j = 0; j < mesh[i].length - 1; j++) {
        const vertices = [mesh[i][j], mesh[i + 1][j], mesh[i + 1][j + 1], mesh[i][j + 1]];
        const projected = vertices.map(project);
        faces.push({ projected, depth: projected.reduce((s, p) => s + p[2], 0) / 4,
          z: vertices.reduce((s, p) => s + p[2], 0) / 4 });
      }
      faces.sort((x, y) => x.depth - y.depth).forEach(({ projected, z }) => {
        ctx.beginPath(); projected.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        ctx.closePath(); ctx.fillStyle = `hsl(${174 + z * 40} 42% ${79 - z * 25}%)`; ctx.fill();
        ctx.strokeStyle = '#426f7838'; ctx.lineWidth = .5; ctx.stroke();
      });
      const axes = [
        { id: 'a', start: [-1, -1, 0], end: [1.23, -1, 0], values: ranges()[0] },
        { id: 'b', start: [-1, -1, 0], end: [-1, 1.23, 0], values: ranges()[1] },
        { id: 'mse', start: [-1, -1, 0], end: [-1, -1, 1.16], values: [0, zMax] }
      ];
      axes.forEach(axis => {
        draw3([axis.start, axis.end], '#68768a', 1.2);
        const p = project(axis.end), label = el(`axis-${axis.id}`);
        label.style.left = `${p[0]}px`; label.style.top = `${p[1] - 12}px`;
        ctx.fillStyle = '#68768a'; ctx.textAlign = 'center';
        for (let i = 0; i <= 2; i++) {
          const t = i / 2;
          const position = [...axis.start];
          const dim = axis.id === 'a' ? 0 : axis.id === 'b' ? 1 : 2;
          position[dim] = axis.id === 'mse' ? t : -1 + 2 * t;
          const q = project(position);
          const dx = i === 0 ? (axis.id === 'a' ? 14 : -14) : 0;
          const dy = i === 0 ? (axis.id === 'b' ? 22 : -5) : 15;
          ctx.fillText(fmt(axis.values[0] + t * (axis.values[1] - axis.values[0])), q[0] + dx, q[1] + dy);
        }
      });
      if (points.length) {
        const [[amin, amax], [bmin, bmax]] = ranges();
        const x = (a - amin) / (amax - amin) * 2 - 1, y = (b - bmin) / (bmax - bmin) * 2 - 1;
        const z = mse(points, a, b) / zMax;
        ctx.setLineDash([4, 4]); draw3([[x, y, 0], [x, y, z]], '#bc443e', 1.5); ctx.setLineDash([]);
        // Keep the selected value readable even when it is behind the surface.
        const p = project([x, y, z]);
        ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#c74740'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
      } else {
        ctx.fillStyle = '#68768a'; ctx.textAlign = 'center'; ctx.fillText('Aggiungi un punto nello scatterplot', w / 2, h / 2);
      }
      surface.dataset.rotation = `${yaw},${tilt}`;
    }
    function draw() { frame = 0; scatterPlot(); surfacePlot(); }
    function scheduleDraw() { if (!frame) frame = requestAnimationFrame(draw); }
    function update() {
      controls[0].value = a; controls[1].value = b;
      [a, b].forEach((v, i) => {
        math(el(`${i ? 'b' : 'a'}-value`), texNumber(v));
        controls[i].setAttribute('aria-valuetext', fmt(v));
      });
      math(el('line'), `y=ax+b=${texNumber(a)}x${b < 0 ? '-' : '+'}${texNumber(Math.abs(b))}`);
      const value = mse(points, a, b);
      math(el('mse').lastChild, Number.isFinite(value) ? `=${texNumber(value)}` : '=\\text{non definito}');
      el('mse').dataset.value = value;
      el('optimize').disabled = !points.length;
      scheduleDraw();
    }
    function stop() { cancelAnimationFrame(animation); animation = 0; }
    function changedData() {
      stop(); rebuild(); update();
      el('status').textContent = !points.length ? 'Nessun dato: aggiungi un punto per calcolare il MSE.'
        : !fit(points).unique ? 'Con queste ascisse il minimo non è unico: Ottimizza sceglie una retta orizzontale.' : '';
    }
    controls.forEach((input, i) => input.addEventListener('input', () => {
      stop(); if (i) b = +input.value; else a = +input.value;
      el('status').textContent = ''; update();
    }));
    el('optimize').addEventListener('click', () => {
      stop(); const target = fit(points); if (!target) return;
      // Preserve the exact unconstrained solution, including nearly vertical datasets.
      [target.a, target.b].forEach((v, i) => {
        if (v < +controls[i].min) controls[i].min = Math.floor(v - 1);
        if (v > +controls[i].max) controls[i].max = Math.ceil(v + 1);
      });
      rebuild();
      const fromA = a, fromB = b, start = performance.now();
      const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;
      const tick = now => {
        const t = duration ? Math.min(1, (now - start) / duration) : 1;
        const ease = t * t * (3 - 2 * t);
        a = t === 1 ? target.a : fromA + (target.a - fromA) * ease;
        b = t === 1 ? target.b : fromB + (target.b - fromB) * ease;
        update();
        if (t < 1) animation = requestAnimationFrame(tick);
        else {
          animation = 0;
          el('status').textContent = target.unique ? 'Minimo raggiunto: questa retta minimizza il MSE.'
            : 'Minimo raggiunto. Non è unico: è stata scelta la retta orizzontale.';
        }
      };
      animation = requestAnimationFrame(tick);
    });
    function pointAt(event) {
      const box = scatter.getBoundingClientRect();
      return [(event.clientX - box.left - 38) / (box.width - 58) * 10,
        (box.height - 30 - event.clientY + box.top) / (box.height - 48) * 10];
    }
    function nearest(point) {
      const box = scatter.getBoundingClientRect();
      let index = -1, distance = 18;
      points.forEach(([x, y], i) => {
        const d = Math.hypot((x - point[0]) * (box.width - 58) / 10, (y - point[1]) * (box.height - 48) / 10);
        if (d < distance) { distance = d; index = i; }
      });
      return index;
    }
    scatter.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
      scatter.setPointerCapture(event.pointerId);
    });
    scatter.addEventListener('pointerup', event => {
      const start = gesture; gesture = null;
      if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
      const point = pointAt(event), index = nearest(point);
      if (index >= 0) points.splice(index, 1);
      else if (point.every(v => v >= 0 && v <= 10)) points.push(point);
      else return;
      changedData();
    });
    scatter.addEventListener('pointercancel', () => { gesture = null; });
    scatter.addEventListener('keydown', event => {
      const step = event.shiftKey ? 1 : .2;
      const directions = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (directions[event.key]) cursor = cursor.map((v, i) => Math.max(0, Math.min(10, v + directions[event.key][i])));
      else if (event.key === 'Enter') { points.push([...cursor]); changedData(); }
      else if (event.key === 'Delete' || event.key === 'Backspace') {
        const index = nearest(cursor); if (index >= 0) { points.splice(index, 1); changedData(); }
      } else return;
      event.preventDefault(); scheduleDraw();
    });
    scatter.addEventListener('focus', scheduleDraw); scatter.addEventListener('blur', scheduleDraw);
    let rotation = null;
    surface.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      surface.setPointerCapture(event.pointerId);
      rotation = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    surface.addEventListener('pointermove', event => {
      if (!rotation || rotation.id !== event.pointerId) return;
      yaw -= (event.clientX - rotation.x) * .01;
      tilt = Math.max(.15, Math.min(1.2, tilt + (event.clientY - rotation.y) * .008));
      rotation.x = event.clientX; rotation.y = event.clientY; scheduleDraw();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => surface.addEventListener(type, () => { rotation = null; }));
    surface.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      yaw += event.key === 'ArrowLeft' ? .1 : event.key === 'ArrowRight' ? -.1 : 0;
      tilt = Math.max(.15, Math.min(1.2, tilt + (event.key === 'ArrowUp' ? -.1 : event.key === 'ArrowDown' ? .1 : 0)));
      scheduleDraw();
    });
    function reset() {
      stop(); points = defaults.map(p => [...p]); a = -.4; b = 6; yaw = -.65; tilt = .55;
      controls[0].min = -2; controls[0].max = 3; controls[1].min = -4; controls[1].max = 8;
      cursor = [5, 5]; rotation = null; gesture = null; el('status').textContent = '';
      rebuild(); update();
    }
    el('reset').addEventListener('click', reset);
    new ResizeObserver(scheduleDraw).observe(root);
    window.addEventListener('resize', scheduleDraw);
    window.Reveal?.on('slidechanged', () => { stop(); scheduleDraw(); });
    document.fonts.ready.then(scheduleDraw);
    reset();
  };
})();
