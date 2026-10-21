"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import styles from "./Reader.module.css";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const DEFAULT_ZOOM = 0.5;
const PREVIEW_BREAKPOINT = 900;

type PdfPageProxy = Awaited<ReturnType<PDFDocumentProxy["getPage"]>>;
type PdfRenderTask = ReturnType<PdfPageProxy["render"]>;

function clampZoom(value: number) {
  const snapped = Math.round(value / ZOOM_STEP) * ZOOM_STEP;

  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(snapped.toFixed(1))));
}

function getTouchDistance(touches: TouchList) {
  if (touches.length < 2) return 0;

  const first = touches[0];
  const second = touches[1];

  return Math.hypot(
    second.clientX - first.clientX,
    second.clientY - first.clientY,
  );
}

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
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  const [text, setText] = useState("");

  const container = useRef<HTMLDivElement>(null);
  const previousCanvas = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const nextCanvas = useRef<HTMLCanvasElement>(null);

  const zoomRef = useRef(DEFAULT_ZOOM);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartZoom = useRef(DEFAULT_ZOOM);

  const zoomPercent = Math.round(zoom * 100);
  const showPreviews = width >= PREVIEW_BREAKPOINT;

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(100, Math.floor(entry.contentRect.width)));
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 2) return;

      const distance = getTouchDistance(event.touches);
      if (distance <= 0) return;

      pinchStartDistance.current = distance;
      pinchStartZoom.current = zoomRef.current;
    }

    function handleTouchMove(event: TouchEvent) {
      if (event.touches.length !== 2 || pinchStartDistance.current === null) {
        return;
      }

      const currentDistance = getTouchDistance(event.touches);
      if (currentDistance <= 0) return;

      event.preventDefault();

      const ratio = currentDistance / pinchStartDistance.current;
      const nextZoom = clampZoom(pinchStartZoom.current * ratio);

      setZoom((current) => (current === nextZoom ? current : nextZoom));
    }

    function handleTouchEnd(event: TouchEvent) {
      if (event.touches.length < 2) {
        pinchStartDistance.current = null;
      }
    }

    function handleTouchCancel() {
      pinchStartDistance.current = null;
    }

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();

      const factor = Math.exp(-event.deltaY * 0.002);

      setZoom((current) => clampZoom(current * factor));
    }

    element.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });

    element.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    element.addEventListener("touchend", handleTouchEnd);
    element.addEventListener("touchcancel", handleTouchCancel);

    element.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchCancel);
      element.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useEffect(() => {
    let active = true;

    let loading:
      | ReturnType<typeof import("pdfjs-dist").getDocument>
      | undefined;

    setError("");
    setRendering(true);
    setZoom(DEFAULT_ZOOM);

    void import("pdfjs-dist")
      .then(async (pdf) => {
        if (!active) return;

        pdf.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.mjs",
          import.meta.url,
        ).toString();

        loading = pdf.getDocument({
          url: source,
          wasmUrl: "/pdfjs/wasm/",
        });

        const loaded = await loading.promise;

        if (!active) {
          await loading.destroy();
          return;
        }

        const safePosition = Math.max(0, Math.min(1, initialPosition));

        const initialPage =
          loaded.numPages === 1
            ? 1
            : Math.round(safePosition * (loaded.numPages - 1)) + 1;

        setPage(Math.max(1, Math.min(loaded.numPages, initialPage)));

        setDocument(loaded);
      })
      .catch(() => {
        if (!active) return;

        setRendering(false);

        setError("Berkas PDF belum dapat dimuat. Silakan muat ulang pembaca.");
      });

    return () => {
      active = false;
      void loading?.destroy();
    };
  }, [source, initialPosition]);

  useEffect(() => {
    if (!document || !canvas.current) return;

    let active = true;
    let renderTask: PdfRenderTask | undefined;

    setRendering(true);
    setError("");

    void document
      .getPage(page)
      .then(async (pdfPage) => {
        if (!active || !canvas.current) return;

        const ratio = Math.min(window.devicePixelRatio || 1, 2);

        const baseViewport = pdfPage.getViewport({
          scale: 1,
        });

        const availableWidth = Math.min(width, 900);

        const displayScale = (availableWidth / baseViewport.width) * zoom;

        const viewport = pdfPage.getViewport({
          scale: displayScale * ratio,
        });

        canvas.current.width = Math.max(1, Math.floor(viewport.width));

        canvas.current.height = Math.max(1, Math.floor(viewport.height));

        canvas.current.style.width = `${viewport.width / ratio}px`;

        canvas.current.style.height = `${viewport.height / ratio}px`;

        renderTask = pdfPage.render({
          canvas: canvas.current,
          viewport,
        });

        await renderTask.promise;

        if (!active) return;

        try {
          const content = await pdfPage.getTextContent();

          if (!active) return;

          setText(
            content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" "),
          );
        } catch {
          if (active) {
            setText("");
          }
        }

        if (!active) return;

        setRendering(false);

        if (document.numPages === 1) {
          onPosition({
            progress: 100,
            lastPosition: 1,
          });
        }
      })
      .catch((failure: unknown) => {
        if (!active) return;

        if (
          failure instanceof Error &&
          failure.name === "RenderingCancelledException"
        ) {
          return;
        }

        setRendering(false);

        setError(
          "Halaman PDF belum dapat ditampilkan. Silakan muat ulang pembaca.",
        );
      });

    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [document, page, width, zoom, onPosition]);

  useEffect(() => {
    if (!document || !showPreviews) return;

    const pdfDocument = document;
    let active = true;

    const renderTasks: PdfRenderTask[] = [];

    async function renderPreview(
      pageNumber: number,
      targetCanvas: HTMLCanvasElement,
    ) {
      const pdfPage = await pdfDocument.getPage(pageNumber);

      if (!active) return;

      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);

      const baseViewport = pdfPage.getViewport({
        scale: 1,
      });

      const previewWidth = Math.min(
        260,
        Math.max(160, Math.floor(width * 0.16)),
      );

      const displayScale = previewWidth / baseViewport.width;

      const viewport = pdfPage.getViewport({
        scale: displayScale * ratio,
      });

      targetCanvas.width = Math.max(1, Math.floor(viewport.width));

      targetCanvas.height = Math.max(1, Math.floor(viewport.height));

      targetCanvas.style.width = "100%";

      targetCanvas.style.height = "auto";

      const task = pdfPage.render({
        canvas: targetCanvas,
        viewport,
      });

      renderTasks.push(task);

      await task.promise;
    }

    const jobs: Promise<void>[] = [];

    if (page > 1 && previousCanvas.current) {
      jobs.push(renderPreview(page - 1, previousCanvas.current));
    }

    if (page < pdfDocument.numPages && nextCanvas.current) {
      jobs.push(renderPreview(page + 1, nextCanvas.current));
    }

    void Promise.allSettled(jobs);

    return () => {
      active = false;

      renderTasks.forEach((task) => task.cancel());
    };
  }, [document, page, width, showPreviews]);

  const move = useCallback(
    (next: number) => {
      if (!document) return;

      const current = Math.max(1, Math.min(document.numPages, next));

      if (current === page) return;

      setPage(current);

      onPosition({
        progress: (current / document.numPages) * 100,

        lastPosition:
          document.numPages === 1 ? 1 : (current - 1) / (document.numPages - 1),
      });
    },
    [document, onPosition, page],
  );

  const zoomOut = useCallback(() => {
    setZoom((current) => clampZoom(current - ZOOM_STEP));
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((current) => clampZoom(current + ZOOM_STEP));
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        move(page - 1);
      }

      if (event.key === "ArrowRight") {
        move(page + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [move, page]);

  return (
    <div className={styles.pdfViewer} ref={container}>
      {error ? (
        <div className={styles.readerInlineError} role="alert">
          {error}
        </div>
      ) : (
        <>
          <div className={styles.pdfSpread}>
            {showPreviews ? (
              page > 1 ? (
                <div
                  className={`${styles.pdfPreview} ${styles.pdfPreviewPrevious}`}
                  aria-hidden="true"
                >
                  <canvas key={`previous-${page - 1}`} ref={previousCanvas} />
                </div>
              ) : (
                <div className={styles.pdfPreviewSlot} aria-hidden="true" />
              )
            ) : null}

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

              <canvas
                ref={canvas}
                aria-label={`${title}, halaman ${page}, zoom ${zoomPercent}%`}
              />
            </div>

            {showPreviews ? (
              page < (document?.numPages ?? 0) ? (
                <div
                  className={`${styles.pdfPreview} ${styles.pdfPreviewNext}`}
                  aria-hidden="true"
                >
                  <canvas key={`next-${page + 1}`} ref={nextCanvas} />
                </div>
              ) : (
                <div className={styles.pdfPreviewSlot} aria-hidden="true" />
              )
            ) : null}
          </div>

          <p className={styles.srOnly}>{text}</p>

          <div
            className={styles.pageControls}
            aria-label="Navigasi halaman dan zoom"
          >
            <button
              data-button="icon"
              data-button-size="sm"
              data-button-shape="square"
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

            <button
              data-button="icon"
              data-button-size="sm"
              data-button-shape="square"
              type="button"
              className={styles.readerControl}
              disabled={!document || page >= document.numPages}
              aria-label="Halaman berikutnya"
              onClick={() => move(page + 1)}
            >
              <FiChevronRight size={20} aria-hidden="true" />
            </button>

            <button
              data-button="icon"
              data-button-size="sm"
              data-button-shape="square"
              type="button"
              className={`${styles.readerControl} ${styles.zoomControl}`}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Perkecil tampilan"
              onClick={zoomOut}
            >
              <span aria-hidden="true">−</span>
            </button>

            <span
              className={styles.zoomIndicator}
              aria-live="polite"
              aria-label={`Zoom ${zoomPercent}%`}
            >
              {zoomPercent}%
            </span>

            <button
              data-button="icon"
              data-button-size="sm"
              data-button-shape="square"
              type="button"
              className={`${styles.readerControl} ${styles.zoomControl}`}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Perbesar tampilan"
              onClick={zoomIn}
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
