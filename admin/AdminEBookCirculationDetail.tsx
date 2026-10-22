/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiBookOpen, FiClock, FiInfo, FiUser } from "react-icons/fi";
import { Button, ButtonLink } from "@/components/Button";
import { safeCoverUrl } from "../shared/displayUrls.cjs";
import { memberTypeLabel } from "./adminTransactions";
import { circulationDateTime, circulationStatusLabel, loadCirculationDetail, type CirculationDetail } from "./ebookCirculation";
import styles from "./AdminLoanDetail.module.css";

type State = { key: string; detail: CirculationDetail | null; error: string };

export default function AdminEBookCirculationDetail({ id, kind }: { id: number; kind: CirculationDetail["kind"] }) {
  const [revision, setRevision] = useState(0);
  const key = `${kind}:${id}:${revision}`;
  const [state, setState] = useState<State>({ key: "", detail: null, error: "" });
  const loading = state.key !== key;
  const detail = state.detail;
  const title = kind === "queue" ? "Detail Antrean E-Book" : "Detail Akses E-Book";
  const section = kind === "queue" ? "QUEUE" : detail?.kind === "loan" && detail.record.status !== "AKTIF" ? "HISTORY" : "ACTIVE";
  const backHref = `/admin/transaksi/e-book?tab=${section}`;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const detail = await loadCirculationDetail(kind, id, controller.signal);
        if (!controller.signal.aborted) setState({ key, detail, error: "" });
      } catch (reason) {
        if (!controller.signal.aborted) setState({ key, detail: null, error: reason instanceof Error ? reason.message : "Detail belum dapat dimuat." });
      }
    }
    void load();
    return () => controller.abort();
  }, [id, kind, key]);

  return <div className={styles.page}>
    <header className={styles.heading}>
      <div className={styles.headingText}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href={backHref}>Sirkulasi E-Book</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav>
        <h1 data-page-title>{title}</h1>
      </div>
      <ButtonLink href={backHref} variant="back" icon={<FiArrowLeft />}>Kembali</ButtonLink>
    </header>
    {loading ? <section className={styles.statePanel} aria-busy="true" aria-live="polite"><FiClock aria-hidden="true" /><p>Memuat detail sirkulasi E-Book...</p></section>
      : state.error ? <section className={styles.statePanel} role="alert"><FiInfo aria-hidden="true" /><h2>Detail belum dapat ditampilkan</h2><p>{state.error}</p><Button variant="secondary" onClick={() => setRevision(value => value + 1)}>Coba Lagi</Button></section>
        : detail ? <CirculationCards detail={detail} />
          : <section className={styles.statePanel}><FiInfo aria-hidden="true" /><h2>Record sirkulasi tidak ditemukan</h2><p>Data ini tidak tersedia. Kembali ke daftar untuk memilih record lain.</p></section>}
  </div>;
}

function CirculationCards({ detail }: { detail: CirculationDetail }) {
  const { user, book, status } = detail.record;
  const tone = status === "AKTIF" || status === "DIKEMBALIKAN" ? styles.success : status === "DITAWARKAN" ? styles.warning : styles.neutral;
  return <>
    <section className={styles.card} aria-labelledby="circulation-information">
      <h2 id="circulation-information"><FiClock aria-hidden="true" />Informasi {detail.kind === "queue" ? "Antrean" : "Akses"}</h2>
      <dl className={`${styles.fields} ${styles.transactionFields}`}>
        <div><dt>{detail.kind === "queue" ? "Status antrean" : detail.record.status === "AKTIF" ? "Status akses" : "Status akhir"}</dt><dd><span className={`${styles.status} ${tone}`}>{circulationStatusLabel(status, detail.kind)}</span></dd></div>
        {detail.kind === "loan" ? <>
          <div><dt>Mulai akses</dt><dd>{circulationDateTime(detail.record.borrowedAt)}</dd></div>
          <div><dt>Batas akses</dt><dd>{circulationDateTime(detail.record.dueAt)}</dd></div>
          {detail.record.endedAt ? <div><dt>Selesai</dt><dd>{circulationDateTime(detail.record.endedAt)}</dd></div> : null}
        </> : <>
          {detail.record.position !== null ? <div><dt>Posisi antrean</dt><dd>#{detail.record.position}</dd></div> : null}
          <div><dt>Masuk antrean</dt><dd>{circulationDateTime(detail.record.queuedAt)}</dd></div>
          {detail.record.offeredAt ? <div><dt>Mulai prioritas</dt><dd>{circulationDateTime(detail.record.offeredAt)}</dd></div> : null}
          {detail.record.claimExpiresAt ? <div><dt>Batas prioritas</dt><dd>{circulationDateTime(detail.record.claimExpiresAt)}</dd></div> : null}
          {detail.record.claimedAt ? <div><dt>Akses diaktifkan</dt><dd>{circulationDateTime(detail.record.claimedAt)}</dd></div> : null}
          {detail.record.cancelledAt ? <div><dt>Dibatalkan</dt><dd>{circulationDateTime(detail.record.cancelledAt)}</dd></div> : null}
          {detail.record.expiredAt ? <div><dt>Antrean berakhir</dt><dd>{circulationDateTime(detail.record.expiredAt)}</dd></div> : null}
        </>}
      </dl>
    </section>
    <div className={styles.informationGrid}>
      <section className={styles.card} aria-labelledby="circulation-member">
        <h2 id="circulation-member"><FiUser aria-hidden="true" />Anggota</h2>
        <dl className={styles.fields}>
          <div><dt>Nama anggota</dt><dd className={styles.prominent}>{user.name}</dd></div>
          <div><dt>Jenis anggota</dt><dd>{memberTypeLabel(user.memberType)}</dd></div>
          {user.email ? <div><dt>Email</dt><dd>{user.email}</dd></div> : null}
        </dl>
      </section>
      <section className={styles.card} aria-labelledby="circulation-book">
        <h2 id="circulation-book"><FiBookOpen aria-hidden="true" />E-Book</h2>
        <div className={styles.book}>
          {book.coverUrl ? <img src={safeCoverUrl(book.coverUrl)} alt={`Sampul ${book.title}`} width={86} height={122} /> : null}
          <dl className={styles.fields}>
            <div><dt>Judul E-Book</dt><dd className={styles.prominent}>{book.title}</dd></div>
            <div><dt>Kode E-Book</dt><dd>{book.code}</dd></div>
            {book.author ? <div><dt>Penulis</dt><dd>{book.author}</dd></div> : null}
            {detail.kind === "queue" && book.licenseNote ? <div><dt>Catatan lisensi</dt><dd>{book.licenseNote}</dd></div> : null}
          </dl>
        </div>
      </section>
    </div>
  </>;
}
