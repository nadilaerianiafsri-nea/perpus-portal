"use client";

import { createContext, useContext } from "react";
import type { CurrentUser } from "@/auth/serverAuth";
import type { MemberSummary } from "./types";

export type MemberContextValue = {
  user: CurrentUser; summary: MemberSummary | null; loading: boolean; error: string; refresh: () => Promise<void>;
};
export const MemberContext = createContext<MemberContextValue | null>(null);
export function useMember() {
  const value = useContext(MemberContext);
  if (!value) throw new Error("Area anggota belum tersedia.");
  return value;
}
