const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getChartGranularity, buildTransactionTrend, getIntegerAxis, chartTickIndices } = require('./chartTime.cjs');

test('presets and inclusive range length choose consistent chart granularity', () => {
  for (const [range, preset, expected] of [
    [{ from: '2026-10-20', to: '2026-10-20' }, 'today', 'hour'],
    [{ from: '2026-10-19', to: '2026-10-20' }, 'this-week', 'day'],
    [{ from: '2026-10-01', to: '2026-10-20' }, 'this-month', 'day'],
    [{ from: '2026-10-01', to: '2026-10-20' }, 'custom', 'day'],
    [{ from: '2026-01-01', to: '2026-03-03' }, undefined, 'day'],
    [{ from: '2026-01-01', to: '2026-03-04' }, undefined, 'month'],
    [{ from: '2026-04-01', to: '2026-09-30' }, 'custom', 'month'],
    [{ from: '2025-01-01', to: '2026-12-31' }, undefined, 'month'],
    [{ from: '2024-01-01', to: '2026-12-31' }, undefined, 'year'],
  ]) assert.equal(getChartGranularity(range, preset), expected);
});

test('daily rows retain missing days and align both series at WIB boundaries', () => {
  const rows = buildTransactionTrend({ from: '2026-10-01', to: '2026-10-03' }, 'day',
    [new Date('2026-09-30T17:30:00Z'), '2026-10-02T17:30:00Z', '2026-09-30T16:59:59Z'],
    [null, '2026-10-02T01:00:00Z']);
  assert.deepEqual(rows, [
    { key: '2026-10-01', label: '1 Okt', tooltipLabel: '1 Okt 2026', borrowings: 1, returns: 0 },
    { key: '2026-10-02', label: '2 Okt', tooltipLabel: '2 Okt 2026', borrowings: 0, returns: 1 },
    { key: '2026-10-03', label: '3 Okt', tooltipLabel: '3 Okt 2026', borrowings: 1, returns: 0 },
  ]);
});

test('today has all 24 actual hourly buckets, including empty future hours', () => {
  const rows = buildTransactionTrend({ from: '2026-10-20', to: '2026-10-20' }, 'hour',
    ['2026-10-19T17:30:00Z', '2026-10-20T03:00:00Z'], ['2026-10-20T03:59:00Z']);
  assert.equal(rows.length, 24);
  assert.equal(rows[0].key, '2026-10-20T00');
  assert.deepEqual(rows[10], { key: '2026-10-20T10', label: '10:00', tooltipLabel: '10:00', borrowings: 1, returns: 1 });
  assert.equal(rows[23].borrowings, 0);
  assert.equal(rows[23].label, '23:00');
});

test('monthly rows zero fill missing months, retain Indonesian labels and cover a whole year', () => {
  const range = { from: '2026-01-01', to: '2026-12-31' };
  const rows = buildTransactionTrend(range, getChartGranularity(range), ['2026-09-30T17:30:00Z'], []);
  assert.equal(rows.length, 12);
  assert.equal(rows[0].key, '2026-01');
  assert.equal(rows[11].key, '2026-12');
  assert.deepEqual(rows[9], { key: '2026-10', label: 'Okt 2026', tooltipLabel: 'Oktober 2026', borrowings: 1, returns: 0 });
  assert.equal(rows[4].label, 'Mei 2026');
  assert.equal(rows[7].label, 'Agu 2026');
  assert.equal(rows[8].borrowings, 0);
});

test('yearly rows use calendar years and exclude activity outside a partial range', () => {
  const rows = buildTransactionTrend({ from: '2024-06-01', to: '2026-10-20' }, 'year',
    ['2024-01-01T00:00:00Z', '2025-01-01T00:00:00Z', '2026-10-20T17:00:00Z'], []);
  assert.deepEqual(rows.map(row => [row.key, row.borrowings, row.returns]), [['2024', 0, 0], ['2025', 1, 0], ['2026', 0, 0]]);
});

test('integer axes stay distinct and cover counts, including empty and low counts', () => {
  for (const count of [0, 1, 2, 3, 6, 19, 301]) {
    const axis = getIntegerAxis(count);
    assert.ok(axis.maximum >= Math.max(1, count));
    assert.equal(axis.ticks[0], 0);
    assert.equal(axis.ticks.at(-1), axis.maximum);
    assert.equal(new Set(axis.ticks).size, axis.ticks.length);
    assert.ok(axis.ticks.every((tick, index) => Number.isInteger(tick) && (!index || tick > axis.ticks[index - 1])));
  }
});

test('visual tick thinning includes endpoints without dropping any data rows', () => {
  assert.deepEqual(chartTickIndices(0, 6), []);
  assert.deepEqual(chartTickIndices(1, 6), [0]);
  assert.deepEqual(chartTickIndices(3, 6), [0, 1, 2]);
  const indices = chartTickIndices(31, 6);
  assert.equal(indices[0], 0);
  assert.equal(indices.at(-1), 30);
  assert.equal(indices.length, 6);
  assert.equal(new Set(indices).size, indices.length);
});
