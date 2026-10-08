"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  adminGrantApiMessage,
  adminGrantStatusLabels,
  formatAdminGrantDate,
  grantCode,
  type AdminGrantDetailResponse,
} from "./adminGrants";
import styles from "./AdminGrants.module.css";

type Props = {
  id: string;
};

export default function AdminGrantDetail({ id }: Props) {
  const [data, setData] = useState<AdminGrantDetailResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/grants/${id}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          await adminGrantApiMessage(
            response,
            "Detail hibah belum dapat dimuat.",
          ),
        );
      }

      setData((await response.json()) as AdminGrantDetailResponse);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Detail hibah belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className={styles.statePanel}>Memuat detail hibah...</div>;
  }

  if (!data) {
    return (
      <div className={styles.statePanel}>
        <div>
          <p>{error || "Data hibah tidak ditemukan."}</p>

          <Link href="/admin/hibah-buku">Kembali ke Hibah Buku</Link>
        </div>
      </div>
    );
  }

  const { grant } = data;

  const catalogued = grant.status === "SUDAH_DIKATALOGKAN";

  return (
    <div className={styles.detailPage}>
      <header className={styles.detailHeading}>
        <div>
          <div className={styles.localBreadcrumb}>
            <Link href="/admin/hibah-buku">Hibah Buku</Link>
            <span>/</span>
            <strong>Detail Hibah</strong>
          </div>

          <h1>Detail Hibah</h1>
          <p>Informasi lengkap penerimaan dan daftar buku hibah.</p>
        </div>

        <div className={styles.detailActions}>
          <Link href="/admin/hibah-buku" className={styles.secondaryButton}>
            Kembali
          </Link>

          <Link
            href={`/admin/hibah-buku/${grant.id}/edit`}
            className={styles.primaryButton}
          >
            Edit Data Hibah
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <small>{grantCode(grant.id)}</small>

          <h2>{grant.donorName}</h2>

          <p>Diterima pada {formatAdminGrantDate(grant.receivedAt)}</p>
        </div>

        <span
          className={`${styles.statusPill} ${
            catalogued ? styles.catalogued : styles.pending
          }`}
        >
          {adminGrantStatusLabels[grant.status]}
        </span>
      </section>

      <section className={styles.detailStats}>
        <article className={styles.detailStat}>
          <span>JUMLAH JUDUL</span>
          <strong>{grant.totalTitles}</strong>
        </article>

        <article className={styles.detailStat}>
          <span>TOTAL BUKU</span>
          <strong>{grant.totalBooks.toLocaleString("id-ID")}</strong>
        </article>
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.panel}>
          <h2>Informasi Penerimaan</h2>

          <dl className={styles.infoList}>
            <div>
              <dt>Asal / Pemberi Hibah</dt>
              <dd>{grant.donorName}</dd>
            </div>

            <div>
              <dt>Tanggal Penerimaan</dt>
              <dd>{formatAdminGrantDate(grant.receivedAt)}</dd>
            </div>

            <div>
              <dt>Status Katalogisasi</dt>
              <dd>{adminGrantStatusLabels[grant.status]}</dd>
            </div>
          </dl>
        </article>

        <article className={styles.panel}>
          <h2>Alur Katalogisasi</h2>

          <div className={styles.catalogFlow}>
            <div
              className={`${styles.catalogStep} ${
                catalogued ? styles.catalogStepDone : styles.catalogStepCurrent
              }`}
            >
              <span>1</span>
              <div>
                <strong>Belum Dikatalogkan</strong>
                <small>
                  Buku hibah telah diterima dan menunggu penyelesaian katalog.
                </small>
              </div>
            </div>

            <div
              className={`${styles.catalogStep} ${
                catalogued ? styles.catalogStepDone : ""
              }`}
            >
              <span>2</span>
              <div>
                <strong>Sudah Dikatalogkan</strong>
                <small>
                  Seluruh buku pada penerimaan ini selesai dikatalogkan.
                </small>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <h2>Daftar Buku Hibah</h2>

        <div className={styles.tableScroller}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>NO.</th>
                <th>JUDUL BUKU</th>
                <th>JUMLAH</th>
              </tr>
            </thead>

            <tbody>
              {grant.items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.title}</td>
                  <td>{item.quantity.toLocaleString("id-ID")} buku</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Catatan</h2>

        <p className={styles.note}>
          {grant.note || "Tidak ada catatan tambahan."}
        </p>
      </section>
    </div>
  );
}
