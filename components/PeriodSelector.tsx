"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiCalendar, FiEdit2 } from "react-icons/fi";
import AppSelect from "./AppSelect";
import { createPeriod, formatPeriodRange, validatePeriodRange, type PeriodPreset, type PeriodValue } from "@/shared/period";
import { createTransactionPeriod, type TransactionPeriodPreset, type TransactionPeriodValue } from "@/shared/transactionPeriod";
import { Button } from "./Button";
import styles from "./PeriodSelector.module.css";

type SharedPeriodSelectorProps = {
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  maxDate?: string;
  showAppliedRange?: boolean;
};

type PeriodSelectorProps = SharedPeriodSelectorProps & ({
  mode?: "default";
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
} | {
  mode: "transaction";
  value: TransactionPeriodValue;
  onChange: (value: TransactionPeriodValue) => void;
});

export default function PeriodSelector(props: PeriodSelectorProps) {
  const { value, onChange, label = "Periode", disabled = false, loading = false, maxDate, showAppliedRange = false } = props;
  const transaction = props.mode === "transaction";
  const id = useId();
  const select = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from: value.from, to: value.to });
  const validation = validatePeriodRange(draft.from, draft.to, { maxDate, ...(transaction ? { maxDays: Infinity } : {}) });
  const customLabel = transaction
    ? showAppliedRange && value.preset === "custom"
      ? formatPeriodRange(value) || "Rentang Tanggal"
      : "Rentang Tanggal"
    : "Rentang Waktu";

  useEffect(() => {
    if (!open || !panel.current) return;
    const element = panel.current;
    const trigger = select.current;
    function position() {
      if (!trigger) return;
      const anchor = trigger.getBoundingClientRect();
      const mobile = window.innerWidth <= 480;
      const width = Math.min(360, window.innerWidth - 32);
      const height = element.getBoundingClientRect().height;
      element.style.width = `${width}px`;
      element.style.left = `${mobile ? (window.innerWidth - width) / 2 : Math.max(16, Math.min(anchor.right - width, window.innerWidth - width - 16))}px`;
      element.style.top = `${mobile ? Math.max(16, window.innerHeight - height - 16) : Math.max(16, Math.min(anchor.bottom + 10, window.innerHeight - height - 16))}px`;
    }
    element.showPopover();
    position();
    const size = new ResizeObserver(position);
    size.observe(element);
    element.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      size.disconnect();
      const restore = element.contains(document.activeElement) || document.activeElement === document.body;
      if (element.matches(":popover-open")) element.hidePopover();
      if (restore) trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  function choose(preset: PeriodPreset | TransactionPeriodPreset) {
    if (preset === "custom") {
      setDraft({ from: value.from, to: value.to });
      setOpen(true);
    } else {
      setOpen(false);
      if (props.mode === "transaction") {
        props.onChange(createTransactionPeriod(preset as Exclude<TransactionPeriodPreset, "custom">));
      } else {
        props.onChange(createPeriod(preset as Exclude<PeriodPreset, "custom">));
      }
    }
  }

  return <div className={styles.root} data-period-selector data-applied-range={showAppliedRange && value.preset === "custom" || undefined} aria-busy={loading}>
    <div className={styles.control}>
      <AppSelect ref={select} icon={<FiCalendar />} aria-label={label} value={open ? "custom" : value.preset} disabled={disabled} onChange={event => choose(event.target.value as PeriodPreset | TransactionPeriodPreset)}>
        {transaction && <option value="all">Semua Waktu</option>}
        <option value="today">Hari Ini</option>
        {transaction ? <option value="last-seven-days">7 Hari Terakhir</option> : <option value="this-week">Minggu Ini</option>}
        <option value="this-month">Bulan Ini</option>
        {transaction && <option value="last-month">Bulan Lalu</option>}
        <option value="custom">{customLabel}</option>
      </AppSelect>
      {value.preset === "custom" && !open && <button className={styles.edit} type="button" disabled={disabled} aria-label={`Ubah rentang waktu ${label.toLowerCase()}`} title="Ubah rentang waktu" onClick={() => choose("custom")}><FiEdit2 aria-hidden="true" /></button>}
    </div>
    {open && <div ref={panel} id={id} popover="auto" role="dialog" aria-labelledby={`${id}-title`} className={styles.popover} data-period-popover onToggle={event => { if (event.newState === "closed") setOpen(false); }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); } }}>
      <form className={styles.form} noValidate onSubmit={event => {
        event.preventDefault();
        if (validation || disabled) return;
        setOpen(false);
        onChange({ preset: "custom", ...draft });
      }}>
        <h3 id={`${id}-title`}>{transaction ? "Rentang Tanggal" : "Rentang Waktu"}</h3>
        <label htmlFor={`${id}-from`}>Dari Tanggal</label>
        <input id={`${id}-from`} type="date" required max={maxDate} value={draft.from} aria-invalid={Boolean(validation)} aria-describedby={validation ? `${id}-error` : undefined} onChange={event => setDraft(current => ({ ...current, from: event.target.value }))} />
        <label htmlFor={`${id}-to`}>Sampai Tanggal</label>
        <input id={`${id}-to`} type="date" required max={maxDate} value={draft.to} aria-invalid={Boolean(validation)} aria-describedby={validation ? `${id}-error` : undefined} onChange={event => setDraft(current => ({ ...current, to: event.target.value }))} />
        {validation && <p className={styles.error} id={`${id}-error`} role="alert">{validation}</p>}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
          <Button type="submit" disabled={Boolean(validation) || disabled}>Terapkan</Button>
        </div>
        <button className={styles.defaultAction} data-button="ghost" data-button-size="sm" type="button" disabled={disabled} onClick={() => choose(transaction ? "all" : "this-month")}>{transaction ? "Kembali ke Semua Waktu" : "Kembali ke Bulan Ini"}</button>
      </form>
    </div>}
  </div>;
}
