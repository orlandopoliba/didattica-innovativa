const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mse, fit } = require('../regression.js');
test('exact line and intercept', () => {
  const data = [[0, 2], [1, 5], [2, 8]];
  assert.deepEqual(fit(data), { a: 3, b: 2, unique: true });
  assert.equal(mse(data, 3, 2), 0);
});
test('default optimum satisfies both normal equations and minimizes MSE', () => {
  const data = [[1, 2], [3, 3.8], [5, 4.2], [7, 7.4], [9, 8]];
  const { a, b } = fit(data);
  assert.ok(Math.abs(a - .78) < 1e-12);
  assert.ok(Math.abs(b - 1.18) < 1e-12);
  assert.ok(Math.abs(data.reduce((s, [x, y]) => s + a * x + b - y, 0)) < 1e-10);
  assert.ok(Math.abs(data.reduce((s, [x, y]) => s + x * (a * x + b - y), 0)) < 1e-10);
  for (const da of [-.1, 0, .1]) for (const db of [-.1, 0, .1]) {
    assert.ok(mse(data, a + da, b + db) >= mse(data, a, b) - 1e-12);
  }
});
test('empty and constant-x datasets', () => {
  assert.equal(fit([]), null);
  assert.ok(Number.isNaN(mse([], 1, 0)));
  assert.deepEqual(fit([[2, 4]]), { a: 0, b: 4, unique: false });
  assert.deepEqual(fit([[2, 2], [2, 6]]), { a: 0, b: 4, unique: false });
});
test('nearly vertical data retain an unconstrained optimum', () => {
  const data = [[5, 1], [5.001, 9]];
  const result = fit(data);
  assert.ok(result.a > 7000);
  assert.ok(mse(data, result.a, result.b) < 1e-16);
});
