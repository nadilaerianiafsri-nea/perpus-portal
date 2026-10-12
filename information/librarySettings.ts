import "server-only";

import { API_URL } from "@/catalog/serverApi";
import { serviceInfo } from "@/shared/serviceInfo.cjs";

export type PublicLibrarySettings = {
  libraryName: string;
  address: string;
  serviceHours: string;
  phoneE164: string;
  reservationDurationHours: number;
  loanDurationDays: number;
  extensionDurationDays: number;
  maxExtensions: number | null;
};

export const defaultLibrarySettings: PublicLibrarySettings = Object.freeze({
  libraryName: "Perpustakaan Kementerian Hukum Riau",
  address: serviceInfo.address,
  serviceHours: serviceInfo.hours,
  phoneE164: "+628116904422",
  reservationDurationHours: 24,
  loanDurationDays: 7,
  extensionDurationDays: 7,
  maxExtensions: null,
});

export async function getLibrarySettings(): Promise<PublicLibrarySettings> {
  try {
    const response = await fetch(`${API_URL}/members/public/settings`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { ...defaultLibrarySettings };
    const value = (await response.json()) as Partial<PublicLibrarySettings>;
    if (
      typeof value.libraryName !== "string" ||
      typeof value.address !== "string" ||
      typeof value.serviceHours !== "string" ||
      typeof value.phoneE164 !== "string" ||
      typeof value.reservationDurationHours !== "number" ||
      typeof value.loanDurationDays !== "number" ||
      typeof value.extensionDurationDays !== "number" ||
      !(value.maxExtensions === null || typeof value.maxExtensions === "number")
    ) {
      return { ...defaultLibrarySettings };
    }
    return value as PublicLibrarySettings;
  } catch {
    return { ...defaultLibrarySettings };
  }
}

export function formatPublicPhone(phoneE164: string) {
  const digits = phoneE164.replace(/\D/g, "");
  if (!digits.startsWith("62") || digits.length < 10) return phoneE164;
  const local = digits.slice(2);
  const first = local.slice(0, 3);
  const middle = local.slice(3, 7);
  const last = local.slice(7);
  return [`+62`, first, middle, last]
    .filter(Boolean)
    .join(" ")
    .replace(` ${middle} ${last}`, ` ${middle}-${last}`);
}
