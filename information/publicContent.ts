import "server-only";

import { API_URL } from "@/catalog/serverApi";
import type { PublicLibrarySettings } from "./librarySettings";
import {
  defaultPublicContent,
  type PublicContent,
} from "./publicContentTypes";

function extensionLimitText(settings: PublicLibrarySettings) {
  if (settings.maxExtensions === null) return "tanpa batas maksimal";
  if (settings.maxExtensions === 0) return "perpanjangan sedang dinonaktifkan";
  return `maksimal ${settings.maxExtensions} kali`;
}

export function renderPublicText(
  value: string,
  settings: PublicLibrarySettings,
) {
  const replacements: Record<string, string> = {
    libraryName: settings.libraryName,
    reservationDurationHours: String(settings.reservationDurationHours),
    loanDurationDays: String(settings.loanDurationDays),
    extensionDurationDays: String(settings.extensionDurationDays),
    maxExtensionsText: extensionLimitText(settings),
  };

  return value.replace(
    /\{(libraryName|reservationDurationHours|loanDurationDays|extensionDurationDays|maxExtensionsText)\}/g,
    (_, key: string) => replacements[key] ?? "",
  );
}

export async function getPublicContent(): Promise<PublicContent> {
  try {
    const response = await fetch(`${API_URL}/members/public/content`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return structuredClone(defaultPublicContent);
    return (await response.json()) as PublicContent;
  } catch {
    return structuredClone(defaultPublicContent);
  }
}
