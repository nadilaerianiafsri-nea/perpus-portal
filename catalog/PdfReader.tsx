"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import styles from "./Reader.module.css";

export default function PdfReader({ source, title, initialPosition, onPosition }: {
  source: string; title: string; initialPosition: number;
  onPosition: (position: { progress: number; lastPosition: number }) => void;
}) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1), [width, setWidth] = useState(600);
  const [error, setError] = useState(""), [rendering, setRendering] = useState(true);
  const [text, setText] = useState("");
  const container = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(100, Math.floor(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    let loading: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;
    void import("pdfjs-dist").then(async pdf => {
      if (!active) return;
      pdf.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
      loading = pdf.getDocument({ url: source });
      const loaded = await loading.promise;
      if (!active) { await loading.destroy(); return; }
      setPage(Math.round(Math.max(0, Math.min(1, initialPosition)) * (loaded.numPages - 1)) + 1);
      setDocument(loaded);
    }).catch(() => { if (active) setError("Berkas PDF belum dapat dimuat. Silakan muat ulang pembaca."); });
    return () => { active = false; void loading?.destroy(); };
  }, [source, initialPosition]);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let active = true, renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    setRendering(true);
    void document.getPage(page).then(async pdfPage => {
      if (!active || !canvas.current) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale: Math.min(width, 900) / pdfPage.getViewport({ scale: 1 }).width * ratio });
      canvas.current.width = Math.floor(viewport.width); canvas.current.height = Math.floor(viewport.height);
      canvas.current.style.width = `${viewport.width / ratio}px`; canvas.current.style.height = `${viewport.height / ratio}px`;
      renderTask = pdfPage.render({ canvas: canvas.current, viewport });
      const content = await pdfPage.getTextContent();
      if (active) setText(content.items.map(item => "str" in item ? item.str : "").join(" "));
      await renderTask.promise;
      if (active) setRendering(false);
    }).catch(() => { if (active) setError("Halaman PDF belum dapat ditampilkan. Silakan muat ulang pembaca."); });
    return () => { active = false; renderTask?.cancel(); };
  }, [document, page, width]);
  function move(next: number) {
    if (!document) return;
    const current = Math.max(1, Math.min(document.numPages, next));
    setPage(current);
    onPosition({ progress: current / document.numPages * 100, lastPosition: document.numPages === 1 ? 1 : (current - 1) / (document.numPages - 1) });
  }
  return <div className={styles.pdfViewer} ref={container}>
    {error ? <p className={styles.error} role="alert">{error}</p> : <>
      <div className={styles.pageControls}>
        <button className={styles.secondary} disabled={!document || page <= 1} onClick={() => move(page - 1)}>Sebelumnya</button>
        <span aria-live="polite">{document ? `Halaman ${page} dari ${document.numPages}` : "Memuat PDF..."}</span>
        <button className={styles.secondary} disabled={!document || page >= document.numPages} onClick={() => move(page + 1)}>Berikutnya</button>
      </div>
      {rendering && <p role="status">Memuat halaman...</p>}
      <canvas ref={canvas} aria-label={`${title}, halaman ${page}`} />
      <p className={styles.srOnly}>{text}</p>
      {document?.numPages === 1 && <button className={styles.secondary} onClick={() => move(1)}>Tandai selesai dibaca</button>}
    </>}
  </div>;
}
