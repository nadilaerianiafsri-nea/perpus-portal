"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { FiChevronDown } from "react-icons/fi";

import { registerSubjectIfNew } from "./subjectCategories";
import enhancements from "./AdminBooksEnhancements.module.css";

type SubjectCategorySelectProps = {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  onCategoryAdded?: (name: string) => void;
  ariaLabel?: string;
};

export default function SubjectCategorySelect({
  value,
  options,
  onChange,
  onCategoryAdded,
  ariaLabel = "Subjek / Kategori",
}: SubjectCategorySelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);
  const customRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("id-ID");
    return normalized
      ? options.filter((option) => option.toLocaleLowerCase("id-ID").includes(normalized))
      : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [open]);

  useEffect(() => {
    if (!modalOpen) return;
    customRef.current?.focus();
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        event.preventDefault();
        setModalOpen(false);
        setModalError("");
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [modalOpen, saving]);

  function closeDropdown() {
    setOpen(false);
    setQuery("");
  }

  function selectOption(subject: string) {
    onChange(subject);
    closeDropdown();
    triggerRef.current?.focus();
  }

  function openDialog() {
    closeDropdown();
    setCustomName("");
    setModalError("");
    setModalOpen(true);
  }

  function backToList() {
    if (saving) return;
    setModalOpen(false);
    setModalError("");
    setOpen(true);
  }

  async function submitCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setModalError("");
    try {
      // Persist immediately, independently of saving the book form.
      const savedName = await registerSubjectIfNew(customName, options);
      onCategoryAdded?.(savedName);
      onChange(savedName);
      setModalOpen(false);
      setCustomName("");
      setQuery("");
      triggerRef.current?.focus();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Kategori gagal ditambahkan.");
    } finally {
      setSaving(false);
    }
  }

  function trapTab(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Tab") return;
    const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
      "input:not(:disabled), button:not(:disabled)",
    ) ?? [])];
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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
        aria-controls={id + "-options"}
        aria-haspopup="listbox"
        aria-required="true"
        onClick={() => open ? closeDropdown() : setOpen(true)}
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
        <span data-placeholder={!value}>{value || "Pilih Subjek / Kategori"}</span>
        <FiChevronDown className={enhancements.subjectSearchChevron} data-open={open} aria-hidden="true" />
      </button>

      {open && (
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
          <div id={id + "-options"} className={enhancements.subjectOptionList} role="listbox" aria-label={ariaLabel}>
            {filteredOptions.length ? filteredOptions.map((subject) => (
              <button
                key={subject}
                type="button"
                role="option"
                aria-selected={subject === value}
                className={enhancements.subjectOption}
                onClick={() => selectOption(subject)}
              >
                {subject}
              </button>
            )) : <p className={enhancements.subjectEmpty}>Subjek / kategori tidak ditemukan.</p>}
          </div>
          <button
            type="button"
            className={[enhancements.subjectOption, enhancements.subjectOtherOption].join(" ")}
            onClick={openDialog}
          >
            Lainnya
          </button>
        </div>
      )}

      {modalOpen && typeof document !== "undefined" && createPortal(
        <div className={enhancements.subjectModalBackdrop}>
          <form
            ref={dialogRef}
            className={enhancements.subjectModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id + "-modal-title"}
            aria-describedby={id + "-modal-description"}
            onSubmit={(event) => void submitCustom(event)}
            onKeyDown={trapTab}
          >
            <h2 id={id + "-modal-title"}>Tambah Subjek / Kategori</h2>
            <p id={id + "-modal-description"}>
              Kategori baru langsung tersedia untuk buku fisik, e-book, dan Pengaturan.
            </p>
            <label htmlFor={id + "-new-subject"}>Nama subjek / kategori</label>
            <input
              ref={customRef}
              id={id + "-new-subject"}
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="Masukkan nama kategori"
              maxLength={100}
              minLength={2}
              autoComplete="off"
              required
              disabled={saving}
            />
            {modalError && <p className={enhancements.subjectModalError} role="alert">{modalError}</p>}
            <div className={enhancements.subjectModalActions}>
              <button type="submit" data-button="primary" disabled={saving}>
                {saving ? "Menambahkan..." : "Tambahkan Subject/Kategori"}
              </button>
              <button type="button" data-button="secondary" disabled={saving} onClick={backToList}>
                Kembali
              </button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </div>
  );
}
