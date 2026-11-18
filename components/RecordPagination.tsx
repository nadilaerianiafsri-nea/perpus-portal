"use client";

import AppSelect from "@/components/AppSelect";
import styles from "./RecordPagination.module.css";

export type RecordPageSize = 10 | 50 | 100;
const sizes: RecordPageSize[] = [10, 50, 100];

export function isRecordPageSize(value: number): value is RecordPageSize {
  return sizes.includes(value as RecordPageSize);
}

type Props = {
  page: number;
  pageSize: RecordPageSize;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: RecordPageSize) => void;
  disabled?: boolean;
  label?: string;
};

export default function RecordPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  label = "Navigasi halaman daftar",
}: Props) {
  const maxPage = Math.max(1, totalPages);
  const activePage = Math.max(1, Math.min(page, maxPage));
  const count = Math.max(0, total);
  const beginning = count ? (activePage - 1) * pageSize + 1 : 0;
  const ending = Math.min(count, activePage * pageSize);

  return (
    <div className={styles.wrapper}>
      <div className={styles.options}>
        <span>Baris per halaman</span>
        <AppSelect
          aria-label="Jumlah baris per halaman"
          value={String(pageSize)}
          size="sm"
          disabled={disabled}
          onChange={(event) => {
            const selected = Number(event.target.value);
            if (isRecordPageSize(selected)) onPageSizeChange(selected);
          }}
        >
          {sizes.map((n) => <option key={n} value={n}>{n} baris</option>)}
        </AppSelect>
        <span className={styles.count}>Menampilkan {beginning}–{ending} dari {count}</span>
      </div>

      <nav className={styles.nav} aria-label={label}>
        <button
          type="button"
          className={styles.step}
          disabled={disabled || activePage <= 1}
          onClick={() => onPageChange(activePage - 1)}
        >
          Previous
        </button>
        {activePage > 1 && (
          <button
            type="button"
            className={styles.near}
            disabled={disabled}
            onClick={() => onPageChange(activePage - 1)}
            aria-label={"Halaman " + (activePage - 1)}
          >{activePage - 1}</button>
        )}
        <span className={styles.current} aria-current="page" aria-label={"Halaman " + activePage}>
          {activePage}
        </span>
        {activePage < maxPage && (
          <button
            type="button"
            className={styles.near}
            disabled={disabled}
            onClick={() => onPageChange(activePage + 1)}
            aria-label={"Halaman " + (activePage + 1)}
          >{activePage + 1}</button>
        )}
        <button
          type="button"
          className={styles.step}
          disabled={disabled || activePage >= maxPage}
          onClick={() => onPageChange(activePage + 1)}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
