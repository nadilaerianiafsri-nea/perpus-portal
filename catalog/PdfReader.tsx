"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import styles from "./Reader.module.css";

export default function PdfReader({
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
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(600);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  const [text, setText] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(100, Math.floor(entry.contentRect.width))),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    let loading: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;

    void import("pdfjs-dist")
      .then(async (pdf) => {
        if (!active) return;
        pdf.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.mjs",
          import.meta.url,
        ).toString();
        loading = pdf.getDocument({ url: source });
        const loaded = await loading.promise;
        if (!active) {
          await loading.destroy();
          return;
        }
        setPage(
          Math.round(
            Math.max(0, Math.min(1, initialPosition)) * (loaded.numPages - 1),
          ) + 1,
        );
        setDocument(loaded);
      })
      .catch(() => {
        if (active) {
          setError("Berkas PDF belum dapat dimuat. Silakan muat ulang pembaca.");
        }
      });

    return () => {
      active = false;
      void loading?.destroy();
    };
  }, [source, initialPosition]);

  useEffect(() => {
    if (!document || !canvas.current) return;

    let active = true;
    let renderTask:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
      | undefined;

    setRendering(true);
    void document
      .getPage(page)
      .then(async (pdfPage) => {
        if (!active || !canvas.current) return;

        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({
          scale: (Math.min(width, 900) / baseViewport.width) * ratio,
        });

        canvas.current.width = Math.floor(viewport.width);
        canvas.current.height = Math.floor(viewport.height);
        canvas.current.style.width = `${viewport.width / ratio}px`;
        canvas.current.style.height = `${viewport.height / ratio}px`;

        renderTask = pdfPage.render({ canvas: canvas.current, viewport });
        const content = await pdfPage.getTextContent();
        if (active) {
          setText(
            content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" "),
          );
        }
        await renderTask.promise;
        if (active) {
          setRendering(false);
          if (document.numPages === 1) {
            onPosition({ progress: 100, lastPosition: 1 });
          }
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Halaman PDF belum dapat ditampilkan. Silakan muat ulang pembaca.",
          );
        }
      });

    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [document, page, width, onPosition]);

  const move = useCallback(
    (next: number) => {
      if (!document) return;
      const current = Math.max(1, Math.min(document.numPages, next));
      if (current === page) return;

      setPage(current);
      onPosition({
        progress: (current / document.numPages) * 100,
        lastPosition:
          document.numPages === 1
            ? 1
            : (current - 1) / (document.numPages - 1),
      });
    },
    [document, onPosition, page],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") move(page - 1);
      if (event.key === "ArrowRight") move(page + 1);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move, page]);

  return (
    <div className={styles.pdfViewer} ref={container}>
      {error ? (
        <div className={styles.readerInlineError} role="alert">
          {error}
        </div>
      ) : (
        <>
          <div className={styles.pdfPage}>
            {rendering ? (
              <div
                className={styles.pageLoading}
                role="status"
                aria-label="Memuat halaman"
              >
                <span className={styles.readerSpinner} aria-hidden="true" />
              </div>
            ) : null}
            <canvas ref={canvas} aria-label={`${title}, halaman ${page}`} />
          </div>

          <p className={styles.srOnly}>{text}</p>

          <div className={styles.pageControls} aria-label="Navigasi halaman">
            <button data-button="icon" data-button-size="sm" data-button-shape="square"
              type="button"
              className={styles.readerControl}
              disabled={!document || page <= 1}
              aria-label="Halaman sebelumnya"
              onClick={() => move(page - 1)}
            >
              <FiChevronLeft size={20} aria-hidden="true" />
            </button>
            <span className={styles.pageIndicator} aria-live="polite">
              {document ? `${page} / ${document.numPages}` : "— / —"}
            </span>
            <button data-button="icon" data-button-size="sm" data-button-shape="square"
              type="button"
              className={styles.readerControl}
              disabled={!document || page >= document.numPages}
              aria-label="Halaman berikutnya"
              onClick={() => move(page + 1)}
            >
              <FiChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
