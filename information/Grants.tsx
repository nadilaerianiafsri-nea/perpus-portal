"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiGift, FiInfo } from "react-icons/fi";
import SearchField from "@/components/SearchField";
import GrantBadge from "./GrantBadge";
import { type GrantsResponse, grantStatusLabels } from "./grantTypes";
import common from "@/catalog/Catalog.module.css";
import styles from "./Information.module.css";
const errorMessage = "Data hibah belum dapat dimuat. Silakan coba lagi.";
const dateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default function Grants() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = params.toString();
  const [retry, setRetry] = useState(0);
  const [searchRevision, setSearchRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: GrantsResponse;
    error?: boolean;
  } | null>(null);
  const key = `${query}:${retry}`;
  const loading = result?.key !== key;
  const response = !loading ? result?.data : undefined;
  const error = !loading && result?.error;
  // Global summary and year options remain stable while another filtered page loads.
  const summary = result?.data?.summary;
  const years = result?.data?.years ?? [];
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/grants?${query}`, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key, error: true });
      });
    return () => controller.abort();
  }, [query, key]);
  function update(updates: Record<string, string | null>) {
    const next = new URLSearchParams(window.location.search);
    for (const [name, value] of Object.entries(updates)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    if (!("page" in updates)) next.delete("page");
    router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  function clear() {
    setSearchRevision((value) => value + 1);
    router.push(pathname, { scroll: false });
  }
  const active = ["search", "status", "year", "page"].some((name) =>
    params.has(name),
  );
  const stats = [
    { label: "Total Judul Hibah", value: summary?.totalTitles, icon: FiGift },
    { label: "Total Buku", value: summary?.totalBooks, icon: FiInfo },
    { label: "Sudah Dikatalogkan", value: summary?.catalogued, icon: FiInfo },
  ];
  const page = response?.meta.page ?? 1;
  const totalPages = response?.meta.totalPages ?? 0;
  const pageStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => pageStart + i,
  );
  return (
    <>
      <div className={styles.alert}>
        <FiInfo aria-hidden="true" />
        <span>
          Pengajuan hibah <strong>tidak dilakukan melalui website.</strong> Data
          di bawah hanya menampilkan hibah yang sudah diterima.
          {summary && summary.demoRecords > 0 ? " (Data Contoh)" : ""}
        </span>
      </div>
      <section className={styles.stats} aria-label="Ringkasan seluruh hibah">
        {stats.map(({ label, value, icon: Icon }) => (
          <article className={styles.stat} key={label}>
            <span className={styles.icon}>
              <Icon aria-hidden="true" />
            </span>
            <div>
              <strong>
                {value !== undefined ? (
                  value.toLocaleString("id-ID")
                ) : loading ? (
                  <span
                    className={styles.skeleton}
                    aria-label="Memuat statistik"
                  />
                ) : (
                  "—"
                )}
              </strong>
              <p>{label}</p>
              {label === "Total Buku" && !!summary?.demoRecords && (
                <small>Data Contoh</small>
              )}
            </div>
          </article>
        ))}
      </section>
      <section
        className={styles.tableCard}
        aria-label="Daftar hibah diterima"
        aria-busy={loading}
      >
        <div className={styles.filters}>
          <SearchField
            key={searchRevision}
            initialValue={params.get("search") ?? ""}
            onSearch={(value) => update({ search: value.trim() || null })}
            placeholder="Cari judul atau pemberi hibah"
            label="Cari hibah"
          />
          <label>
            <span className={common.srOnly}>Status hibah</span>
            <select
              aria-label="Status hibah"
              value={params.get("status") ?? ""}
              onChange={(e) => update({ status: e.target.value || null })}
            >
              <option value="">Semua</option>
              {Object.entries(grantStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={common.srOnly}>Tahun penerimaan</span>
            <select
              aria-label="Tahun penerimaan"
              value={params.get("year") ?? ""}
              onChange={(e) => update({ year: e.target.value || null })}
            >
              <option value="">Semua</option>
              {years.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <div aria-label="Memuat hibah">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={styles.skeletonRow} />
            ))}
          </div>
        ) : error ? (
          <div className={common.state} role="alert">
            <h2>{errorMessage}</h2>
            <button onClick={() => setRetry((value) => value + 1)}>
              Coba Lagi
            </button>
            {active && <button onClick={clear}>Bersihkan Filter</button>}
          </div>
        ) : response?.data.length ? (
          <>
            <table className={styles.table}>
              <caption className={common.srOnly}>
                Daftar hibah buku yang sudah diterima
              </caption>
              <thead>
                <tr>
                  <th scope="col">Judul Buku</th>
                  <th scope="col">Jumlah</th>
                  <th scope="col">Asal / Pemberi</th>
                  <th scope="col">Tanggal Penerimaan</th>
                  <th scope="col">Status Koleksi</th>
                </tr>
              </thead>
              <tbody>
                {response.data.map((grant) => (
                  <tr key={grant.id}>
                    <td>{grant.title}</td>
                    <td>{grant.quantity.toLocaleString("id-ID")} eks.</td>
                    <td>{grant.donorName}</td>
                    <td>
                      <time dateTime={grant.receivedAt.slice(0, 10)}>
                        {dateFormat.format(new Date(grant.receivedAt))}
                      </time>
                    </td>
                    <td>
                      <GrantBadge status={grant.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.mobileList}>
              {response.data.map((grant) => (
                <article className={styles.grantCard} key={grant.id}>
                  <h2>{grant.title}</h2>
                  <dl>
                    <div>
                      <dt>Jumlah</dt>
                      <dd>{grant.quantity.toLocaleString("id-ID")} eks.</dd>
                    </div>
                    <div>
                      <dt>Asal / Pemberi</dt>
                      <dd>{grant.donorName}</dd>
                    </div>
                    <div>
                      <dt>Penerimaan</dt>
                      <dd>
                        <time dateTime={grant.receivedAt.slice(0, 10)}>
                          {dateFormat.format(new Date(grant.receivedAt))}
                        </time>
                      </dd>
                    </div>
                  </dl>
                  <GrantBadge status={grant.status} />
                </article>
              ))}
            </div>
            {active && (
              <div className={styles.resultsCount}>
                {response.meta.total} hasil ditemukan ·{" "}
                <button className={common.clearChips} onClick={clear}>
                  Bersihkan Filter
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={common.state}>
            <h2>Tidak ada data hibah yang sesuai.</h2>
            {active && <button onClick={clear}>Bersihkan Filter</button>}
            {totalPages > 0 && (
              <button onClick={() => update({ page: "1" })}>
                Kembali ke Halaman Pertama
              </button>
            )}
          </div>
        )}
      </section>
      {totalPages > 1 && !loading && !error && (
        <nav className={common.pagination} aria-label="Halaman hibah">
          <button
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) })}
          >
            Sebelumnya
          </button>
          {pages.map((value) => (
            <button
              key={value}
              aria-current={page === value ? "page" : undefined}
              onClick={() => update({ page: String(value) })}
            >
              {value}
            </button>
          ))}
          <button
            disabled={page >= totalPages}
            onClick={() => update({ page: String(page + 1) })}
          >
            Berikutnya
          </button>
        </nav>
      )}
    </>
  );
}
