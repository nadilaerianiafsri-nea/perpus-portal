"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FiArrowDown, FiArrowUp, FiGift, FiInfo } from "react-icons/fi";
import SearchField from "@/components/SearchField";
import AppSelect from "@/components/AppSelect";
import StatCard, { type StatTone } from "@/components/StatCard";
import GrantBadge from "./GrantBadge";
import {
  type BookGrant,
  type GrantsResponse,
  grantStatusLabels,
} from "./grantTypes";
import common from "@/catalog/Catalog.module.css";
import styles from "./Information.module.css";
import grantStyles from "./GrantsEnhancements.module.css";
import {
  resolveGrantViewState,
  type GrantRequestResult,
} from "./grantViewState";

const errorMessage = "Data hibah belum dapat dimuat. Silakan coba lagi.";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

type SortKey = "title" | "quantity" | "donor" | "date" | "status";
type SortDirection = "asc" | "desc";

type TableSort = {
  key: SortKey;
  direction: SortDirection;
} | null;

type GrantSummaryNumbers = {
  totalTitles: number;
  totalBooks: number;
  catalogued: number;
};

function buildSummaryFromGrants(grants: BookGrant[]): GrantSummaryNumbers {
  return {
    totalTitles: grants.length,
    totalBooks: grants.reduce((sum, grant) => sum + grant.quantity, 0),
    catalogued: grants.filter((grant) => grant.status === "SUDAH_DIKATALOGKAN").length,
  };
}


const sortLabels: Record<
  SortKey,
  {
    asc: string;
    desc: string;
  }
> = {
  title: {
    asc: "Urutkan A ke Z",
    desc: "Urutkan Z ke A",
  },
  quantity: {
    asc: "Terkecil ke Terbesar",
    desc: "Terbesar ke Terkecil",
  },
  donor: {
    asc: "Urutkan A ke Z",
    desc: "Urutkan Z ke A",
  },
  date: {
    asc: "Terlama ke Terbaru",
    desc: "Terbaru ke Terlama",
  },
  status: {
    asc: "Urutkan A ke Z",
    desc: "Urutkan Z ke A",
  },
};

function compareGrants(
  a: BookGrant,
  b: BookGrant,
  key: SortKey,
  direction: SortDirection,
) {
  let result = 0;

  if (key === "title") {
    result = a.title.localeCompare(b.title, "id-ID", {
      sensitivity: "base",
    });
  } else if (key === "quantity") {
    result = a.quantity - b.quantity;
  } else if (key === "donor") {
    result = a.donorName.localeCompare(b.donorName, "id-ID", {
      sensitivity: "base",
    });
  } else if (key === "date") {
    result = a.receivedAt.localeCompare(b.receivedAt);
  } else {
    result = grantStatusLabels[a.status].localeCompare(
      grantStatusLabels[b.status],
      "id-ID",
      {
        sensitivity: "base",
      },
    );
  }

  return direction === "asc" ? result : -result;
}

