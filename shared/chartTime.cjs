const DAY_MS = 86_400_000;
const WIB_MS = 7 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const FULL_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function calendarDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError('Tanggal grafik tidak valid.');
  }
  return date;
}

function calendarRange(range) {
  const from = calendarDate(range.from), to = calendarDate(range.to);
  if (from > to) throw new RangeError('Rentang grafik tidak valid.');
  return { from, to, days: (to.getTime() - from.getTime()) / DAY_MS + 1 };
}

exports.getChartGranularity = function getChartGranularity(range, preset) {
  const { from, to, days } = calendarRange(range);
  if (preset === 'today') return 'hour';
  if (days <= 62) return 'day';
  const months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth() + 1;
  return months <= 24 ? 'month' : 'year';
};

function periodKey(date, granularity) {
  const iso = date.toISOString();
  return iso.slice(0, { hour: 13, day: 10, month: 7, year: 4 }[granularity]);
}

function periodLabels(key, granularity) {
  const [year, month, day] = key.slice(0, 10).split('-').map(Number);
  if (granularity === 'hour') return { label: `${key.slice(11)}:00`, tooltipLabel: `${key.slice(11)}:00` };
  if (granularity === 'day') return { label: `${day} ${MONTHS[month - 1]}`, tooltipLabel: `${day} ${MONTHS[month - 1]} ${year}` };
  if (granularity === 'month') return { label: `${MONTHS[month - 1]} ${year}`, tooltipLabel: `${FULL_MONTHS[month - 1]} ${year}` };
  return { label: key, tooltipLabel: key };
}

exports.buildTransactionTrend = function buildTransactionTrend(range, granularity, borrowedDates, returnedDates) {
  const { from, to, days } = calendarRange(range);
  if (!['hour', 'day', 'month', 'year'].includes(granularity) || (granularity === 'hour' && days !== 1)) {
    throw new RangeError('Granularitas grafik tidak valid.');
  }
  // Calendar arithmetic uses UTC only after resolving dates in WIB. No host timezone is involved.
  const cursor = new Date(from);
  if (granularity === 'month') cursor.setUTCDate(1);
  if (granularity === 'year') cursor.setUTCMonth(0, 1);
  const end = granularity === 'hour' ? new Date(to.getTime() + DAY_MS - 1) : to;
  const buckets = new Map();
  while (cursor <= end) {
    const key = periodKey(cursor, granularity);
    buckets.set(key, { key, ...periodLabels(key, granularity), borrowings: 0, returns: 0 });
    if (granularity === 'hour') cursor.setUTCHours(cursor.getUTCHours() + 1);
    if (granularity === 'day') cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (granularity === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    if (granularity === 'year') cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
  }
  const count = (dates, field) => {
    for (const value of dates) {
      if (value == null) continue;
      const shifted = new Date(new Date(value).getTime() + WIB_MS);
      if (!Number.isFinite(shifted.getTime())) continue;
      const day = shifted.toISOString().slice(0, 10);
      if (day < range.from || day > range.to) continue;
      const bucket = buckets.get(periodKey(shifted, granularity));
      if (bucket) bucket[field] += 1;
    }
  };
  count(borrowedDates, 'borrowings');
  count(returnedDates, 'returns');
  return [...buckets.values()];
};

exports.getIntegerAxis = function getIntegerAxis(maximum, intervals = 4) {
  const count = Number.isFinite(maximum) ? Math.max(1, Math.ceil(maximum)) : 1;
  const divisions = Number.isFinite(intervals) ? Math.max(1, Math.floor(intervals)) : 4;
  const rawStep = Math.max(1, count / divisions);
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].find(value => value * power >= rawStep) * power;
  const limit = Math.ceil(count / step) * step;
  const ticks = Array.from({ length: Math.round(limit / step) + 1 }, (_, index) => index * step);
  return { maximum: limit, ticks };
};

exports.chartTickIndices = function chartTickIndices(length, maxTicks) {
  if (!Number.isFinite(length) || length < 1) return [];
  const size = Math.floor(length);
  const count = Math.min(size, Number.isFinite(maxTicks) ? Math.max(2, Math.floor(maxTicks)) : size);
  if (size === 1) return [0];
  return Array.from({ length: count }, (_, index) => Math.round(index * (size - 1) / (count - 1)));
};
