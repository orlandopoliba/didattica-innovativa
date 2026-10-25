const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../math.js');

function near(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected} (tol ${tolerance})`);
}

function rng(seed = 42) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

test('Uniform density: normalization, exact moments and quantiles', () => {
  const model = M.distribution([{ x: 0, y: 7 }, { x: 1, y: 7 }]);
  near(model.mean, 0.5);
  near(model.variance, 1 / 12);
  model.points.forEach(p => near(p.y, 1));
  for (const p of [0, 0.01, 0.5, 0.99, 1]) near(M.quantile(model, p), p);
});

test('Triangular densities: exact moments and inverse CDF at both slopes', () => {
  const increasing = M.distribution([{ x: 0, y: 0 }, { x: 1, y: 2 }]);
  const decreasing = M.distribution([{ x: 0, y: 2 }, { x: 1, y: 0 }]);
  near(increasing.mean, 2 / 3);
  near(decreasing.mean, 1 / 3);
  near(increasing.variance, 1 / 18);
  near(decreasing.variance, 1 / 18);
  for (const p of [0, 1e-10, 0.1, 0.5, 0.9, 1]) {
    near(M.quantile(increasing, p), Math.sqrt(p));
    near(M.quantile(decreasing, p), 1 - Math.sqrt(1 - p));
  }
  const symmetric = M.distribution([{ x: -1, y: 0 }, { x: 0, y: 3 }, { x: 1, y: 0 }]);
  near(symmetric.mean, 0);
  near(symmetric.variance, 1 / 6);
  near(M.quantile(symmetric, 0.5), 0);
});

test('Translated narrow support retains accurate variance', () => {
  const model = M.distribution([{ x: 1000000, y: 4 }, { x: 1000002, y: 4 }]);
  near(model.mean, 1000001);
  near(model.variance, 1 / 3);
});

test('Disconnected positive-density regions skip zero-mass segments', () => {
  const model = M.distribution([
    { x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 0 },
    { x: 3, y: 0 }, { x: 4, y: 2 }, { x: 5, y: 0 }
  ]);
  const random = rng();
  for (let i = 0; i < 5000; i++) {
    const x = M.quantile(model, random());
    assert.ok(x <= 2 || x >= 3);
    assert.ok(x >= 0 && x <= 5);
  }
  near(M.quantile(model, 0.5), 3);
});

test('Invalid edits cannot produce negative density, zero area or crossing vertices', () => {
  for (const points of [[], [{ x: 0, y: 1 }], [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 0, y: -1 }, { x: 1, y: 2 }], [{ x: 1, y: 1 }, { x: 0, y: 1 }],
    [{ x: 0, y: 1 }, { x: 0, y: 1 }], [{ x: 0, y: NaN }, { x: 1, y: 1 }]]) {
    assert.throws(() => M.distribution(points), RangeError);
  }
});

test('Generated observations and standardized means match population moments', () => {
  const model = M.distribution([{ x: -2, y: 0 }, { x: 3, y: 2 }]);
  const random = rng(2026);
  for (const n of [1, 10, 50]) {
    let sum = 0, squares = 0;
    for (let i = 0; i < 12000; i++) {
      const sample = M.sample(model, n, random);
      assert.equal(sample.values.length, n);
      near(sample.mean, sample.values.reduce((a, b) => a + b, 0) / n, 1e-13);
      sum += sample.z;
      squares += sample.z ** 2;
    }
    near(sum / 12000, 0, 0.035);
    near(squares / 12000, 1, 0.045);
  }
});

test('Histogram includes both endpoints and has unit area in both coordinate systems', () => {
  const values = [-4, -1, 0, 0.4, 1, 2, 4];
  const z = M.histogram(values, -4, 4);
  assert.equal(z.counts.reduce((a, b) => a + b, 0), values.length);
  assert.equal(z.counts[0], 1);
  assert.equal(z.counts[39], 1);
  near(z.densities.reduce((a, b) => a + b, 0) * z.width, 1);
  const original = M.histogram(values.map(x => 5 + 0.5 * x), 3, 7);
  assert.deepEqual(original.counts, z.counts);
  near(original.densities.reduce((a, b) => a + b, 0) * original.width, 1);
  near(M.normalDensity(5, 5, 0.5), 2 * M.normalDensity(0));
  assert.ok(M.histogram([], -4, 4).densities.every(x => x === 0));
  assert.throws(() => M.histogram([5], -4, 4), RangeError);
});
