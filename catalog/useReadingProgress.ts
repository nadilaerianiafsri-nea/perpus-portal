"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { memberRequest } from "@/members/api";
import type { MemberEBook } from "@/members/types";

type Position = { progress: number; lastPosition: number };
const saveFailed = "Posisi baca belum tersimpan. Silakan coba lagi.";

export function useReadingProgress(bookId: number) {
  const [reading, setReading] = useState<MemberEBook | null>(null);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const revision = useRef(0), ready = useRef(false), blocked = useRef(false);
  const highest = useRef(0);
  const desired = useRef<Position | null>(null), writing = useRef(false);
  const alive = useRef(true), leaving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentWrite = useRef<Promise<boolean> | null>(null);

  const flush = useCallback((): Promise<boolean> => {
    if (writing.current) return currentWrite.current ?? Promise.resolve(false);
    if (!ready.current || blocked.current) return Promise.resolve(false);
    writing.current = true;
    if (alive.current) setSaving(true);
    const work = (async () => {
      try {
        while (desired.current) {
          const position = desired.current; desired.current = null;
          try {
            const response = await fetch(`/api/members/me/ebooks/${bookId}/progress`, {
              method: "PATCH", credentials: "same-origin", cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...position, expectedVersion: revision.current }),
              keepalive: leaving.current, signal: AbortSignal.timeout(12000),
            });
            const result = await response.json();
            if (response.status === 401) window.location.replace(`/login?next=${encodeURIComponent(`/e-book/${bookId}/baca`)}`);
            if (response.status === 409) blocked.current = true;
            if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : saveFailed);
            revision.current = result.ebook.progressVersion;
            highest.current = Math.max(highest.current, result.ebook.progress);
            if (alive.current) { setProgress(value => Math.max(value, result.ebook.progress)); setSaveError(""); }
          } catch (failure) {
            desired.current ??= position;
            if (alive.current) setSaveError(failure instanceof Error ? failure.message : saveFailed);
            return false;
          }
        }
        return true;
      } finally { writing.current = false; currentWrite.current = null; if (alive.current) setSaving(false); }
    })();
    currentWrite.current = work;
    return work;
  }, [bookId]);

  const record = useCallback((position: Position) => {
    if (!ready.current || blocked.current) return;
    highest.current = Math.max(highest.current, position.progress);
    desired.current = { ...position, progress: highest.current };
    setSaving(true);
    setProgress(value => Math.max(value, position.progress));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 600);
  }, [flush]);

  useEffect(() => {
    alive.current = true;
    let active = true;
    void memberRequest<{ ebook: MemberEBook }>(`ebooks/${bookId}/open`, { method: "POST" }).then(({ ebook }) => {
      if (!active) return;
      revision.current = ebook.progressVersion; ready.current = true;
      highest.current = ebook.progress;
      setReading(ebook); setProgress(ebook.progress);
    }).catch(() => { if (active) setError("Riwayat bacaan belum dapat dimuat. Silakan coba lagi."); });
    const hide = () => { leaving.current = true; if (timer.current) clearTimeout(timer.current); void flush(); };
    const visibility = () => { if (document.visibilityState === "hidden") hide(); else leaving.current = false; };
    window.addEventListener("pagehide", hide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false; hide(); alive.current = false;
      window.removeEventListener("pagehide", hide);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [bookId, flush]);
  return { reading, progress, error, saveError, saving, record, flush };
}
