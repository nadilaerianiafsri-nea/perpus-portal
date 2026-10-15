"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiGrid, FiList, FiSearch, FiSliders, FiX } from "react-icons/fi";
import BookCard from "./BookCard";
import SearchInput from "@/components/SearchField";
import Filters from "./Filters";
import {
  type CatalogResponse,
  type FilterOptions,
  availabilityLabels,
  typeLabels,
} from "./types";
import styles from "./Catalog.module.css";
import memberStyles from "./MemberCatalogEnhancements.module.css";

const sorts = [
  ["relevance", "Relevansi"],
  ["newest", "Terbaru"],
  ["titleAsc", "Judul A-Z"],
  ["titleDesc", "Judul Z-A"],
  ["yearDesc", "Tahun Terbaru"],
  ["yearAsc", "Tahun Terlama"],
];

const emptyOptions: FilterOptions = { subjects: [], languages: [], years: [] };

export default function Catalog({
  ebook = false,
  member = false,
}: {
  ebook?: boolean;
  member?: boolean;
}) {
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
  const apiBase = member
    ? "/api/members/me/catalog"
    : `/api/${ebook ? "ebooks" : "collections"}`;
  const filterBase = member ? "/api/members/me/catalog/filters" : "/api/collections/filters";
  const filterQuery = ebook ? "?type=EBOOK" : "";
  const detailBasePath = member ? "/dashboard/koleksi" : "/koleksi";
  const key = `${member}:${ebook}:${queryString}:${retry}`;
  const loading = result?.key !== key;
  const response = !loading ? result?.data : undefined;
  const error = !loading ? result?.error : undefined;
  const view = query.get("view") === "list" ? "list" : "grid";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${filterBase}${filterQuery}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        setOptions(data);
        setFiltersError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFiltersError(true);
      });
    return () => controller.abort();
  }, [filterBase, filterQuery, retry]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}${queryString ? `?${queryString}` : ""}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json();
          throw new Error(
            response.status === 400 && typeof body.message === "string"
              ? body.message
              : "Data koleksi belum dapat dimuat. Silakan coba lagi.",
          );
        }
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setResult({
            key,
            error:
              reason instanceof Error && reason.message !== "signal timed out"
                ? reason.message
                : "Data koleksi belum dapat dimuat. Silakan coba lagi.",
          });
        }
      });
    return () => controller.abort();
  }, [apiBase, queryString, key]);

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
    setSearchRevision((value) => value + 1);
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
              ? (availabilityLabels[value as keyof typeof availabilityLabels] ?? value)
              : value,
      })),
  );

  for (const name of ["yearFrom", "yearTo"]) {
    if (query.get(name)) {
      chips.push({
        name,
        value: query.get(name)!,
        label: `${name === "yearFrom" ? "Dari" : "Sampai"} ${query.get(name)}`,
      });
    }
  }

  const currentPage = response?.meta.page ?? Number(query.get("page") || 1);
  const totalPages = response?.meta.totalPages ?? 0;
  const pageStart = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => pageStart + index,
  );

  const content = (
    <>
      {!member ? (
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Beranda</Link>
          <span>/</span>
          <span>{ebook ? "E-Book" : "Koleksi"}</span>
        </nav>
      ) : null}

      <h1>{ebook ? "Katalog E-Book" : "Katalog Koleksi"}</h1>

      <div className={`${styles.searchRow} ${member ? memberStyles.memberSearchRow : ""}`}>
        <SearchInput
          key={searchRevision}
          initialValue={query.get("search") ?? ""}
          onSearch={(value) => update({ search: value.trim() || null })}
        />
        {!member ? (
          <label>
            <span className={styles.srOnly}>Kategori pencarian</span>
            <select
              className={memberStyles.catalogDropdown}
              aria-label="Kategori pencarian"
              value={
                (query.get("subject") ?? "").includes(",")
                  ? ""
                  : (query.get("subject") ?? "")
              }
              onChange={(event) => update({ subject: event.target.value || null })}
            >
              <option value="">Semua</option>
              {options.subjects.map((subject) => (
                <option key={subject}>{subject}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className={member ? memberStyles.memberCatalogLayout : styles.catalogLayout}>
        {!member ? (
          <aside className={styles.sidebar}>
            <Filters {...filterProps} />
            {filtersError ? (
              <p className={styles.inlineError}>Filter belum dapat dimuat.</p>
            ) : null}
          </aside>
        ) : null}

        <section className={styles.results} aria-label="Hasil pencarian" aria-busy={loading}>
          <div className={styles.toolbar}>
            {member ? (
              <button
                type="button"
                className={memberStyles.memberFilterButton}
                aria-label="Buka filter koleksi"
                title="Filter koleksi"
                onClick={() => dialog.current?.showModal()}
              >
                <FiSliders aria-hidden="true" />
              </button>
            ) : (
              <button
                className={styles.mobileFilter}
                onClick={() => dialog.current?.showModal()}
              >
                <FiSliders /> Filter
              </button>
            )}
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
                <select
                  className={memberStyles.catalogDropdown}
                  aria-label="Jumlah koleksi per halaman"
                  value={query.get("limit") ?? (ebook ? "8" : "20")}
                  onChange={(event) => update({ limit: event.target.value })}
                >
                  {[
                    ...new Set([
                      8,
                      12,
                      20,
                      ...(query.get("limit") ? [Number(query.get("limit"))] : []),
                    ]),
                  ].map((limit) => (
                    <option key={limit} value={limit}>
                      {limit} / halaman
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className={styles.srOnly}>Urutkan koleksi</span>
                <select
                  className={memberStyles.catalogDropdown}
                  value={query.get("sort") ?? "relevance"}
                  onChange={(event) => update({ sort: event.target.value })}
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

          {ebook || chips.length > 0 ? (
            <div className={styles.chips}>
              {ebook ? (
                <Link
                  href={member ? "/dashboard/koleksi" : "/koleksi"}
                  aria-label="Hapus pembatas E-Book, buka semua koleksi"
                >
                  E-Book <FiX />
                </Link>
              ) : null}

              {chips.map((chip) => (
                <button
                  key={`${chip.name}:${chip.value}`}
                  onClick={() =>
                    update({
                      [chip.name]: ["yearFrom", "yearTo"].includes(chip.name)
                        ? null
                        : (query.get(chip.name) ?? "")
                            .split(",")
                            .filter((value) => value !== chip.value)
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
          ) : null}

          {loading ? (
            <div className={styles.grid} aria-label="Memuat koleksi">
              {Array.from({ length: ebook ? 8 : 12 }, (_, index) => (
                <div className={styles.skeleton} key={index}>
                  <div />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className={styles.state} role="alert">
              <h2>Data koleksi belum dapat dimuat. Silakan coba lagi.</h2>
              {error === "Rentang tahun tidak valid." ? <p>{error}</p> : null}
              <button onClick={() => setRetry((value) => value + 1)}>Coba Lagi</button>
              <button onClick={clear}>Bersihkan Filter</button>
            </div>
          ) : response?.data.length ? (
            <>
              <div className={view === "grid" ? styles.grid : styles.list}>
                {response.data.map((book) => (
                  <BookCard key={book.id} book={book} basePath={detailBasePath} />
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
              {totalPages > 0 ? (
                <button onClick={() => update({ page: "1" })}>
                  Kembali ke Halaman Pertama
                </button>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <dialog
        ref={dialog}
        className={`${styles.filterDialog} ${member ? memberStyles.memberFilterDialog : ""}`}
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
        {filtersError ? <p>Filter belum dapat dimuat.</p> : null}
        <button className={styles.primaryButton} onClick={() => dialog.current?.close()}>
          Lihat Hasil
        </button>
      </dialog>
    </>
  );

  return member ? (
    <div className={styles.main}>{content}</div>
  ) : (
    <main className={styles.main}>{content}</main>
  );
}
