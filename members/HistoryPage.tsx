"use client";

import { safeCoverUrl } from "../shared/displayUrls.cjs";
import Image from "next/image";
import Link from "next/link";
import { FiCheckCircle, FiClock, FiSearch, FiXCircle } from "react-icons/fi";
import { Badge, ErrorState } from "./MemberUI";
import { historyDate } from "./format";
import type { HistoryItem } from "./types";
import shared from "./Members.module.css";
import styles from "./History.module.css";

function Status({ item }: { item: HistoryItem }) {
  const returned = item.status === "DIKEMBALIKAN";
  const Icon = returned ? FiCheckCircle : FiXCircle;
  const label = returned
    ? "Dikembalikan"
    : item.status === "KEDALUWARSA"
      ? "Reservasi Kedaluwarsa"
      : "Reservasi Dibatalkan";

  return (
    <span className={returned ? styles.returned : styles.neutral} data-record-badge>
      <Badge tone={returned ? "green" : "neutral"}>
        <Icon aria-hidden />
        {label}
      </Badge>
    </span>
  );
}

function activityDate(item: HistoryItem) {
  return historyDate(
    item.sourceType === "LOAN" ? item.borrowedAt : item.reservedAt,
    item.sourceType === "RESERVATION",
  );
}

interface HistoryPageProps {
  history: HistoryItem[];
  loading: boolean;
  error: string;
  retry: () => Promise<void>;
}

export default function HistoryPage({
  history,
  loading,
  error,
  retry,
}: HistoryPageProps) {
  return (
    <section
      id="riwayat-peminjaman"
      className={`${shared.pageStack} ${styles.historySection}`}
      aria-labelledby="riwayat-peminjaman-title"
    >
      <div className={styles.pageHeading}>
        <h2 id="riwayat-peminjaman-title">Riwayat Pinjaman</h2>
        <p>Catatan buku fisik yang telah selesai dipinjam serta reservasi yang berakhir.</p>
      </div>

      {loading ? (
        <div
          className={styles.loading}
          role="status"
          aria-label="Memuat riwayat peminjaman"
        >
          <span className={shared.srOnly}>Memuat riwayat peminjaman...</span>
          {[1, 2, 3].map((id) => (
            <div
              key={id}
              className={`${shared.skeleton} ${styles.loadingCard}`}
              aria-hidden
            />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          message="Riwayat peminjaman belum dapat dimuat. Silakan coba lagi."
          retry={retry}
        />
      ) : !history.length ? (
        <div className={`${shared.empty} ${styles.empty}`}>
          <FiClock size={32} aria-hidden />
          <h2>Belum ada riwayat peminjaman.</h2>
          <p>Peminjaman yang telah selesai akan muncul di sini.</p>
          <Link data-button="primary" className={shared.button} href="/dashboard/koleksi">
            <FiSearch aria-hidden />
            Cari Koleksi
          </Link>
        </div>
      ) : (
        <ul className={styles.cards} aria-label="Riwayat peminjaman">
          {history.map((item, index) => (
            <li
              key={`${item.sourceType}-${item.id}`}
              style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
            >
              <article className={styles.card} data-record-card>
                <div className={styles.cardContent}>
                  <div className={styles.cardHeading}>
                    <div>
                      <h3 data-record-primary>
                        <Link
                          className={styles.title}
                          href={`/dashboard/koleksi/${item.bookId}`}
                        >
                          {item.title}
                        </Link>
                      </h3>
                    </div>
                    <Status item={item} />
                  </div>

                  <dl className={styles.details}>
                    <div>
                      <dt>{item.sourceType === "LOAN" ? "Dipinjam" : "Diajukan"}</dt>
                      <dd>{activityDate(item)}</dd>
                    </div>
                    <div>
                      <dt>Kembali</dt>
                      <dd>{historyDate(item.returnedAt)}</dd>
                    </div>
                  </dl>
                  {item.extensionCount > 0 && <p className={styles.extensionCount} data-record-secondary>Perpanjangan: {item.extensionCount}x</p>}
                </div>

                <Link
                  className={styles.cover}
                  href={`/dashboard/koleksi/${item.bookId}`}
                  aria-label={`Lihat detail ${item.title}`}
                >
                  <Image
                    src={safeCoverUrl(item.coverUrl)}
                    alt={`Sampul ${item.title}`}
                    fill
                    sizes="(max-width: 600px) 72px, 92px"
                    unoptimized
                  />
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
