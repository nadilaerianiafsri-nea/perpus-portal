"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";

import {
  adminMemberApiMessage,
  formatAdminMemberDate,
  memberTypeLabel,
  type AdminMembersResponse,
} from "./adminMembers";
import styles from "./AdminMembers.module.css";

type MemberTypeFilter = "ALL" | "UMUM" | "MAHASISWA" | "PEGAWAI";
type VerificationFilter = "ALL" | "VERIFIED" | "UNVERIFIED";

const emptyResult: AdminMembersResponse = {
  stats: {
    total: 0,
    umum: 0,
    mahasiswa: 0,
    pegawai: 0,
  },
  data: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
};

export default function AdminMembersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [memberType, setMemberType] = useState<MemberTypeFilter>("ALL");
  const [verification, setVerification] = useState<VerificationFilter>("ALL");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<AdminMembersResponse>(emptyResult);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changingId, setChangingId] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const load = useCallback(async () => {
    void revision;

    setLoading(true);
    setError("");

    const query = new URLSearchParams({
      memberType,
      verified: verification,
      page: String(page),
      limit: "20",
    });

    if (search) {
      query.set("search", search);
    }

    try {
      const response = await fetch(`/api/members/admin/members?${query}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          await adminMemberApiMessage(
            response,
            "Data keanggotaan belum dapat dimuat.",
          ),
        );
      }

      const payload = (await response.json()) as AdminMembersResponse;

      if (page > payload.meta.totalPages) {
        setPage(payload.meta.totalPages);
        return;
      }

      setResult(payload);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Data keanggotaan belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [memberType, page, revision, search, verification]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus(
    id: number,
    currentStatus: boolean,
    memberName: string,
  ) {
    const nextStatus = !currentStatus;

    const approved = window.confirm(
      nextStatus
        ? `Aktifkan kembali akun ${memberName}?`
        : `Nonaktifkan akun ${memberName}? Anggota tidak dapat masuk ke akun sampai diaktifkan kembali.`,
    );

    if (!approved) {
      return;
    }

    setChangingId(id);
    setError("");

    try {
      const response = await fetch(`/api/members/admin/members/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: nextStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await adminMemberApiMessage(response, "Status anggota gagal diubah."),
        );
      }

      setRevision((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Status anggota gagal diubah.",
      );
    } finally {
      setChangingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <div>
          <h1>Keanggotaan</h1>
          <p>Kelola seluruh anggota perpustakaan dalam satu halaman.</p>
        </div>
      </header>

      <section
        className={styles.stats}
        aria-label="Statistik anggota hasil filter"
      >
        <article className={`${styles.statCard} ${styles.statNavy}`}>
          <span>TOTAL ANGGOTA</span>
          <strong>{result.stats.total}</strong>
        </article>

        <article className={`${styles.statCard} ${styles.statBlue}`}>
          <span>MASYARAKAT UMUM</span>
          <strong>{result.stats.umum}</strong>
        </article>

        <article className={`${styles.statCard} ${styles.statYellow}`}>
          <span>MAHASISWA</span>
          <strong>{result.stats.mahasiswa}</strong>
        </article>

        <article className={`${styles.statCard} ${styles.statGreen}`}>
          <span>PEGAWAI INTERNAL</span>
          <strong>{result.stats.pegawai}</strong>
        </article>
      </section>

      <section className={styles.filterCard}>
        <label className={styles.searchBox}>
          <FiSearch aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Cari nama, email, atau WhatsApp..."
            aria-label="Cari anggota"
          />
        </label>

        <label className={styles.selectField}>
          <span>Jenis Anggota</span>
          <select
            value={memberType}
            onChange={(event) => {
              setMemberType(event.target.value as MemberTypeFilter);
              setPage(1);
            }}
          >
            <option value="ALL">Semua Jenis</option>
            <option value="UMUM">Masyarakat Umum</option>
            <option value="MAHASISWA">Mahasiswa</option>
            <option value="PEGAWAI">Pegawai Internal</option>
          </select>
        </label>

        <label className={styles.selectField}>
          <span>Status Verifikasi</span>
          <select
            value={verification}
            onChange={(event) => {
              setVerification(event.target.value as VerificationFilter);
              setPage(1);
            }}
          >
            <option value="ALL">Semua Verifikasi</option>
            <option value="VERIFIED">Terverifikasi</option>
            <option value="UNVERIFIED">Belum Terverifikasi</option>
          </select>
        </label>
      </section>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
          >
            Coba Lagi
          </button>
        </div>
      ) : null}

      <section className={styles.tableCard} aria-busy={loading}>
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>NAMA</th>
                <th>JENIS</th>
                <th>EMAIL</th>
                <th>WHATSAPP</th>
                <th>VERIFIKASI</th>
                <th>PINJAMAN</th>
                <th>OVERDUE</th>
                <th>TERDAFTAR</th>
                <th>AKSI</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className={styles.stateCell}>
                    Memuat data keanggotaan...
                  </td>
                </tr>
              ) : result.data.length ? (
                result.data.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <strong>{member.name}</strong>
                        <small
                          className={
                            member.isActive
                              ? styles.accountActive
                              : styles.accountInactive
                          }
                        >
                          {member.isActive ? "Aktif" : "Nonaktif"}
                        </small>
                      </div>
                    </td>

                    <td>
                      <span className={styles.typePill}>
                        {memberTypeLabel(member.memberType)}
                      </span>
                    </td>

                    <td className={styles.emailCell}>{member.email}</td>

                    <td>{member.whatsapp || "-"}</td>

                    <td>
                      <span
                        className={`${styles.verifyPill} ${
                          member.emailVerified
                            ? styles.verified
                            : styles.unverified
                        }`}
                      >
                        {member.emailVerified ? "Terverifikasi" : "Belum"}
                      </span>
                    </td>

                    <td>{member.activeLoans}</td>

                    <td>
                      {member.overdue > 0 ? (
                        <span className={styles.overduePill}>
                          {member.overdue}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>

                    <td>{formatAdminMemberDate(member.createdAt)}</td>

                    <td>
                      <div className={styles.actions}>
                        <Link
                          href={`/admin/keanggotaan/${member.id}`}
                          className={styles.detailAction}
                        >
                          Detail
                        </Link>

                        <Link
                          href={`/admin/keanggotaan/${member.id}/edit`}
                          className={styles.editAction}
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          className={
                            member.isActive
                              ? styles.disableAction
                              : styles.enableAction
                          }
                          disabled={changingId === member.id}
                          onClick={() =>
                            void toggleStatus(
                              member.id,
                              member.isActive,
                              member.name,
                            )
                          }
                        >
                          {changingId === member.id
                            ? "Memproses..."
                            : member.isActive
                              ? "Nonaktifkan"
                              : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className={styles.stateCell}>
                    Tidak ada anggota yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.mobileList}>
          {loading ? (
            <div className={styles.mobileState}>Memuat data keanggotaan...</div>
          ) : result.data.length ? (
            result.data.map((member) => (
              <article key={member.id} className={styles.mobileMemberCard}>
                <div className={styles.mobileCardHeading}>
                  <div>
                    <strong>{member.name}</strong>
                    <small>{member.email}</small>
                  </div>

                  <span
                    className={
                      member.isActive
                        ? styles.accountActive
                        : styles.accountInactive
                    }
                  >
                    {member.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                <dl className={styles.mobileInfo}>
                  <div>
                    <dt>Jenis</dt>
                    <dd>{memberTypeLabel(member.memberType)}</dd>
                  </div>
                  <div>
                    <dt>WhatsApp</dt>
                    <dd>{member.whatsapp || "-"}</dd>
                  </div>
                  <div>
                    <dt>Verifikasi</dt>
                    <dd>
                      {member.emailVerified
                        ? "Terverifikasi"
                        : "Belum Terverifikasi"}
                    </dd>
                  </div>
                  <div>
                    <dt>Pinjaman</dt>
                    <dd>{member.activeLoans}</dd>
                  </div>
                  <div>
                    <dt>Overdue</dt>
                    <dd>{member.overdue}</dd>
                  </div>
                  <div>
                    <dt>Terdaftar</dt>
                    <dd>{formatAdminMemberDate(member.createdAt)}</dd>
                  </div>
                </dl>

                <div className={styles.mobileActions}>
                  <Link
                    href={`/admin/keanggotaan/${member.id}`}
                    className={styles.detailAction}
                  >
                    Detail
                  </Link>

                  <Link
                    href={`/admin/keanggotaan/${member.id}/edit`}
                    className={styles.editAction}
                  >
                    Edit
                  </Link>

                  <button
                    type="button"
                    className={
                      member.isActive
                        ? styles.disableAction
                        : styles.enableAction
                    }
                    disabled={changingId === member.id}
                    onClick={() =>
                      void toggleStatus(member.id, member.isActive, member.name)
                    }
                  >
                    {changingId === member.id
                      ? "Memproses..."
                      : member.isActive
                        ? "Nonaktifkan"
                        : "Aktifkan"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className={styles.mobileState}>
              Tidak ada anggota yang sesuai dengan pencarian atau filter.
            </div>
          )}
        </div>

        {!loading && result.meta.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Halaman data anggota">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Sebelumnya
            </button>

            <span>
              Halaman {result.meta.page} dari {result.meta.totalPages}
            </span>

            <button
              type="button"
              disabled={page >= result.meta.totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(result.meta.totalPages, current + 1),
                )
              }
            >
              Berikutnya
            </button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
