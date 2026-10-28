"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiCalendar, FiEdit2 } from "react-icons/fi";

import AppSelect from "@/components/AppSelect";
import { Button } from "@/components/Button";
import periodStyles from "@/components/PeriodSelector.module.css";
import fixes from "./AdminCollectionFixes.module.css";

export type EBookYearPreset =
  | "all"
  | "this-year"
  | "last-3-years"
  | "last-5-years"
  | "last-10-years"
  | "custom";

export type EBookYearValue = {
  preset: EBookYearPreset;
  from: string;
  to: string;
};

function jakartaYear() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
  );
}

export function createEBookYearRange(
  preset: Exclude<EBookYearPreset, "custom">,
): EBookYearValue {
  const year = jakartaYear();

  if (preset === "all") return { preset, from: "", to: "" };
  if (preset === "this-year") {
    return { preset, from: String(year), to: String(year) };
  }

  const span =
    preset === "last-3-years"
      ? 3
      : preset === "last-5-years"
        ? 5
        : 10;

  return {
    preset,
    from: String(year - span + 1),
    to: String(year),
  };
}

function normalizeYear(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function validateYearRange(from: string, to: string) {
  if (!/^\d{4}$/.test(from) || !/^\d{4}$/.test(to)) {
    return "Dari Tahun dan Sampai Tahun wajib terdiri dari 4 angka.";
  }

  const start = Number(from);
  const end = Number(to);

  if (start < 1000 || start > 9999 || end < 1000 || end > 9999) {
    return "Rentang tahun tidak valid.";
  }

  if (start > end) {
    return "Dari Tahun tidak boleh lebih besar dari Sampai Tahun.";
  }

  return "";
}

export default function EBookYearFilter({
  value,
  onChange,
  disabled = false,
}: {
  value: EBookYearValue;
  onChange: (value: EBookYearValue) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const select = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from: value.from, to: value.to });
  const validation = validateYearRange(draft.from, draft.to);

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
      element.style.left = `${
        mobile
          ? (window.innerWidth - width) / 2
          : Math.max(
              16,
              Math.min(anchor.right - width, window.innerWidth - width - 16),
            )
      }px`;
      element.style.top = `${
        mobile
          ? Math.max(16, window.innerHeight - height - 16)
          : Math.max(
              16,
              Math.min(anchor.bottom + 10, window.innerHeight - height - 16),
            )
      }px`;
    }

    element.showPopover();
    position();
    const observer = new ResizeObserver(position);
    observer.observe(element);
    element.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);

    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      observer.disconnect();
      const restore =
        element.contains(document.activeElement) ||
        document.activeElement === document.body;
      if (element.matches(":popover-open")) element.hidePopover();
      if (restore) trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  function choose(preset: EBookYearPreset) {
    if (preset === "custom") {
      setDraft({
        from: value.from || String(jakartaYear()),
        to: value.to || String(jakartaYear()),
      });
      setOpen(true);
      return;
    }

    setOpen(false);
    onChange(createEBookYearRange(preset));
  }

  return (
    <div className={`${periodStyles.root} ${fixes.ebookFilterField}`} data-period-selector>
      <div className={periodStyles.control}>
        <AppSelect
          ref={select}
          icon={<FiCalendar />}
          aria-label="Filter tahun terbit E-Book"
          value={open ? "custom" : value.preset}
          disabled={disabled}
          onChange={(event) => choose(event.target.value as EBookYearPreset)}
        >
          <option value="all">Semua Tahun</option>
          <option value="this-year">Tahun Ini</option>
          <option value="last-3-years">3 Tahun Terakhir</option>
          <option value="last-5-years">5 Tahun Terakhir</option>
          <option value="last-10-years">10 Tahun Terakhir</option>
          <option value="custom">Rentang Tahun</option>
        </AppSelect>

        {value.preset === "custom" && !open ? (
          <button
            className={periodStyles.edit}
            type="button"
            disabled={disabled}
            aria-label="Ubah rentang tahun terbit"
            title="Ubah rentang tahun"
            onClick={() => choose("custom")}
          >
            <FiEdit2 aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          ref={panel}
          id={id}
          popover="auto"
          role="dialog"
          aria-labelledby={`${id}-title`}
          className={`${periodStyles.popover} ${fixes.yearPopover}`}
          onToggle={(event) => {
            if (event.newState === "closed") setOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            }
          }}
        >
          <form
            className={periodStyles.form}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (validation || disabled) return;
              setOpen(false);
              onChange({ preset: "custom", ...draft });
            }}
          >
            <h3 id={`${id}-title`}>Rentang Tahun</h3>

            <label htmlFor={`${id}-from`}>Dari Tahun</label>
            <input
              id={`${id}-from`}
              className={fixes.yearInput}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              required
              value={draft.from}
              aria-invalid={Boolean(validation)}
              aria-describedby={validation ? `${id}-error` : undefined}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  from: normalizeYear(event.target.value),
                }))
              }
            />

            <label htmlFor={`${id}-to`}>Sampai Tahun</label>
            <input
              id={`${id}-to`}
              className={fixes.yearInput}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              required
              value={draft.to}
              aria-invalid={Boolean(validation)}
              aria-describedby={validation ? `${id}-error` : undefined}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  to: normalizeYear(event.target.value),
                }))
              }
            />

            {validation ? (
              <p className={periodStyles.error} id={`${id}-error`} role="alert">
                {validation}
              </p>
            ) : null}

            <div className={periodStyles.actions}>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={Boolean(validation) || disabled}>
                Terapkan
              </Button>
            </div>

            <button
              className={periodStyles.defaultAction}
              data-button="ghost"
              data-button-size="sm"
              type="button"
              disabled={disabled}
              onClick={() => choose("all")}
            >
              Kembali ke Semua Tahun
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
