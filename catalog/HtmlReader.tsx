"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Reader.module.css";

export default function HtmlReader({ source, title, initialPosition, onPosition }: {
  source: string; title: string; initialPosition: number;
  onPosition: (position: { progress: number; lastPosition: number }) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const cleanup = useRef<() => void>(() => {});
  const [failed, setFailed] = useState(false);
  useEffect(() => () => cleanup.current(), []);
  function loaded() {
    cleanup.current();
    const win = frame.current?.contentWindow, doc = frame.current?.contentDocument;
    if (!win || !doc?.scrollingElement) { setFailed(true); return; }
    const scrolling = doc.scrollingElement;
    let enabled = false, scheduled = false;
    const range = () => Math.max(0, scrolling.scrollHeight - scrolling.clientHeight);
    const scroll = () => {
      if (!enabled || scheduled) return;
      scheduled = true;
      win.requestAnimationFrame(() => {
        scheduled = false;
        const maximum = range();
        if (maximum <= 0) return;
        const position = Math.max(0, Math.min(1, scrolling.scrollTop / maximum));
        onPosition({ progress: position * 100, lastPosition: position });
      });
    };
    win.addEventListener("scroll", scroll, { passive: true });
    // Restore after the document has laid out. Restoration is not new reading.
    win.requestAnimationFrame(() => {
      win.scrollTo(0, initialPosition * range());
      win.requestAnimationFrame(() => { enabled = true; });
    });
    cleanup.current = () => { enabled = false; win.removeEventListener("scroll", scroll); };
  }
  return <div>
    {failed && <p className={styles.error} role="alert">Bacaan belum dapat dimuat. Silakan muat ulang pembaca.</p>}
    <iframe ref={frame} className={styles.htmlViewer} src={source} title={`Pembaca ${title}`} sandbox="allow-same-origin" onLoad={loaded} />
    <button className={styles.secondary} onClick={() => onPosition({ progress: 100, lastPosition: 1 })}>Tandai selesai dibaca</button>
  </div>;
}
