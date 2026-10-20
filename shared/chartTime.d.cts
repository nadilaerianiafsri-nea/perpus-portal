export type ChartGranularity = 'hour' | 'day' | 'month' | 'year';
export type ChartRange = { from: string; to: string };
export type TransactionTrendRow = { key: string; label: string; tooltipLabel: string; borrowings: number; returns: number };
export function getChartGranularity(range: ChartRange, preset?: string): ChartGranularity;
export function buildTransactionTrend(range: ChartRange, granularity: ChartGranularity, borrowedDates: (Date | string)[], returnedDates: (Date | string | null)[]): TransactionTrendRow[];
export function getIntegerAxis(maximum: number, intervals?: number): { maximum: number; ticks: number[] };
export function chartTickIndices(length: number, maxTicks: number): number[];
