"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { FiSearch } from "react-icons/fi";
import {
  adminOperationsApiMessage,
  formatAdminOperationDate,
  type AdminNotificationRow,
  type AdminNotificationsResponse,
  type NotificationChannel,
} from "./adminOperations";
import styles from "./AdminNotifications.module.css";

const emptyResult: AdminNotificationsResponse = {
  counts: { all: 0, email: 0, whatsapp: 0, failed: 0, unread: 0 },
  data: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

function channelLabel(channel: AdminNotificationRow["channel"]) {
  if (channel === "SYSTEM") return "Sistem";
  return channel === "EMAIL" ? "Email" : "WhatsApp";
}

function statusLabel(row: AdminNotificationRow) {
  if (row.channel === "SYSTEM") return "Menunggu Pengambilan";

  switch (row.status) {
    case "TERKIRIM":
      return "Terkirim";
    case "GAGAL":
      return "Gagal";
    case "MENGIRIM":
      return "Mengirim";
    case "MANUAL":
      return "Manual";
    default:
      return "Menunggu";
  }
}

function contactLabel(row: AdminNotificationRow) {
  if (row.channel === "SYSTEM") return "Notifikasi Sistem";
  if (row.channel === "EMAIL") return row.memberEmail;
  return row.memberWhatsapp || "Nomor belum tersedia";
}

function canOpenNotification(
  row: AdminNotificationRow,
): row is AdminNotificationRow & { channel: "SYSTEM"; href: string } {
  return row.channel === "SYSTEM" && Boolean(row.href);
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<NotificationChannel>("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState<AdminNotificationsResponse>(emptyResult);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    void revision;
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      channel,
      page: String(page),
      limit: String(limit),
    });
    if (search) query.set("search", search);

    try {
      const response = await fetch(
        `/api/members/admin/operations/notifications?${query}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(
          await adminOperationsApiMessage(
            response,
            "Data notifikasi belum dapat dimuat.",
          ),
        );
      }
      const payload = (await response.json()) as AdminNotificationsResponse;
      if (page > payload.meta.totalPages) {
        setPage(payload.meta.totalPages);
        return;
      }
      setResult(payload);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Data notifikasi belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [channel, limit, page, revision, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve the existing notification fetch/loading lifecycle while changing action styles.
    void load();
  }, [load]);

  const tabs: Array<[NotificationChannel, string, number]> = [
    ["ALL", "Semuanya", result.counts.all],
    ["EMAIL", "Email", result.counts.email],
    ["WHATSAPP", "WhatsApp", result.counts.whatsapp],
  ];

  async function openNotification(row: AdminNotificationRow) {
    if (!canOpenNotification(row)) return;

    setError("");
    try {
      if (!row.readAt) {
        const response = await fetch(
          `/api/members/admin/operations/notifications/${row.sourceNotificationId}/read`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          },
        );

        if (!response.ok) {
          setError(
            await adminOperationsApiMessage(
              response,
              "Notifikasi belum dapat ditandai sebagai dibaca.",
            ),
          );
          return;
        }

        setResult((current) => ({
          ...current,
          counts: {
            ...current.counts,
            unread: Math.max(0, current.counts.unread - 1),
          },
          data: current.data.map((item) =>
            item.sourceNotificationId === row.sourceNotificationId &&
            item.channel === "SYSTEM"
              ? { ...item, readAt: new Date().toISOString() }
              : item,
          ),
        }));
      }

      router.push(row.href);
    } catch {
      setError("Notifikasi belum dapat dibuka. Silakan coba lagi.");
    }
  }

  function handleNotificationKeyDown(
    event: KeyboardEvent<HTMLElement>,
    row: AdminNotificationRow,
  ) {
    if (!canOpenNotification(row)) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    void openNotification(row);
  }

  const first = result.meta.total ? (result.meta.page - 1) * result.meta.limit + 1 : 0;
  const last = Math.min(result.meta.page * result.meta.limit, result.meta.total);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <div>
          <h1>Notifikasi</h1>
          <p>Monitor reservasi baru, pengingat Email, dan tindak lanjut WhatsApp anggota.</p>
        </div>
      </header>

      <div className={styles.infoBox} role="note">
        Reservasi baru tampil sebagai notifikasi Sistem. Email otomatis dikirim
        pada H-1, hari jatuh tempo (H), lalu H+2 dan seterusnya selama masih
        terlambat. WhatsApp dikirim manual oleh petugas dari menu Transaksi.
      </div>

      <section className={styles.filterCard} aria-label="Filter notifikasi">
        <label className={styles.searchBox}>
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Cari anggota, buku, pengingat, atau nomor transaksi..."
            aria-label="Cari notifikasi"
          />
        </label>

        <div className={styles.tabs} role="tablist" aria-label="Kanal notifikasi">
          {tabs.map(([value, label, count]) => (
            <button
              data-button="secondary"
              data-button-size="md"
              data-button-active={channel === value}
              key={value}
              type="button"
              role="tab"
              aria-selected={channel === value}
              className={channel === value ? styles.tabActive : undefined}
              onClick={() => {
                setChannel(value);
                setPage(1);
              }}
            >
              {label} <span>{count}</span>
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <span>{error}</span>
          <button data-button="secondary" data-button-size="md" type="button" onClick={() => setRevision((value) => value + 1)}>
            Coba Lagi
          </button>
        </div>
      ) : null}

      <section className={styles.tableCard} aria-busy={loading}>
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ANGGOTA</th>
                <th>TRANSAKSI</th>
                <th>JENIS PENGINGAT</th>
                <th>KANAL</th>
                <th>WAKTU</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && !result.data.length ? (
                <tr>
                  <td colSpan={6} className={styles.stateCell}>
                    Memuat log notifikasi...
                  </td>
                </tr>
              ) : result.data.length ? (
                result.data.map((row) => {
                  const clickable = canOpenNotification(row);
                  const readState =
                    row.channel === "SYSTEM"
                      ? row.readAt
                        ? styles.notificationRead
                        : styles.notificationUnread
                      : "";

                  return (
                    <tr
                      key={row.id}
                      className={`${clickable ? styles.notificationClickable : ""} ${readState}`}
                      onClick={clickable ? () => void openNotification(row) : undefined}
                      onKeyDown={
                        clickable
                          ? (event) => handleNotificationKeyDown(event, row)
                          : undefined
                      }
                      tabIndex={clickable ? 0 : undefined}
                      role={clickable ? "link" : undefined}
                      aria-label={
                        clickable
                          ? `Buka notifikasi ${row.reminderType} untuk ${row.memberName}`
                          : undefined
                      }
                    >
                      <td>
                        <div className={styles.memberCell}>
                          <strong>{row.memberName}</strong>
                          <small>{contactLabel(row)}</small>
                        </div>
                      </td>
                      <td>{row.transactionCode}</td>
                      <td>
                        <div className={styles.memberCell}>
                          <strong>{row.reminderType}</strong>
                          {row.bookTitle ? <small>{row.bookTitle}</small> : null}
                        </div>
                      </td>
                      <td>
                        <span className={styles.channelPill}>
                          {channelLabel(row.channel)}
                        </span>
                      </td>
                      <td>{formatAdminOperationDate(row.time)}</td>
                      <td>
                        <span
                          className={`${styles.statusPill} ${styles[`status${row.status}`]}`}
                        >
                          {statusLabel(row)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className={styles.stateCell}>
                    Tidak ada log notifikasi yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.mobileList}>
          {loading && !result.data.length ? (
            <div className={styles.mobileState}>Memuat log notifikasi...</div>
          ) : result.data.length ? (
            result.data.map((row) => {
              const clickable = canOpenNotification(row);
              const readState =
                row.channel === "SYSTEM"
                  ? row.readAt
                    ? styles.mobileRead
                    : styles.mobileUnread
                  : "";

              return (
                <article
                  key={row.id}
                  className={`${styles.mobileCard} ${clickable ? styles.mobileClickable : ""} ${readState}`}
                  onClick={clickable ? () => void openNotification(row) : undefined}
                  onKeyDown={
                    clickable
                      ? (event) => handleNotificationKeyDown(event, row)
                      : undefined
                  }
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? "link" : undefined}
                  aria-label={
                    clickable
                      ? `Buka notifikasi ${row.reminderType} untuk ${row.memberName}`
                      : undefined
                  }
                >
                  <div className={styles.mobileHeading}>
                    <div>
                      <strong>{row.memberName}</strong>
                      <small>{row.transactionCode}</small>
                    </div>
                    <span
                      className={`${styles.statusPill} ${styles[`status${row.status}`]}`}
                    >
                      {statusLabel(row)}
                    </span>
                  </div>
                  <dl>
                    <div><dt>Jenis Pengingat</dt><dd>{row.reminderType}</dd></div>
                    {row.bookTitle ? <div><dt>Buku</dt><dd>{row.bookTitle}</dd></div> : null}
                    <div><dt>Kanal</dt><dd>{channelLabel(row.channel)}</dd></div>
                    <div><dt>Waktu</dt><dd>{formatAdminOperationDate(row.time)}</dd></div>
                    <div>
                      <dt>Kontak</dt>
                      <dd>{contactLabel(row)}</dd>
                    </div>
                  </dl>
                </article>
              );
            })
          ) : (
            <div className={styles.mobileState}>Tidak ada log notifikasi yang sesuai.</div>
          )}
        </div>

        <footer className={styles.tableFooter}>
          <span>Menampilkan {first}–{last} dari {result.meta.total} data</span>
          <div className={styles.footerActions}>
            <label>
              <span className={styles.srOnly}>Data per halaman</span>
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10 / halaman</option>
                <option value={20}>20 / halaman</option>
                <option value={50}>50 / halaman</option>
              </select>
            </label>
            <button
              data-button="secondary"
              data-button-size="sm"
              data-button-shape="square"
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Halaman sebelumnya"
            >
              ‹
            </button>
            <span className={styles.pageNumber}>{result.meta.page}</span>
            <button
              data-button="secondary"
              data-button-size="sm"
              data-button-shape="square"
              type="button"
              disabled={page >= result.meta.totalPages}
              onClick={() =>
                setPage((current) => Math.min(result.meta.totalPages, current + 1))
              }
              aria-label="Halaman berikutnya"
            >
              ›
            </button>
          </div>
        </footer>
      </section>

      {result.counts.failed > 0 ? (
        <div className={styles.failedBox} role="alert">
          {result.counts.failed} pengiriman gagal. Email dicoba ulang otomatis pada
          jadwal berikutnya; WhatsApp perlu dikirim ulang manual dari menu
          Transaksi.
        </div>
      ) : null}
    </div>
  );
}
