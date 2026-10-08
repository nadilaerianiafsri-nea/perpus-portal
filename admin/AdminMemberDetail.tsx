"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  adminMemberApiMessage,
  formatAdminMemberDate,
  formatAdminMemberDateTime,
  memberTypeLabel,
  type AdminMemberDetailResponse,
} from "./adminMembers";
import styles from "./AdminMembers.module.css";

type Props = {
  id: string;
};

export default function AdminMemberDetail({ id }: Props) {
  const [data, setData] = useState<AdminMemberDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/members/admin/members/${id}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          await adminMemberApiMessage(
            response,
            "Detail anggota belum dapat dimuat.",
          ),
        );
      }

      setData((await response.json()) as AdminMemberDetailResponse);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Detail anggota belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus() {
    if (!data || changingStatus) {
      return;
    }

    const next = !data.member.isActive;

    const approved = window.confirm(
      next
        ? `Aktifkan kembali akun ${data.member.name}?`
        : `Nonaktifkan akun ${data.member.name}? Anggota tidak akan dapat masuk sampai diaktifkan kembali.`,
    );

    if (!approved) {
      return;
    }

    setChangingStatus(true);
    setError("");

    try {
      const response = await fetch(
        `/api/members/admin/members/${data.member.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: next,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await adminMemberApiMessage(
            response,
            "Status anggota gagal diubah.",
          ),
        );
      }

      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Status anggota gagal diubah.",
      );
    } finally {
      setChangingStatus(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.statePanel}>
        Memuat detail anggota...
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.statePanel}>
        <p>{error || "Anggota tidak ditemukan."}</p>
        <Link href="/admin/keanggotaan">Kembali ke Keanggotaan</Link>
      </div>
    );
  }

  const { member, summary } = data;

  return (
    <div className={styles.detailPage}>
      <header className={styles.detailHeading}>
        <div>
          <div className={styles.localBreadcrumb}>
            <Link href="/admin/keanggotaan">Keanggotaan</Link>
            <span>/</span>
            <strong>Detail Anggota</strong>
          </div>

          <h1>{member.name}</h1>
          <p>{member.email}</p>
        </div>

        <div className={styles.headingActions}>
          <Link
            href={`/admin/keanggotaan/${member.id}/edit`}
            className={styles.primaryButton}
          >
            Edit Anggota
          </Link>

          <button
            type="button"
            className={
              member.isActive
                ? styles.dangerButton
                : styles.successButton
            }
            disabled={changingStatus}
            onClick={() => void toggleStatus()}
          >
            {changingStatus
              ? "Memproses..."
              : member.isActive
                ? "Nonaktifkan"
                : "Aktifkan"}
          </button>
        </div>
      </header>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      <section className={styles.detailSummary}>
        <article>
          <span>PINJAMAN AKTIF</span>
          <strong>{summary.activeLoans}</strong>
        </article>

        <article>
          <span>OVERDUE</span>
          <strong>{summary.overdue}</strong>
        </article>

        <article>
          <span>RESERVASI AKTIF</span>
          <strong>{summary.activeReservations}</strong>
        </article>

        <article>
          <span>RIWAYAT SELESAI</span>
          <strong>{summary.completedLoans}</strong>
        </article>
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.panel}>
          <h2>Informasi Anggota</h2>

          <dl className={styles.infoList}>
            <div>
              <dt>Nama</dt>
              <dd>{member.name}</dd>
            </div>

            <div>
              <dt>Email</dt>
              <dd>{member.email}</dd>
            </div>

            <div>
              <dt>Jenis Anggota</dt>
              <dd>{memberTypeLabel(member.memberType)}</dd>
            </div>

            <div>
              <dt>Status Akun</dt>
              <dd>
                <span
                  className={
                    member.isActive
                      ? styles.accountActive
                      : styles.accountInactive
                  }
                >
                  {member.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </dd>
            </div>

            <div>
              <dt>Status Verifikasi</dt>
              <dd>
                {member.emailVerified
                  ? "Terverifikasi"
                  : "Belum Terverifikasi"}
              </dd>
            </div>

            <div>
              <dt>Tanggal Terdaftar</dt>
              <dd>{formatAdminMemberDate(member.createdAt)}</dd>
            </div>
          </dl>
        </article>

        <article className={styles.panel}>
          <h2>Profil Anggota</h2>

          <dl className={styles.infoList}>
            <div>
              <dt>WhatsApp</dt>
              <dd>{member.profile?.whatsapp || "-"}</dd>
            </div>

            <div>
              <dt>Nomor Identitas</dt>
              <dd>{member.profile?.identityNumber || "-"}</dd>
            </div>

            <div>
              <dt>Alamat</dt>
              <dd>{member.profile?.address || "-"}</dd>
            </div>

            {member.memberType === "MAHASISWA" ? (
              <div>
                <dt>Universitas</dt>
                <dd>{member.profile?.universityName || "-"}</dd>
              </div>
            ) : null}

            {member.memberType === "PEGAWAI" ? (
              <div>
                <dt>Unit Kerja</dt>
                <dd>{member.profile?.workUnit || "-"}</dd>
              </div>
            ) : null}
          </dl>
        </article>
      </section>

      <section className={styles.panel}>
        <h2>Pinjaman Aktif</h2>

        {data.activeLoans.length ? (
          <div className={styles.transactionList}>
            {data.activeLoans.map((loan) => {
              const overdue =
                loan.status === "AKTIF" &&
                new Date(loan.dueAt).getTime() < Date.now();

              return (
                <article key={loan.id} className={styles.transactionRow}>
                  <div>
                    <strong>{loan.book.title}</strong>
                    <small>
                      {loan.book.code} · Eksemplar {loan.copy.code}
                    </small>
                  </div>

                  <div className={styles.transactionMeta}>
                    <span>
                      Dipinjam {formatAdminMemberDate(loan.borrowedAt)}
                    </span>
                    <strong className={overdue ? styles.overdueText : ""}>
                      {loan.status === "HILANG"
                        ? "Buku Hilang"
                        : `Jatuh tempo ${formatAdminMemberDateTime(
                            loan.dueAt,
                          )}`}
                    </strong>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyText}>
            Tidak ada pinjaman aktif.
          </p>
        )}
      </section>

      <section className={styles.panel}>
        <h2>Reservasi Aktif</h2>

        {data.activeReservations.length ? (
          <div className={styles.transactionList}>
            {data.activeReservations.map((reservation) => (
              <article
                key={reservation.id}
                className={styles.transactionRow}
              >
                <div>
                  <strong>{reservation.book.title}</strong>
                  <small>
                    {reservation.book.code} · Eksemplar{" "}
                    {reservation.copy.code}
                  </small>
                </div>

                <div className={styles.transactionMeta}>
                  <span>
                    Diajukan{" "}
                    {formatAdminMemberDateTime(reservation.createdAt)}
                  </span>
                  <strong>
                    Batas{" "}
                    {formatAdminMemberDateTime(reservation.expiresAt)}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>
            Tidak ada reservasi aktif.
          </p>
        )}
      </section>

      <section className={styles.panel}>
        <h2>Riwayat Peminjaman</h2>

        {data.history.length ? (
          <div className={styles.transactionList}>
            {data.history.map((loan) => (
              <article key={loan.id} className={styles.transactionRow}>
                <div>
                  <strong>{loan.book.title}</strong>
                  <small>
                    {loan.book.code} · Eksemplar {loan.copy.code}
                  </small>
                </div>

                <div className={styles.transactionMeta}>
                  <span>
                    Dipinjam {formatAdminMemberDate(loan.borrowedAt)}
                  </span>
                  <strong>
                    Dikembalikan{" "}
                    {formatAdminMemberDate(loan.returnedAt)}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>
            Belum ada riwayat peminjaman selesai.
          </p>
        )}
      </section>
    </div>
  );
}