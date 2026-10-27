"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

import enhancements from "./AdminBooksEnhancements.module.css";

type SubjectCategorySelectProps = {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  ariaLabel?: string;
};

export default function SubjectCategorySelect({
  value,
  options,
  onChange,
  ariaLabel = "Subjek / Kategori",
}: SubjectCategorySelectProps) {
  const generatedId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      option.toLocaleLowerCase("id-ID").includes(normalizedQuery),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    searchRef.current?.focus();

    const closeFromOutside = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setQuery("");
    };

    document.addEventListener("pointerdown", closeFromOutside, true);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside, true);
    };
  }, [open]);

  function closeDropdown() {
    setOpen(false);
    setQuery("");
  }

  function chooseSubject(subject: string) {
    onChange(subject);
    closeDropdown();
    triggerRef.current?.focus();
  }

  return (
    <div ref={rootRef} className={enhancements.subjectSearchSelect}>
      <button
        ref={triggerRef}
        type="button"
        className={enhancements.subjectSearchTrigger}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={`${generatedId}-options`}
        aria-haspopup="listbox"
        aria-required="true"
        onClick={() => {
          if (open) {
            closeDropdown();
          } else {
            setOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            closeDropdown();
          }

          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span data-placeholder={!value}>
          {value || "Pilih Subjek / Kategori"}
        </span>
        <FiChevronDown
          className={enhancements.subjectSearchChevron}
          data-open={open}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className={enhancements.subjectSearchPanel}>
          <input
            ref={searchRef}
            type="search"
            className={enhancements.subjectSearchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeDropdown();
                triggerRef.current?.focus();
              }
            }}
            placeholder="Cari subjek / kategori..."
            aria-label="Cari subjek atau kategori"
            autoComplete="off"
          />

          <div
            id={`${generatedId}-options`}
            className={enhancements.subjectOptionList}
            role="listbox"
            aria-label={ariaLabel}
          >
            {filteredOptions.length ? (
              filteredOptions.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  role="option"
                  aria-selected={subject === value}
                  className={enhancements.subjectOption}
                  onClick={() => chooseSubject(subject)}
                >
                  {subject}
                </button>
              ))
            ) : (
              <p className={enhancements.subjectEmpty}>
                Subjek / kategori tidak ditemukan.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
