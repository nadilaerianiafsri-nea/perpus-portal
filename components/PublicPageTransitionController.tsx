"use client";

import {
  useLayoutEffect,
} from "react";
import { usePathname } from "next/navigation";
import styles from "./PublicPageTransition.module.css";

const publicMenuPaths = new Set([
  "/",
  "/koleksi",
  "/hibah-buku",
  "/tentang",
  "/panduan",
  "/faq",
  "/kontak",
]);

export default function PublicPageTransitionController() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!publicMenuPaths.has(pathname)) {
      return;
    }

    const direction =
      sessionStorage.getItem(
        "public-nav-direction",
      );

    sessionStorage.removeItem(
      "public-nav-direction",
    );

    if (
      direction !== "forward" &&
      direction !== "backward"
    ) {
      return;
    }

    const root =
      document.documentElement;

    root.dataset.publicPageTransition =
      direction;

    delete root.dataset.publicPageAnimate;

    const frame =
      requestAnimationFrame(() => {
        root.dataset.publicPageAnimate =
          "true";
      });

    const timeout = window.setTimeout(
      () => {
        delete root.dataset
          .publicPageAnimate;
        delete root.dataset
          .publicPageTransition;
      },
      340,
    );

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);

      delete root.dataset.publicPageAnimate;
      delete root.dataset
        .publicPageTransition;
    };
  }, [pathname]);

  return (
    <span
      className={styles.controller}
      aria-hidden="true"
    />
  );
}
