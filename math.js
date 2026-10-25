/* Shared numerical core: a classic script works from file:// as well as Pages. */
(function (root) {
  "use strict";

  function distribution(vertices) {
    if (vertices.length < 2) throw new RangeError("Servono almeno due vertici.");
    const points = vertices.map(({ x, y }) => ({ x, y }));
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.y < 0 || (i && p.x <= points[i - 1].x)) {
        throw new RangeError("Vertici non validi.");
      }
    }
    const origin = points[0].x;
    let area = 0;
    let first = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], h = b.x - a.x;
      const mass = h * (a.y + b.y) / 2;
      area += mass;
      first += (a.x - origin) * mass + h * h * (a.y + 2 * b.y) / 6;
    }
    if (!(area > 0) || !Number.isFinite(area)) throw new RangeError("La densità deve avere area positiva.");
    const offsetMean = first / area;
    const mean = origin + offsetMean;
    let variance = 0;
    let cumulative = 0;
    const segments = [];
    const gauss = [0.5 - 1 / Math.sqrt(12), 0.5 + 1 / Math.sqrt(12)];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], h = b.x - a.x;
      // Two-point Gaussian quadrature integrates this cubic exactly, without
      // subtracting E[X²] - E[X]² for distributions translated far from zero.
      for (const t of gauss) {
        const centered = (a.x - origin) - offsetMean + h * t;
        variance += h / (2 * area) * centered * centered * (a.y + (b.y - a.y) * t);
      }
      const mass = h * (a.y + b.y) / (2 * area);
      if (mass > 0) {
        segments.push({ x: a.x, width: h, y0: a.y / area, y1: b.y / area, start: cumulative, end: cumulative + mass });
      }
      cumulative += mass;
    }
    segments[segments.length - 1].end = 1;
    if (!(variance > 0) || !Number.isFinite(variance)) throw new RangeError("La varianza deve essere positiva.");
    return {
      points: points.map(p => ({ x: p.x, y: p.y / area })),
      mean, variance, sd: Math.sqrt(variance), segments,
      min: points[0].x, max: points[points.length - 1].x
    };
  }

  function quantile(model, probability) {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new RangeError("Probabilità non valida.");
    const segments = model.segments;
    let low = 0, high = segments.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (segments[mid].end <= probability) low = mid + 1;
      else high = mid;
    }
    const s = segments[low];
    const target = Math.max(0, probability - s.start) / s.width;
    const discriminant = Math.max(0, s.y0 * s.y0 + 2 * (s.y1 - s.y0) * target);
    const denominator = s.y0 + Math.sqrt(discriminant);
    // Rationalized quadratic solution remains stable for almost-flat segments.
    const t = denominator > 0 ? 2 * target / denominator : 0;
    return s.x + s.width * Math.max(0, Math.min(1, t));
  }

  function sample(model, n, random = Math.random) {
    if (!Number.isInteger(n) || n < 1) throw new RangeError("Numerosità non valida.");
    const values = Array.from({ length: n }, () => quantile(model, random()));
    const mean = model.min + values.reduce((sum, value) => sum + (value - model.min), 0) / n;
    return { values, mean, z: (mean - model.mean) / (model.sd / Math.sqrt(n)) };
  }

  function histogram(values, min, max, count = 40) {
    if (!(max > min) || !Number.isInteger(count) || count < 1) throw new RangeError("Intervallo non valido.");
    const width = (max - min) / count;
    const counts = Array(count).fill(0);
    for (const value of values) {
      if (!Number.isFinite(value) || value < min || value > max) throw new RangeError("Dato fuori dall’istogramma.");
      const bin = Math.min(count - 1, Math.floor((value - min) / width));
      counts[bin]++;
    }
    return { counts, width, densities: counts.map(c => values.length ? c / (values.length * width) : 0) };
  }

  function normalDensity(x, mean = 0, sd = 1) {
    const z = (x - mean) / sd;
    return Math.exp(-z * z / 2) / (sd * Math.sqrt(2 * Math.PI));
  }

  const api = { distribution, quantile, sample, histogram, normalDensity };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CLTMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
