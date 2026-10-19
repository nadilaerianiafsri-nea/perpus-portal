"use client";

import { useState, type ReactNode } from "react";
import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";
import { type FilterOptions, availabilityLabels, typeLabels } from "./types";
import {
  filterChoices,
  filterChoiceKey,
  filterValidationError,
} from "./filterOptions";
import styles from "./Catalog.module.css";
import enhancements from "./MemberCatalogEnhancements.module.css";

function ChoiceList({
  scroll,
  children,
}: {
  scroll: boolean;
  children: ReactNode;
}) {
  return scroll ? (
    <div className={enhancements.categoryOptions}>{children}</div>
  ) : (
    <>{children}</>
  );
}

type Props = {
  query: URLSearchParams;
  options: FilterOptions;
  ebook: boolean;
  update: (values: Record<string, string | null>) => void;
  clear: () => void;
  member?: boolean;
};

export default function Filters({
  query,
  options,
  ebook,
  update,
  clear,
  member = false,
}: Props) {
  const [categorySearch, setCategorySearch] = useState("");
  const [allCategories, setAllCategories] = useState(false);
  const categoryChoices = member ? filterChoices(options.subjects) : [];
  const error = member ? filterValidationError(query) : null;
  function group(
    title: string,
    key: string,
    choices: { value: string; label: string; values?: string[] }[],
  ) {
    const selected = (query.get(key) ?? "").split(",");
    const shown =
      member && key === "subject"
        ? categorySearch.trim()
          ? choices.filter((item) =>
              filterChoiceKey(item.label).includes(
                filterChoiceKey(categorySearch),
              ),
            )
          : allCategories
            ? choices
            : choices.slice(0, 6)
        : choices;
    return (
      <fieldset
        className={member ? enhancements.filterSection : styles.filterGroup}
      >
        <legend>{title}</legend>
        {member && key === "subject" && choices.length > 8 ? (
          <label className={enhancements.categorySearch}>
            <span className={styles.srOnly}>Cari kategori</span>
            <FiSearch aria-hidden />
            <input
              placeholder="Cari kategori"
              value={categorySearch}
              maxLength={191}
              onChange={(event) => setCategorySearch(event.target.value)}
            />
          </label>
        ) : null}
        <ChoiceList scroll={member && key === "subject"}>
          {shown.map(({ value, label, values = [value] }) => (
            <label
              key={value}
              className={member ? enhancements.optionRow : undefined}
            >
              <input
                type="checkbox"
                value={value}
                checked={
                  member
                    ? selected.some((item) =>
                        values.some(
                          (alias) =>
                            filterChoiceKey(alias) === filterChoiceKey(item),
                        ),
                      )
                    : selected.includes(value)
                }
                onChange={(e) =>
                  update({
                    [key]:
                      (e.target.checked
                        ? [...new Set([...selected.filter(Boolean), ...values])]
                        : selected.filter(
                            (v) =>
                              !values.some((alias) =>
                                member
                                  ? filterChoiceKey(v) ===
                                    filterChoiceKey(alias)
                                  : v === alias,
                              ),
                          )
                      ).join(",") || null,
                  })
                }
              />
              {member ? (
                <span className={enhancements.checkboxMark} aria-hidden>
                  <FiCheck />
                </span>
              ) : null}
              <span>{label}</span>
            </label>
          ))}
        </ChoiceList>
        {member && key === "subject" && shown.length === 0 ? (
          <p className={enhancements.filterHint}>Kategori tidak ditemukan.</p>
        ) : null}
        {member &&
        key === "subject" &&
        !categorySearch.trim() &&
        choices.length > 6 ? (
          <button
            type="button"
            className={enhancements.showCategories}
            aria-expanded={allCategories}
            onClick={() => setAllCategories((value) => !value)}
          >
            {allCategories
              ? "Tampilkan lebih sedikit"
              : `Lihat semua kategori (${choices.length})`}
          </button>
        ) : null}
      </fieldset>
    );
  }

  return (
    <div className={styles.filters}>
      {!member ? (
        <div className={styles.filterHeading}>
          <h2>Filter</h2>
          <button onClick={clear}>Bersihkan</button>
        </div>
      ) : null}
      {!ebook &&
        group(
          "Jenis Koleksi",
          "type",
          Object.entries(typeLabels).map(([value, label]) => ({
            value,
            label,
          })),
        )}
      {!ebook &&
        group(
          "Ketersediaan",
          "availability",
          Object.entries(availabilityLabels).map(([value, label]) => ({
            value,
            label,
          })),
        )}
      {group(
        "Subjek / Kategori",
        "subject",
        member
          ? categoryChoices
          : options.subjects.map((value) => ({ value, label: value })),
      )}
      {group(
        "Bahasa",
        "language",
        member
          ? filterChoices(options.languages)
          : options.languages.map((value) => ({ value, label: value })),
      )}
      <fieldset
        className={member ? enhancements.filterSection : styles.filterGroup}
      >
        <legend>Tahun Terbit</legend>
        <div className={member ? enhancements.yearFields : styles.yearRange}>
          <label>
            <span className={member ? enhancements.yearLabel : styles.srOnly}>
              {member ? "Dari tahun" : "Tahun terbit dari"}
            </span>
            <span className={member ? enhancements.yearControl : undefined}>
              <select
                className={
                  member
                    ? enhancements.yearSelect
                    : enhancements.catalogDropdown
                }
                aria-label="Tahun terbit dari"
                aria-invalid={!!error}
                aria-describedby={error ? "member-filter-error" : undefined}
                value={query.get("yearFrom") ?? ""}
                onChange={(e) => update({ yearFrom: e.target.value || null })}
              >
                <option value="">{member ? "Semua tahun" : "Dari"}</option>
                {options.years.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
              {member ? <FiChevronDown aria-hidden /> : null}
            </span>
          </label>
          {!member ? <span>–</span> : null}
          <label>
            <span className={member ? enhancements.yearLabel : styles.srOnly}>
              {member ? "Sampai tahun" : "Tahun terbit sampai"}
            </span>
            <span className={member ? enhancements.yearControl : undefined}>
              <select
                className={
                  member
                    ? enhancements.yearSelect
                    : enhancements.catalogDropdown
                }
                aria-label="Tahun terbit sampai"
                aria-invalid={!!error}
                aria-describedby={error ? "member-filter-error" : undefined}
                value={query.get("yearTo") ?? ""}
                onChange={(e) => update({ yearTo: e.target.value || null })}
              >
                <option value="">{member ? "Semua tahun" : "Sampai"}</option>
                {options.years.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
              {member ? <FiChevronDown aria-hidden /> : null}
            </span>
          </label>
        </div>
      </fieldset>
      {error ? (
        <p
          id="member-filter-error"
          className={enhancements.filterError}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
