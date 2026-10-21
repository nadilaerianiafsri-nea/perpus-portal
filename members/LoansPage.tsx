"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FiAlertTriangle, FiBookOpen, FiCheckCircle } from "react-icons/fi";
import StatCard from "@/components/StatCard";
import { memberRequest, useMemberResource } from "./api";
import { useMember } from "./MemberContext";
import { ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import LoanCard from "./LoanCard";
import LoanDialog, { type LoanDialogSelection } from "./LoanDialog";
import HistoryPage from "./HistoryPage";
import { loanState } from "./format";
import type { HistoryItem, Loan } from "./types";
import shared from "./Members.module.css";
import styles from "./Loans.module.css";

type LoanView = "current" | "history";

function viewFromHash(hash: string): LoanView {
  return hash === "#riwayat-peminjaman" ? "history" : "current";
}

export default function LoansPage() {
  const resource = useMemberResource<{ loans: Loan[] }>("loans");
  const historyResource = useMemberResource<{ history: HistoryItem[] }>("loans/history");
  const { refresh } = useMember();
  const [busy, setBusy] = useState<number | null>(null);
  const pending = useRef(false);
  const [selection, setSelection] = useState<LoanDialogSelection | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const [view, setView] = useState<LoanView>("current");

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncView = () => setView(viewFromHash(window.location.hash));
    syncView();
    window.addEventListener("hashchange", syncView);
    window.addEventListener("popstate", syncView);
    return () => {
      window.removeEventListener("hashchange", syncView);
      window.removeEventListener("popstate", syncView);
    };
  }, []);

  function selectView(nextView: LoanView) {
    setView(nextView);
    const base = `${window.location.pathname}${window.location.search}`;
    const href = nextView === "history" ? `${base}#riwayat-peminjaman` : base;
    window.history.pushState(null, "", href);
  }

  function open(kind: LoanDialogSelection["kind"], loan: Loan) {
    setActionError("");
    setNotice("");
    setSelection({ kind, loan });
  }

  async function extend() {
    if (pending.current || selection?.kind !== "extend") return;
    const loan = selection.loan;
    pending.current = true;
    setBusy(loan.id);
    setActionError("");
    setNotice("");
    try {
      await memberRequest(`loans/${loan.id}/extend`, {
        method: "POST",
        body: JSON.stringify({ expectedDueAt: loan.dueAt }),
      });
      setSelection(null);
      setNotice("Masa pinjam berhasil diperpanjang 7 hari.");
      await Promise.all([resource.reload(), refresh()]);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Perpanjangan belum berhasil. Silakan coba lagi.",
      );
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }

  const urgency = (loan: Loan) =>
    loan.status === "HILANG"
      ? 3
      : loanState(loan, now ?? undefined).tone === "red"
        ? 0
        : loanState(loan, now ?? undefined).tone === "orange"
          ? 1
          : 2;

  const loans = [...(resource.data?.loans ?? [])]
    .filter((loan) => loan.status !== "DIKEMBALIKAN")
    .sort(
      (a, b) => urgency(a) - urgency(b) || Date.parse(a.dueAt) - Date.parse(b.dueAt),
    );

  const history = historyResource.data?.history ?? [];
  const overdueCount =
    now === null
      ? 0
      : loans.filter(
          (loan) => loan.status === "AKTIF" && Date.parse(loan.dueAt) <= now,
        ).length;
  const readBookCount = new Set(
    history
      .filter(
        (item) => item.sourceType === "LOAN" && item.status === "DIKEMBALIKAN",
      )
      .map((item) => item.bookId),
  ).size;

  return (
    <div className={shared.pageStack}>
      <PageHeading title="Pinjaman Saya" />

      <section className={styles.statsGrid} aria-label="Statistik pinjaman saya">
        <StatCard label="Sedang Dipinjam" value={resource.loading ? "–" : loans.length} tone="primary" icon={<FiBookOpen />} />
        <StatCard label="Jatuh Tempo" value={resource.loading || now === null ? "–" : overdueCount} tone="danger" icon={<FiAlertTriangle />} />
        <StatCard label="Sudah Dibaca" value={historyResource.loading ? "–" : readBookCount} tone="success" icon={<FiCheckCircle />} />
      </section>

      <div className={styles.viewTabs} role="tablist" aria-label="Tampilan pinjaman">
        <button
          data-button="ghost"
          type="button"
          role="tab"
          aria-selected={view === "current"}
          className={`${styles.viewTab} ${view === "current" ? styles.viewTabActive : ""}`}
          onClick={() => selectView("current")}
        >
          Pinjaman Saya
        </button>
        <button
          data-button="ghost"
          type="button"
          role="tab"
          aria-selected={view === "history"}
          className={`${styles.viewTab} ${view === "history" ? styles.viewTabActive : ""}`}
          onClick={() => selectView("history")}
        >
          Riwayat Pinjaman
        </button>
      </div>

      {notice ? (
        <p className={shared.success} role="status">
          {notice}
        </p>
      ) : null}

      {view === "current" ? (
        <section className={styles.viewPanel} aria-label="Pinjaman saya">
          {resource.loading || now === null ? (
            <LoadingCards />
          ) : resource.error ? (
            <ErrorState
              message="Data pinjaman belum dapat dimuat. Silakan coba lagi."
              retry={resource.reload}
            />
          ) : !loans.length ? (
            <div className={styles.empty}>
              <FiBookOpen size={32} aria-hidden />
              <h2>Belum ada buku yang sedang dipinjam.</h2>
              <p>Buku yang sudah Anda ambil dari perpustakaan akan muncul di sini.</p>
              <Link data-button="primary" href="/dashboard/koleksi" className={styles.extendButton}>
                Cari Koleksi
              </Link>
            </div>
          ) : (
            <div className={styles.list}>
              {loans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  now={now}
                  busy={busy !== null}
                  extending={busy === loan.id}
                  onExtend={() => open("extend", loan)}
                  onReplacement={() => open("replacement", loan)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className={styles.viewPanel}>
          <HistoryPage
            history={history}
            loading={historyResource.loading}
            error={historyResource.error}
            retry={historyResource.reload}
          />
        </div>
      )}

      <LoanDialog
        selection={selection}
        pending={busy !== null}
        error={actionError}
        onDismiss={() => {
          if (!pending.current) setSelection(null);
        }}
        onConfirm={extend}
      />
    </div>
  );
}
