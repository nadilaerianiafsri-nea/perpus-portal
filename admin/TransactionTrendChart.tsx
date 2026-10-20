"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { chartTickIndices, getIntegerAxis, type ChartGranularity, type TransactionTrendRow } from "@/shared/chartTime.cjs";
import styles from "./TransactionTrendChart.module.css";

/** The existing transaction line chart, shared by dashboard and reports. */
export default function TransactionTrendChart({ rows, granularity }: { rows: TransactionTrendRow[]; granularity: ChartGranularity }) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(860);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const tooltip = useId();
  const axis = getIntegerAxis(Math.max(0, ...rows.flatMap(row => [row.borrowings, row.returns])));
  const left = Math.max(40, String(axis.maximum).length * 8 + 16), right = width - 18;
  const top = 20, bottom = 268;
  const ticks = chartTickIndices(rows.length, width < 450 ? 4 : width < 700 ? 6 : 9);
  const point = (index: number, value: number) => ({
    x: rows.length <= 1 ? (left + right) / 2 : left + index / (rows.length - 1) * (right - left),
    y: bottom - value / axis.maximum * (bottom - top),
  });
  const points = (key: "borrowings" | "returns") => rows.map((row, index) => {
    const p = point(index, row[key]);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(" ");
  const activeIndex = rows.findIndex(row => row.key === activeKey);
  const active = rows[activeIndex];
  const activePoint = active ? point(activeIndex, Math.max(active.borrowings, active.returns)) : null;

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={frame} className={styles.frame} data-transaction-trend data-chart-granularity={granularity} onMouseLeave={() => {
    if (!frame.current?.contains(document.activeElement)) setActiveKey(null);
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setActiveKey(null); }} onKeyDown={event => { if (event.key === "Escape") setActiveKey(null); }}>
    <svg className={styles.chart} viewBox={`0 0 ${width} 320`} role="group" aria-label="Grafik peminjaman dan pengembalian berdasarkan periode terpilih">
      <g className={styles.grid} aria-hidden="true">{axis.ticks.map(value => <line key={value} x1={left} y1={point(0, value).y} x2={right} y2={point(0, value).y} />)}</g>
      <g className={styles.axis} data-chart-y-axis="true" aria-hidden="true">{axis.ticks.map(value => <text key={value} x={left - 12} y={point(0, value).y + 4} textAnchor="end">{value}</text>)}</g>
      <polyline className={styles.borrowings} points={points("borrowings")} aria-hidden="true" />
      <polyline className={styles.returns} points={points("returns")} aria-hidden="true" />
      {rows.map((row, index) => {
        const borrowing = point(index, row.borrowings), returned = point(index, row.returns);
        const label = `${row.tooltipLabel ?? row.label}: ${row.borrowings} peminjaman, ${row.returns} pengembalian`;
        const events = {
          tabIndex: 0, role: "button", "aria-label": label,
          "aria-describedby": activeKey === row.key ? tooltip : undefined,
          onMouseEnter: () => setActiveKey(row.key), onFocus: () => setActiveKey(row.key), onClick: () => setActiveKey(row.key),
          onKeyDown: (event: KeyboardEvent<SVGCircleElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActiveKey(row.key); } },
        };
        const spacing = rows.length > 1 ? (right - left) / (rows.length - 1) : right - left;
        return <g key={row.key} data-trend-key={row.key}>
          <rect x={Math.max(left, borrowing.x - spacing / 2)} y={top} width={Math.min(spacing, right - Math.max(left, borrowing.x - spacing / 2))} height={bottom - top} fill="transparent" aria-hidden="true" onMouseEnter={() => setActiveKey(row.key)} onClick={() => setActiveKey(row.key)} />
          <circle {...events} className={styles.borrowingPoint} cx={borrowing.x} cy={borrowing.y} r="3.5" />
          <circle {...events} className={styles.returnPoint} cx={returned.x} cy={returned.y} r="3.5" />
        </g>;
      })}
      <g className={styles.axis} aria-hidden="true">{ticks.map(index => <text key={rows[index].key} data-chart-tick={rows[index].key} x={point(index, 0).x} y={303} textAnchor={index === 0 ? "start" : index === rows.length - 1 ? "end" : "middle"}>{rows[index].label}</text>)}</g>
    </svg>
    {active && activePoint && <div className={`${styles.tooltip} ${activePoint.y < 95 ? styles.tooltipBelow : ""}`} id={tooltip} role="status" style={{ left: `clamp(94px, ${activePoint.x}px, calc(100% - 94px))`, top: `${activePoint.y}px` }}>
      <strong>{active.tooltipLabel ?? active.label}</strong>
      <span>Peminjaman: {active.borrowings}</span>
      <span>Pengembalian: {active.returns}</span>
    </div>}
  </div>;
}
