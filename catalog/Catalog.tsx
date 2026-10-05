"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiGrid, FiList, FiSearch, FiSliders, FiX } from "react-icons/fi";
import BookCard from "./BookCard";
import Filters from "./Filters";
import {
  type CatalogResponse,
  type FilterOptions,
  availabilityLabels,
  typeLabels,
} from "./types";
import styles from "./Catalog.module.css";

function SearchInput({
  initialValue,
  onSearch,
}: {
  initialValue: string;
  onSearch: (value: string) => void;
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
      <span className={styles.srOnly}>Cari koleksi</span>
      <FiSearch aria-hidden="true" />
      <input
        value={value}
        maxLength={191}
        placeholder="Cari judul, penulis, subjek, ISBN, atau kode buku"
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => onSearch(next), 350);
        }}
      />
    </label>
  );
}
const sorts = [
  ["relevance", "Relevansi"],
  ["newest", "Terbaru"],
  ["titleAsc", "Judul A-Z"],
  ["titleDesc", "Judul Z-A"],
  ["yearDesc", "Tahun Terbaru"],
  ["yearAsc", "Tahun Terlama"],
];
const emptyOptions: FilterOptions = { subjects: [], languages: [], years: [] };
export default function Catalog({ ebook = false }: { ebook?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = new URLSearchParams(params.toString());
  const [options, setOptions] = useState<FilterOptions>(emptyOptions);
  const [filtersError, setFiltersError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [searchRevision, setSearchRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: CatalogResponse;
    error?: string;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const apiQuery = new URLSearchParams(query);
  apiQuery.delete("view");
  if (ebook) {
    apiQuery.delete("type");
    apiQuery.delete("availability");
  }
  const queryString = apiQuery.toString();
  const key = `${ebook}:${queryString}:${retry}`;
  const loading = result?.key !== key;
  const response = !loading ? result?.data : undefined;
  const error = !loading ? result?.error : undefined;
  const view = query.get("view") === "list" ? "list" : "grid";
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/collections/filters", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setOptions(data);
        setFiltersError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFiltersError(true);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/${ebook ? "ebooks" : "collections"}?${queryString}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json();
          throw new Error(
            r.status === 400 && typeof body.message === "string"
              ? body.message
              : "Data koleksi belum dapat dimuat. Silakan coba lagi.",
          );
        }
        return r.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              reason instanceof Error && reason.message !== "signal timed out"
                ? reason.message
                : "Data koleksi belum dapat dimuat. Silakan coba lagi.",
          });
      });
    return () => controller.abort();
  }, [ebook, queryString, key]);
  function update(updates: Record<string, string | null>) {
    const next = new URLSearchParams(window.location.search);
    for (const [name, value] of Object.entries(updates)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    if (!("page" in updates) && !("view" in updates)) next.delete("page");
    router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  function clear() {
    setSearchRevision(value => value + 1);
    router.push(pathname, { scroll: false });
  }
  const filterProps = { query, options, ebook, update, clear };
  const chips = (
    ebook
      ? ["subject", "language"]
      : ["type", "availability", "subject", "language"]
  ).flatMap((name) =>
    (query.get(name) ?? "")
      .split(",")
      .filter(Boolean)
      .map((value) => ({
        name,
        value,
        label:
          name === "type"
            ? (typeLabels[value as keyof typeof typeLabels] ?? value)
            : name === "availability"
              ? (availabilityLabels[value as keyof typeof availabilityLabels] ??
                value)
              : value,
      })),
  );
  for (const name of ["yearFrom", "yearTo"])
    if (query.get(name))
      chips.push({
        name,
        value: query.get(name)!,
        label: `${name === "yearFrom" ? "Dari" : "Sampai"} ${query.get(name)}`,
      });
  const currentPage = response?.meta.page ?? Number(query.get("page") || 1);
  const totalPages = response?.meta.totalPages ?? 0;
  const pageStart = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => pageStart + i,
  );
  return (
    <main className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <span>{ebook ? "E-Book" : "Koleksi"}</span>
      </nav>
      <h1>{ebook ? "Katalog E-Book" : "Katalog Koleksi"}</h1>
      <div className={styles.searchRow}>
        <SearchInput
          key={searchRevision}
          initialValue={query.get("search") ?? ""}
          onSearch={(value) => update({ search: value.trim() || null })}
        />
        <label>
          <span className={styles.srOnly}>Kategori pencarian</span>
          <select
            aria-label="Kategori pencarian"
            value={
              (query.get("subject") ?? "").includes(",")
                ? ""
                : (query.get("subject") ?? "")
            }
            onChange={(e) => update({ subject: e.target.value || null })}
          >
            <option value="">Semua</option>
            {options.subjects.map((subject) => (
              <option key={subject}>{subject}</option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.catalogLayout}>
        <aside className={styles.sidebar}>
          <Filters {...filterProps} />
          {filtersError && (
            <p className={styles.inlineError}>Filter belum dapat dimuat.</p>
          )}
        </aside>
        <section
          className={styles.results}
          aria-label="Hasil pencarian"
          aria-busy={loading}
        >
          <div className={styles.toolbar}>
            <button
              className={styles.mobileFilter}
              onClick={() => dialog.current?.showModal()}
            >
              <FiSliders /> Filter
            </button>
            <p aria-live="polite">
              {loading ? (
                "Memuat koleksi..."
              ) : response ? (
                <>
                  <strong>{response.meta.total}</strong> hasil ditemukan
                </>
              ) : (
                "Hasil pencarian"
              )}
            </p>
            <div className={styles.sortTools}>
              <label className={styles.pageSize}>
                <span className={styles.srOnly}>Jumlah koleksi per halaman</span>
                <select aria-label="Jumlah koleksi per halaman" value={query.get('limit') ?? (ebook ? '8' : '20')} onChange={e => update({ limit: e.target.value })}>
                  {[...new Set([8, 12, 20, ...(query.get('limit') ? [Number(query.get('limit'))] : [])])].map(limit => <option key={limit} value={limit}>{limit} / halaman</option>)}
                </select>
              </label>
              <label>
                <span className={styles.srOnly}>Urutkan koleksi</span>
                <select
                  value={query.get("sort") ?? "relevance"}
                  onChange={(e) => update({ sort: e.target.value })}
                >
                  {sorts.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.viewToggle}>
                <button
                  aria-label="Tampilan grid"
                  aria-pressed={view === "grid"}
                  onClick={() => update({ view: null })}
                >
                  <FiGrid />
                </button>
                <button
                  aria-label="Tampilan list"
                  aria-pressed={view === "list"}
                  onClick={() => update({ view: "list" })}
                >
                  <FiList />
                </button>
              </div>
            </div>
          </div>
          {(ebook || chips.length > 0) && (
            <div className={styles.chips}>
              {ebook && (
                <Link
                  href="/koleksi"
                  aria-label="Hapus pembatas E-Book, buka semua koleksi"
                >
                  E-Book <FiX />
                </Link>
              )}
              {chips.map((chip) => (
                <button
                  key={`${chip.name}:${chip.value}`}
                  onClick={() =>
                    update({
                      [chip.name]: ["yearFrom", "yearTo"].includes(chip.name)
                        ? null
                        : (query.get(chip.name) ?? "")
                            .split(",")
                            .filter((v) => v !== chip.value)
                            .join(",") || null,
                    })
                  }
                >
                  {chip.label}
                  <FiX />
                </button>
              ))}
              <button className={styles.clearChips} onClick={clear}>
                <FiX /> Hapus semua
              </button>
            </div>
          )}
          {loading ? (
            <div className={styles.grid} aria-label="Memuat koleksi">
              {Array.from({ length: ebook ? 8 : 12 }, (_, i) => (
                <div className={styles.skeleton} key={i}>
                  <div />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className={styles.state} role="alert">
              <h2>Data koleksi belum dapat dimuat. Silakan coba lagi.</h2>
              {error === "Rentang tahun tidak valid." && <p>{error}</p>}
              <button onClick={() => setRetry((v) => v + 1)}>Coba Lagi</button>
              <button onClick={clear}>Bersihkan Filter</button>
            </div>
          ) : response?.data.length ? (
            <>
              <div className={view === "grid" ? styles.grid : styles.list}>
                {response.data.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
              <nav className={styles.pagination} aria-label="Halaman katalog">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => update({ page: String(currentPage - 1) })}
                >
                  Sebelumnya
                </button>
                {pages.map((page) => (
                  <button
                    key={page}
                    aria-current={page === currentPage ? "page" : undefined}
                    onClick={() => update({ page: String(page) })}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => update({ page: String(currentPage + 1) })}
                >
                  Berikutnya
                </button>
              </nav>
            </>
          ) : (
            <div className={styles.state}>
              <FiSearch />
              <h2>Tidak ada koleksi yang sesuai.</h2>
              <p>Coba kata kunci lain atau hapus filter yang dipilih.</p>
              <button onClick={clear}>Bersihkan Filter</button>
              {totalPages > 0 && (
                <button onClick={() => update({ page: "1" })}>
                  Kembali ke Halaman Pertama
                </button>
              )}
            </div>
          )}
        </section>
      </div>
      <dialog
        ref={dialog}
        className={styles.filterDialog}
        aria-label="Filter koleksi"
      >
        <button
          className={styles.closeDialog}
          aria-label="Tutup filter"
          onClick={() => dialog.current?.close()}
        >
          <FiX />
        </button>
        <Filters {...filterProps} />
        {filtersError && <p>Filter belum dapat dimuat.</p>}
        <button
          className={styles.primaryButton}
          onClick={() => dialog.current?.close()}
        >
          Lihat Hasil
        </button>
      </dialog>
    </main>
  );
}
