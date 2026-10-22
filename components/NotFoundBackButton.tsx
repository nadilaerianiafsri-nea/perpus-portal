"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { Button } from "./Button";
import { safeNotFoundHistoryTarget } from "./notFoundNavigation";

type HistoryNavigation = {
  currentEntry?: { index: number };
  entries: () => { url?: string }[];
};

export default function NotFoundBackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();
  function goBack() {
    // history.length alone cannot tell whether the previous entry leaves this site.
    // Older browsers and direct visits use the explicit context destination.
    const navigation = (window as Window & { navigation?: HistoryNavigation }).navigation;
    const index = navigation?.currentEntry?.index ?? 0;
    const previous = index > 0 ? navigation?.entries()[index - 1]?.url : undefined;
    if (safeNotFoundHistoryTarget(window.location.href, previous)) router.back();
    else router.replace(fallbackHref);
  }
  return <Button variant="secondary" icon={<FiArrowLeft />} onClick={goBack}>Kembali</Button>;
}
