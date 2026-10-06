"use client";
import { useEffect, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import styles from "@/catalog/Catalog.module.css";
export default function SearchField({
  initialValue,
  onSearch,
  placeholder = "Cari judul, penulis, subjek, ISBN, atau kode buku",
  label = "Cari koleksi",
  delayMs = 350,
}: {
  initialValue: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  label?: string;
  delayMs?: number;
}) {
  const [value, setValue] = useState(initialValue);
  const [previous, setPrevious] = useState(initialValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (previous !== initialValue) {
    setPrevious(initialValue);
    setValue(initialValue);
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [initialValue],
  );
  return (
    <label className={styles.searchInput}>
      <span className={styles.srOnly}>{label}</span>
      <FiSearch aria-hidden="true" />
      <input
        value={value}
        maxLength={191}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          if (timer.current) clearTimeout(timer.current);
          if (delayMs === 0) onSearch(next);
          else timer.current = setTimeout(() => onSearch(next), delayMs);
        }}
      />
    </label>
  );
}
