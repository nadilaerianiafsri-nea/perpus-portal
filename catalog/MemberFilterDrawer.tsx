"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { FiX } from "react-icons/fi";
import Filters from "./Filters";
import {
  catalogFilterKeys,
  filterUpdates,
  filterValidationError,
} from "./filterOptions";
import type { FilterOptions } from "./types";
import styles from "./MemberCatalogEnhancements.module.css";

export default function MemberFilterDrawer({
  query,
  options,
  ebook,
  unavailable,
  onApply,
  onClose,
  returnFocus,
}: {
  query: URLSearchParams;
  options: FilterOptions;
  ebook: boolean;
  unavailable: boolean;
  onApply: (updates: Record<string, string | null>) => void;
  onClose: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState(() => new URLSearchParams(query));
  const validationError = filterValidationError(draft);

  useEffect(() => {
    const element = dialog.current;
    const trigger = returnFocus.current;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0)
      document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    document.body.style.overflow = "hidden";
    element?.showModal();
    closeButton.current?.focus();
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      trigger?.focus();
    };
  }, [returnFocus]);

  function close() {
    dialog.current?.close();
    onClose();
  }
  function update(values: Record<string, string | null>) {
    setDraft((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(values)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    });
  }
  function clear() {
    update(Object.fromEntries(catalogFilterKeys.map((key) => [key, null])));
  }

  return (
    <dialog
      ref={dialog}
      id="member-catalog-filters"
      className={styles.drawer}
      aria-labelledby="catalog-filter-title"
      aria-describedby="catalog-filter-description"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          close();
      }}
    >
      <form
        className={styles.drawerForm}
        onSubmit={(event) => {
          event.preventDefault();
          if (validationError) return;
          onApply(filterUpdates(draft));
          close();
        }}
      >
        <header className={styles.drawerHeader}>
          <div>
            <h2 id="catalog-filter-title">Filter Koleksi</h2>
            <p id="catalog-filter-description">Sesuaikan hasil katalog</p>
          </div>
          <button
            ref={closeButton}
            type="button"
            className={styles.drawerClose}
            aria-label="Tutup filter"
            onClick={close}
          >
            <FiX aria-hidden />
          </button>
        </header>
        <div className={styles.drawerBody}>
          {unavailable ? (
            <p className={styles.filterError} role="alert">
              Pilihan filter belum dapat dimuat. Tutup panel dan coba muat ulang
              katalog.
            </p>
          ) : null}
          <Filters
            query={draft}
            options={options}
            ebook={ebook}
            member
            update={update}
            clear={clear}
          />
        </div>
        <footer className={styles.drawerFooter}>
          <button type="button" className={styles.resetFilters} onClick={clear}>
            Bersihkan
          </button>
          <button
            type="submit"
            className={styles.applyFilters}
            disabled={!!validationError}
            aria-describedby={
              validationError ? "member-filter-error" : undefined
            }
          >
            Terapkan Filter
          </button>
        </footer>
      </form>
    </dialog>
  );
}