export default function Grants() {
  const params = useSearchParams();
  const pathname = usePathname();

  const [queryText, setQueryText] = useState(() => params.toString());
  const queryParams = new URLSearchParams(queryText);
  const query = queryText;

  const [retry, setRetry] = useState(0);
  const [searchRevision, setSearchRevision] = useState(0);

  const [result, setResult] =
    useState<
      GrantRequestResult<GrantsResponse>
    >(null);

  const [tableSort, setTableSort] = useState<TableSort>(null);

  const key = `${query}:${retry}`;

  const {
    loading,
    response,
    error,
  } = resolveGrantViewState(
    result,
    key,
  );

  const initialLoading =
    loading && !response;

  const summary = response?.summary;
  const years = response?.years ?? [];

  useEffect(() => {
    const syncFromHistory = () => {
      setQueryText(window.location.search.replace(/^\?/, ""));
    };

    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);


  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/grants?${query}`, {
      cache: "no-store",
      signal: AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(12000),
      ]),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: GrantsResponse) => {
        if (!controller.signal.aborted) {
          setResult({ key, query, data });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult((current) => ({
            key,
            query: current?.data
              ? current.query
              : query,
            data: current?.data,
            error: true,
          }));
        }
      });

    return () => controller.abort();
  }, [query, key]);

  function commitQuery(next: URLSearchParams) {
    const nextText = next.toString();
    setQueryText(nextText);

    const href = `${pathname}${nextText ? `?${nextText}` : ""}`;
    window.history.replaceState(window.history.state, "", href);
  }

  function update(updates: Record<string, string | null>) {
    const next = new URLSearchParams(queryText);

    for (const [name, value] of Object.entries(updates)) {
      if (value) {
        next.set(name, value);
      } else {
        next.delete(name);
      }
    }

    if (!("page" in updates)) {
      next.delete("page");
    }

    commitQuery(next);
  }

  function clear() {
    setSearchRevision((value) => value + 1);
    setTableSort(null);
    commitQuery(new URLSearchParams());
  }

  function toggleSort(key: SortKey) {
    setTableSort((current) => {
      if (current?.key !== key) {
        return { key, direction: "asc" };
      }

      return {
        key,
        direction: current.direction === "asc" ? "desc" : "asc",
      };
    });
  }

  const active = ["search", "status", "year", "page"].some((name) =>
    queryParams.has(name),
  );

  const page = response?.meta.page ?? 1;
  const totalPages = response?.meta.totalPages ?? 0;
  const pageStart = Math.max(1, Math.min(page - 2, totalPages - 4));

  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => pageStart + index,
  );

  const pageData = response?.data ?? [];

  const displayedGrants = tableSort
    ? [...pageData].sort((a, b) =>
        compareGrants(a, b, tableSort.key, tableSort.direction),
      )
    : pageData;

  const responseQueryParams =
    new URLSearchParams(
      result?.query ?? "",
    );

  const hasDataFilter = [
    "search",
    "status",
    "year",
  ].some((name) =>
    responseQueryParams.has(name),
  );

  const displaySummary = hasDataFilter
    ? buildSummaryFromGrants(displayedGrants)
    : summary
      ? {
          totalTitles: summary.totalTitles ?? 0,
          totalBooks: summary.totalBooks ?? 0,
          catalogued: summary.catalogued ?? 0,
        }
      : buildSummaryFromGrants(displayedGrants);

  const stats = [
    {
      label: "Total Judul Hibah",
      value: displaySummary.totalTitles,
      icon: FiGift,
      tone: "primary",
      cardClass: grantStyles.summaryCardOne,
    },
    {
      label: "Total Buku",
      value: displaySummary.totalBooks,
      icon: FiInfo,
      tone: "dark",
      cardClass: grantStyles.summaryCardTwo,
    },
    {
      label: "Sudah Dikatalogkan",
      value: displaySummary.catalogued,
      icon: FiInfo,
      tone: "primary",
      cardClass: grantStyles.summaryCardThree,
    },
  ];


  function sortableHeader(key: SortKey, label: string) {
    const activeSort = tableSort?.key === key;
    const direction = activeSort ? tableSort.direction : "asc";
    const DirectionIcon = direction === "asc" ? FiArrowUp : FiArrowDown;

    return (
      <button
        type="button"
        className={`${grantStyles.sortHeaderButton} ${
          activeSort ? grantStyles.sortHeaderButtonActive : ""
        }`}
        aria-label={`${label}: ${
          activeSort
            ? direction === "asc"
              ? sortLabels[key].desc
              : sortLabels[key].asc
            : sortLabels[key].asc
        }`}
        title={
          activeSort
            ? direction === "asc"
              ? sortLabels[key].desc
              : sortLabels[key].asc
            : sortLabels[key].asc
        }
        onClick={() => toggleSort(key)}
      >
        <span>{label}</span>
        <DirectionIcon
          className={grantStyles.sortDirectionIcon}
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <>
      <section
        className={`${styles.stats} ${
          loading && response
            ? grantStyles.summaryUpdating
            : ""
        }`}
        aria-label="Ringkasan seluruh hibah"
        aria-busy={loading}
      >
        {initialLoading ? (
          <>
            <span className={styles.srOnly} role="status">
              Memuat ringkasan hibah...
            </span>

            {stats.map(({ label }) => (
              <div
                key={label}
                className={styles.summarySkeleton}
                aria-hidden="true"
              >
                <span className={styles.skeleton} />
                <span className={styles.skeleton} />
                <span className={styles.skeleton} />
              </div>
            ))}
          </>
        ) : error && !response ? (
          <p className={styles.summaryError} role="status">
            Ringkasan hibah belum dapat dimuat.
          </p>
        ) : (
          stats.map(({ label, value, icon: Icon, tone, cardClass }) => (
            <StatCard
              key={label}
              label={label}
              tone={tone as StatTone}
              icon={<Icon />}
              className={`${styles.summaryCard} ${cardClass}`}
              value={value.toLocaleString("id-ID")}
            />
          ))
        )}
      </section>

      <section
        className={`${styles.tableCard} ${grantStyles.tableCard}`}
        aria-label="Daftar hibah diterima"
        aria-busy={loading}
      >
        <div className={`${styles.filters} ${grantStyles.filters}`}>
          <SearchField
            key={searchRevision}
            initialValue={queryParams.get("search") ?? ""}
            onSearch={(value) =>
              update({
                search: value.trim() || null,
              })
            }
            placeholder="Cari judul atau pemberi hibah"
            label="Cari hibah"
          />

          <label>
            <span className={common.srOnly}>Status hibah</span>

            <AppSelect
              className={common.catalogSelect}
              aria-label="Status hibah"
              value={queryParams.get("status") ?? ""}
              onChange={(event) =>
                update({
                  status: event.target.value || null,
                })
              }
            >
              <option value="">Semua</option>

              {Object.entries(grantStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </AppSelect>
          </label>

          <label>
            <span className={common.srOnly}>Tahun penerimaan</span>

            <AppSelect
              className={common.catalogSelect}
              aria-label="Tahun penerimaan"
              value={queryParams.get("year") ?? ""}
              onChange={(event) =>
                update({
                  year: event.target.value || null,
                })
              }
            >
              <option value="">Semua</option>

              {years.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </AppSelect>
          </label>
        </div>

        {loading && response ? (
          <span
            className={styles.srOnly}
            role="status"
            aria-live="polite"
          >
            Memperbarui hasil hibah...
          </span>
        ) : null}

        {initialLoading ? (
          <div aria-label="Memuat hibah">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className={styles.skeletonRow} />
            ))}
          </div>
        ) : error && !response ? (
          <div className={common.state} role="alert">
            <h2>{errorMessage}</h2>

            <button
              data-button="primary"
              data-button-size="md"
              onClick={() => setRetry((value) => value + 1)}
            >
              Coba Lagi
            </button>

            {active ? (
              <button
                data-button="ghost"
                data-button-size="md"
                onClick={clear}
              >
                Bersihkan Filter
              </button>
            ) : null}
          </div>
        ) : response?.data.length ? (
          <>
            <table
              key={`grant-table-${result?.key ?? "initial"}`}
              className={`${styles.table} ${grantStyles.table} ${
                loading
                  ? grantStyles.resultsUpdating
                  : ""
              }`}
            >
              <caption className={common.srOnly}>
                Daftar hibah buku yang sudah diterima
              </caption>

              <thead>
                <tr>
                  <th scope="col">
                    {sortableHeader("title", "Judul Buku")}
                  </th>

                  <th scope="col">
                    {sortableHeader("quantity", "Jumlah")}
                  </th>

                  <th scope="col">
                    {sortableHeader("donor", "Asal / Pemberi")}
                  </th>

                  <th scope="col">
                    {sortableHeader("date", "Tanggal Penerimaan")}
                  </th>

                  <th scope="col">
                    {sortableHeader("status", "Status Koleksi")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {displayedGrants.map((grant) => (
                  <tr className={grantStyles.tableRow} key={grant.id}>
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

            <div
              key={`grant-mobile-${result?.key ?? "initial"}`}
              className={`${styles.mobileList} ${grantStyles.mobileList} ${
                loading
                  ? grantStyles.resultsUpdating
                  : ""
              }`}
            >
              {displayedGrants.map((grant) => (
                <article
                  className={`${styles.grantCard} ${grantStyles.grantCard}`}
                  key={grant.id}
                >
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

            {active ? (
              <div className={styles.resultsCount}>
                {response.meta.total} hasil ditemukan ·{" "}

                <button
                  data-button="ghost"
                  data-button-size="md"
                  className={common.clearChips}
                  onClick={clear}
                >
                  Bersihkan Filter
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className={common.state}>
            <h2>Tidak ada data hibah yang sesuai.</h2>

            {active ? (
              <button
                data-button="ghost"
                data-button-size="md"
                onClick={clear}
              >
                Bersihkan Filter
              </button>
            ) : null}

            {totalPages > 0 ? (
              <button
                data-button="ghost"
                data-button-size="md"
                onClick={() => update({ page: "1" })}
              >
                Kembali ke Halaman Pertama
              </button>
            ) : null}
          </div>
        )}
      </section>

      {totalPages > 1 && response ? (
        <nav className={common.pagination} aria-label="Halaman hibah">
          <button
            data-button="secondary"
            data-button-size="md"
            disabled={loading || page <= 1}
            onClick={() => update({ page: String(page - 1) })}
          >
            Sebelumnya
          </button>

          {pages.map((value) => (
            <button
              data-button={page === value ? "primary" : "ghost"}
              data-button-size="sm"
              key={value}
              aria-current={page === value ? "page" : undefined}
              disabled={loading}
              onClick={() => update({ page: String(value) })}
            >
              {value}
            </button>
          ))}

          <button
            data-button="secondary"
            data-button-size="md"
            disabled={loading || page >= totalPages}
            onClick={() => update({ page: String(page + 1) })}
          >
            Berikutnya
          </button>
        </nav>
      ) : null}
    </>
  );
}
