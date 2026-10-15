"use client";

import { safeCoverUrl } from "../shared/displayUrls.cjs";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiBookOpen, FiClock, FiList, FiMonitor } from "react-icons/fi";
import { memberRequest, useMemberResource } from "./api";
import { normalizeMemberEBooksPayload } from "./ebookPayload";
import { ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import type { MemberEBooksPayload } from "./types";
import shared from "./Members.module.css";
import styles from "./EBooks.module.css";

function progressValue(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value ?? 0)));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function remaining(deadline: string | null, now: number) {
  if (!deadline) return "";
  const milliseconds = Math.max(0, new Date(deadline).getTime() - now);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1000);
  return `${hours}j ${minutes}m ${seconds}d`;
}

export default function EBooksPage() {
  const resource = useMemberResource<MemberEBooksPayload>("ebooks");
  const locked = useRef(false);
  const [pendingKey, setPendingKey] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const normalized = useMemo(
    () => normalizeMemberEBooksPayload(resource.data),
    [resource.data],
  );
  const { activeLoans, queues, readHistory } = normalized;

  const visibleHistory = useMemo(() => {
    const active = new Set(activeLoans.map((row) => row.bookId));
    const queued = new Set(queues.map((row) => row.bookId));
    return readHistory.filter(
      (row) => !active.has(row.bookId) && !queued.has(row.bookId),
    );
  }, [activeLoans, queues, readHistory]);

  async function act(bookId: number, path: string, message: string) {
    if (locked.current) return;
    locked.current = true;
    setPendingKey(`${bookId}:${path}`);
    setNotice("");
    try {
      await memberRequest(`ebooks/${bookId}/${path}`, {
        method: "POST",
        body: "{}",
      });
      setNotice(message);
      await resource.reload();
    } catch (failure) {
      setNotice(
        failure instanceof Error
          ? failure.message
          : "Aksi E-Book belum dapat diproses. Silakan coba lagi.",
      );
    } finally {
      locked.current = false;
      setPendingKey("");
    }
  }

  return (
    <div className={shared.pageStack}>
      <PageHeading
        title="E-Book Saya"
        description="Kelola masa akses, antrean, dan lanjutkan bacaan dari posisi terakhir Anda."
      />

      {notice ? <div className={styles.notice} role="status">{notice}</div> : null}

      {resource.loading ? (
        <LoadingCards />
      ) : resource.error ? (
        <ErrorState
          message="E-Book Anda belum dapat dimuat. Silakan coba lagi."
          retry={resource.reload}
        />
      ) : (
        <>
          <section className={styles.section} aria-labelledby="ebook-aktif">
            <div className={styles.sectionHeading}>
              <div><FiBookOpen aria-hidden /><div><h2 id="ebook-aktif">Sedang Dipinjam</h2><p>Masa akses E-Book aktif selama 7 hari dan tidak dapat diperpanjang.</p></div></div>
              <span>{activeLoans.length}</span>
            </div>
            {!activeLoans.length ? (
              <div className={styles.compactEmpty}>Belum ada E-Book yang sedang dipinjam.</div>
            ) : (
              <div className={styles.grid}>
                {activeLoans.map((loan) => {
                  const progress = progressValue(loan.reading?.progress);
                  return (
                    <article className={styles.card} key={loan.id}>
                      <div className={styles.header}><FiMonitor aria-hidden />Pinjaman Aktif</div>
                      <div className={styles.body}>
                        <Link className={styles.cover} href={`/dashboard/koleksi/${loan.book.id}`} aria-label={`Lihat detail ${loan.book.title}`}>
                          <Image src={safeCoverUrl(loan.book.coverUrl)} alt={`Sampul ${loan.book.title}`} fill sizes="80px" unoptimized />
                        </Link>
                        <div className={styles.information}>
                          <h3>{loan.book.title}</h3>
                          <p className={styles.deadline}><FiClock aria-hidden />Akses sampai {formatDate(loan.dueAt)} WIB</p>
                          <p>Progres membaca</p>
                          <progress className={styles.progress} value={progress} max={100} aria-label={`Progres membaca ${loan.book.title}: ${progress}%`} />
                          <span className={styles.percentage}>{progress}%</span>
                          <div className={styles.actions}>
                            <Link className={styles.read} href={`/e-book/${loan.book.id}/baca`}>Baca E-Book</Link>
                            <button type="button" className={styles.secondary} disabled={Boolean(pendingKey)} onClick={() => void act(loan.bookId, "return", "E-Book berhasil dikembalikan.")}>{pendingKey === `${loan.bookId}:return` ? "Memproses..." : "Kembalikan E-Book"}</button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className={styles.section} aria-labelledby="ebook-antrean">
            <div className={styles.sectionHeading}>
              <div><FiList aria-hidden /><div><h2 id="ebook-antrean">Antrean Saya</h2><p>Posisi ditampilkan tanpa membuka identitas anggota lain.</p></div></div>
              <span>{queues.length}</span>
            </div>
            {!queues.length ? (
              <div className={styles.compactEmpty}>Anda tidak sedang menunggu antrean E-Book.</div>
            ) : (
              <div className={styles.grid}>
                {queues.map((queue) => {
                  const offered = queue.status === "DITAWARKAN";
                  return (
                    <article className={styles.card} key={queue.id}>
                      <div className={`${styles.header} ${offered ? styles.offerHeader : ""}`}><FiClock aria-hidden />{offered ? "Giliran Anda" : `Antrean #${queue.position ?? "-"}`}</div>
                      <div className={styles.body}>
                        <Link className={styles.cover} href={`/dashboard/koleksi/${queue.book.id}`} aria-label={`Lihat detail ${queue.book.title}`}>
                          <Image src={safeCoverUrl(queue.book.coverUrl)} alt={`Sampul ${queue.book.title}`} fill sizes="80px" unoptimized />
                        </Link>
                        <div className={styles.information}>
                          <h3>{queue.book.title}</h3>
                          {offered ? (
                            <p className={styles.offerText}>Prioritas Anda tersisa <strong>{remaining(queue.claimExpiresAt, now)}</strong>. Jika tidak diambil, giliran otomatis diteruskan.</p>
                          ) : (
                            <p>Posisi antrean saat ini: <strong>#{queue.position ?? "-"}</strong></p>
                          )}
                          <div className={styles.actions}>
                            {offered ? <button type="button" className={styles.read} disabled={Boolean(pendingKey)} onClick={() => void act(queue.bookId, "borrow", "E-Book berhasil dipinjam selama 7 hari.")}>{pendingKey === `${queue.bookId}:borrow` ? "Memproses..." : "Pinjam E-Book"}</button> : null}
                            <button type="button" className={styles.secondary} disabled={Boolean(pendingKey)} onClick={() => void act(queue.bookId, "queue/cancel", "Antrean E-Book berhasil dibatalkan.")}>{pendingKey === `${queue.bookId}:queue/cancel` ? "Memproses..." : "Batalkan Antrean"}</button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className={styles.section} aria-labelledby="ebook-pernah">
            <div className={styles.sectionHeading}>
              <div><FiMonitor aria-hidden /><div><h2 id="ebook-pernah">Pernah Dibaca</h2><p>Hanya E-Book yang reader-nya pernah benar-benar Anda buka.</p></div></div>
              <span>{visibleHistory.length}</span>
            </div>
            {!visibleHistory.length ? (
              <div className={styles.empty}>
                <FiMonitor size={32} aria-hidden />
                <h2>Belum ada E-Book yang pernah dibaca.</h2>
                <p>Pinjam E-Book dari katalog lalu buka reader untuk menyimpan progres membaca Anda.</p>
                <Link className={styles.read} href="/dashboard/koleksi?type=EBOOK">Jelajahi E-Book</Link>
              </div>
            ) : (
              <div className={styles.grid}>
                {visibleHistory.map((ebook) => {
                  const progress = progressValue(ebook.progress);
                  return (
                    <article className={styles.card} key={ebook.id} data-ebook-id={ebook.book.id}>
                      <div className={styles.header}><FiMonitor aria-hidden />Pernah Dibaca</div>
                      <div className={styles.body}>
                        <Link className={styles.cover} href={`/dashboard/koleksi/${ebook.book.id}`} aria-label={`Lihat detail ${ebook.book.title}`}>
                          <Image src={safeCoverUrl(ebook.book.coverUrl)} alt={`Sampul ${ebook.book.title}`} fill sizes="80px" unoptimized />
                        </Link>
                        <div className={styles.information}>
                          <h3>{ebook.book.title}</h3>
                          <p>Progres terakhir</p>
                          <progress className={styles.progress} value={progress} max={100} aria-label={`Progres membaca ${ebook.book.title}: ${progress}%`} />
                          <span className={styles.percentage}>{progress}%</span>
                          <div className={styles.actions}>
                            {ebook.circulation.state === "AVAILABLE" ? (
                              <button type="button" className={styles.read} disabled={Boolean(pendingKey)} onClick={() => void act(ebook.bookId, "borrow", "E-Book berhasil dipinjam kembali selama 7 hari.")}>{pendingKey === `${ebook.bookId}:borrow` ? "Memproses..." : "Pinjam Lagi"}</button>
                            ) : (
                              <Link className={styles.secondaryLink} href={`/dashboard/koleksi/${ebook.book.id}`}>Lihat Status E-Book</Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
