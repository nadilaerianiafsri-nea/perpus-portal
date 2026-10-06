"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export async function memberRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/members/me/${path}`, {
    ...options, cache: "no-store", credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json().catch(() => null);
  if (response.status === 401) {
    window.location.replace("/login");
    throw new Error("Silakan masuk kembali untuk melanjutkan.");
  }
  if (!response.ok) throw new Error(typeof data?.message === "string" ? data.message : "Data belum dapat dimuat. Silakan coba lagi.");
  return data as T;
}

export function useMemberResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const load = useCallback(() => {
    const request = ++sequence.current;
    return memberRequest<T>(path).then(result => {
      if (sequence.current === request) setData(result);
    }).catch(failure => {
      if (sequence.current === request) setError(failure instanceof Error ? failure.message : "Data belum dapat dimuat. Silakan coba lagi.");
    }).finally(() => {
      if (sequence.current === request) setLoading(false);
    });
  }, [path]);
  const reload = useCallback(async () => { setLoading(true); setError(""); await load(); }, [load]);
  useEffect(() => { void load(); return () => { sequence.current += 1; }; }, [load]);
  return { data, loading, error, reload, update: setData };
}
