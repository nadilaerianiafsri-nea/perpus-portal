"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./Reader.module.css";

export default function HtmlReader({
  source,
  title,
  initialPosition,
  onPosition,
}: {
  source: string;
  title: string;
  initialPosition: number;
  onPosition: (position: { progress: number; lastPosition: number }) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const cleanup = useRef<() => void>(() => {});
  const [failed, setFailed] = useState(false);

  useEffect(() => () => cleanup.current(), []);

  function loaded() {
    cleanup.current();
    const win = frame.current?.contentWindow;
    const doc = frame.current?.contentDocument;
    if (!win || !doc?.scrollingElement) {
      setFailed(true);
      return;
    }

    setFailed(false);
    const scrolling = doc.scrollingElement;
    let enabled = false;
    let scheduled = false;
    const range = () =>
      Math.max(0, scrolling.scrollHeight - scrolling.clientHeight);

    const scroll = () => {
      if (!enabled || scheduled) return;
      scheduled = true;
      win.requestAnimationFrame(() => {
        scheduled = false;
        const maximum = range();
        if (maximum <= 0) {
          onPosition({ progress: 100, lastPosition: 1 });
          return;
        }
        const position = Math.max(
          0,
          Math.min(1, scrolling.scrollTop / maximum),
        );
        onPosition({ progress: position * 100, lastPosition: position });
      });
    };

    const preventLinkNavigation = (event: Event) => {
      const target = event.target as Element | null;
      if (!target?.closest?.("a")) return;
      event.preventDefault();
      event.stopPropagation();
    };

    win.addEventListener("scroll", scroll, { passive: true });
    doc.addEventListener("click", preventLinkNavigation, true);

    win.requestAnimationFrame(() => {
      const maximum = range();
      if (maximum <= 0) {
        onPosition({ progress: 100, lastPosition: 1 });
      } else {
        win.scrollTo(0, initialPosition * maximum);
      }
      win.requestAnimationFrame(() => {
        enabled = true;
      });
    });

    cleanup.current = () => {
      enabled = false;
      win.removeEventListener("scroll", scroll);
      doc.removeEventListener("click", preventLinkNavigation, true);
    };
  }

  return (
    <div className={styles.htmlReader}>
      {failed ? (
        <div className={styles.readerInlineError} role="alert">
          Bacaan belum dapat dimuat. Silakan muat ulang pembaca.
        </div>
      ) : null}
      <iframe
        ref={frame}
        className={styles.htmlViewer}
        src={source}
        title={`Pembaca ${title}`}
        sandbox="allow-same-origin"
        onLoad={loaded}
      />
    </div>
  );
}
