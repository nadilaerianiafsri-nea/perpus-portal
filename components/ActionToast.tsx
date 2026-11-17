"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ActionToast.module.css";

type Notice = { id: number; kind: "success" | "error"; message: string };

type NoticeEvent = CustomEvent<{ kind: Notice["kind"]; message: string }>;

// Used only when a page needs to report an error from a non-mutating request.
export function showActionToast(kind: Notice["kind"], message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("perpus:action-toast", { detail: { kind, message } }));
}

function successMessage(path: string, method: string) {
  if (/\/api\/members\/me\/notifications\//.test(path)) return "Notifikasi berhasil ditandai dibaca.";
  if (/\/api\/members\/admin\/operations\/notifications\//.test(path)) return "Status notifikasi berhasil diperbarui.";
  if (/\/api\/members\/me\/reservations$/.test(path)) return "Reservasi berhasil dibuat.";
  if (/\/reservations\/\d+\/cancel$/.test(path)) return "Reservasi berhasil dibatalkan.";
  if (/\/loans\/\d+\/extend$/.test(path)) return "Masa pinjam berhasil diperpanjang.";
  if (/\/loans\/\d+\/lost-report$/.test(path)) return "Laporan kehilangan berhasil dikirim.";
  if (/\/ebooks\/\d+\/queue\/cancel$/.test(path)) return "Antrean E-Book berhasil dibatalkan.";
  if (/\/ebooks\/\d+\/queue$/.test(path)) return "Berhasil masuk antrean E-Book.";
  if (/\/ebooks\/\d+\/borrow$/.test(path)) return "E-Book berhasil dipinjam.";
  if (/\/ebooks\/\d+\/return$/.test(path)) return "E-Book berhasil dikembalikan.";
  if (/\/api\/members\/admin\/operations\/settings$/.test(path)) return "Pengaturan layanan berhasil disimpan.";
  if (/\/api\/members\/admin\/public-content$/.test(path)) return "Konten publik berhasil disimpan.";
  if (/\/api\/admin\/books(?:\/\d+)?$/.test(path)) return method === "POST" ? "Buku berhasil ditambahkan." : "Data buku berhasil diperbarui.";
  if (/\/api\/admin\/ebooks(?:\/\d+)?$/.test(path)) return method === "POST" ? "E-Book berhasil ditambahkan." : "E-Book berhasil diperbarui.";
  if (/\/api\/admin\/grants(?:\/\d+)?$/.test(path)) return method === "POST" ? "Hibah berhasil ditambahkan." : "Hibah berhasil diperbarui.";
  if (/\/api\/members\/me\/profile$/.test(path)) return "Profil berhasil diperbarui.";
  if (/\/api\/auth\/login$/.test(path)) return "Berhasil masuk.";
  if (/\/api\/auth\/logout$/.test(path)) return "Berhasil keluar.";
  return method === "DELETE" ? "Data berhasil dihapus." : "Perubahan berhasil disimpan.";
}

async function failureMessage(response: Response): Promise<string> {
  try {
    const body = await response.clone().json() as { message?: unknown };
    if (typeof body?.message === "string" && body.message.trim()) return body.message;
    if (Array.isArray(body?.message)) {
      const messages = body.message.filter((message): message is string => typeof message === "string");
      if (messages.length) return messages.join(". ");
    }
  } catch { /* API response may not be JSON. */ }
  if (response.status === 401) return "Sesi login berakhir. Silakan masuk kembali.";
  if (response.status === 403) return "Akses tidak diizinkan. Periksa hak akses Anda.";
  return "Permintaan gagal diproses. Silakan coba lagi.";
}

export default function ActionToast() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const onNotice = (event: Event) => {
      const detail = (event as NoticeEvent).detail;
      if (!detail || (detail.kind !== "success" && detail.kind !== "error")) return;
      setNotice({ id: ++nextId.current, kind: detail.kind, message: String(detail.message).slice(0, 400) });
    };
    window.addEventListener("perpus:action-toast", onNotice);

    // Native required/min/max validation can fail before a fetch is attempted.
    let lastInvalidNotice = 0;
    const onInvalid = (event: Event) => {
      if (!(event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement ||
            event.target instanceof HTMLSelectElement)) return;
      if (!event.target.closest("form")) return;
      const now = Date.now();
      if (now - lastInvalidNotice < 300) return;
      lastInvalidNotice = now;
      showActionToast("error", "Periksa kolom yang belum lengkap atau belum sesuai format.");
    };
    document.addEventListener("invalid", onInvalid, true);

    const previousFetch = window.fetch;
    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const [input, init] = args;
      const method = String(init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      let url: URL;
      try { url = new URL(requestUrl, window.location.origin); }
      catch { return previousFetch.apply(window, args); }
      const mutation = ["POST", "PATCH", "PUT", "DELETE"].includes(method)
        && url.origin === window.location.origin
        && url.pathname.startsWith("/api/")
        // The E-Book reader auto-saves progress; never show repeated popups.
        && !/\/ebooks\/\d+\/progress$/.test(url.pathname);
      try {
        const response = await previousFetch.apply(window, args);
        if (mutation) {
          // Upload is an internal step of saving a book: show one success popup
          // after the book itself is saved, not a premature upload success.
          if (response.ok) {
            if (!url.pathname.startsWith("/api/admin/uploads/")) {
              showActionToast("success", successMessage(url.pathname, method));
            }
          } else {
            void failureMessage(response).then(message => showActionToast("error", message));
          }
        }
        return response;
      } catch (error) {
        if (mutation) showActionToast("error", "Layanan gagal dihubungi. Periksa koneksi dan coba lagi.");
        throw error;
      }
    };
    return () => {
      window.fetch = previousFetch;
      window.removeEventListener("perpus:action-toast", onNotice);
      document.removeEventListener("invalid", onInvalid, true);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(current => current?.id === notice.id ? null : current), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;
  return (
    <div key={notice.id}
      className={`${styles.toast} ${notice.kind === "success" ? styles.success : styles.error}`}
      role={notice.kind === "error" ? "alert" : "status"}
      aria-live={notice.kind === "error" ? "assertive" : "polite"}>
      <div className={styles.statusMark} aria-hidden="true" />
      <div className={styles.content}>
        <strong>{notice.kind === "success" ? "Berhasil" : "Gagal"}</strong>
        <p>{notice.message}</p>
      </div>
      <button type="button" className={styles.close} onClick={() => setNotice(null)} aria-label="Tutup notifikasi">Tutup</button>
      <div className={styles.lifetime} aria-hidden="true" />
    </div>
  );
}
