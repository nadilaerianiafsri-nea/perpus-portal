"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import styles from "./Reader.module.css";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const INITIAL_ZOOM = 0.5;
const PREVIEW_BREAKPOINT = 900;
const CONTROL_HIDE_MS = 2800;
const SWIPE_THRESHOLD = 70;
const QUICK_SWIPE_THRESHOLD = 56;
const TAP_TOLERANCE = 12;
const FIT_SNAP_TOLERANCE = 0.025;
const TRACKPAD_THRESHOLD = 90;
const EDGE_TOLERANCE = 10;
const QUICK_SELECT_COUNT = 3;

type PdfPageProxy = Awaited<ReturnType<PDFDocumentProxy["getPage"]>>;
type PdfRenderTask = ReturnType<PdfPageProxy["render"]>;
type TurnDirection = "next" | "previous";
type ReaderMode = "fit" | "zoomed";

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function computeFitZoom({
  pageWidth,
  pageHeight,
  availableWidth,
  availableHeight,
}: {
  pageWidth: number;
  pageHeight: number;
  availableWidth: number;
  availableHeight: number;
}) {
  return clampZoom(
    Math.min(availableWidth / pageWidth, availableHeight / pageHeight),
  );
}

function classifyReaderMode({
  zoom,
  fitZoom,
  fitMode,
}: {
  zoom: number;
  fitZoom: number;
  fitMode: boolean;
}): ReaderMode {
  if (fitMode || zoom <= fitZoom + FIT_SNAP_TOLERANCE) {
    return "fit";
  }

  return "zoomed";
}

function getTouchDistance(touches: TouchList) {
  if (touches.length < 2) {
    return 0;
  }

  const first = touches[0];
  const second = touches[1];

  return Math.hypot(
    second.clientX - first.clientX,
    second.clientY - first.clientY,
  );
}

function getSwipeDirection(
  deltaX: number,
  deltaY: number,
): TurnDirection | null {
  if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
    return null;
  }

  if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) {
    return null;
  }

  return deltaX < 0 ? "next" : "previous";
}

function getQuickSelectPages(center: number, total: number) {
  const count = Math.min(total, QUICK_SELECT_COUNT);

  let start = Math.max(1, center - 1);

  let end = Math.min(total, start + count - 1);

  start = Math.max(1, end - count + 1);

  end = Math.min(total, start + count - 1);

  return Array.from(
    {
      length: end - start + 1,
    },
    (_, index) => start + index,
  );
}

function getHorizontalEdges(element: HTMLElement) {
  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);

  return {
    atLeft: element.scrollLeft <= EDGE_TOLERANCE,

    atRight: element.scrollLeft >= maxScrollLeft - EDGE_TOLERANCE,
  };
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

  const [height, setHeight] = useState(800);

  const [fitZoom, setFitZoom] = useState(INITIAL_ZOOM);

  const [zoom, setZoom] = useState(INITIAL_ZOOM);

  const [fitMode, setFitMode] = useState(true);

  const [turnDirection, setTurnDirection] = useState<TurnDirection | null>(
    null,
  );

  const [controlsVisible, setControlsVisible] = useState(true);

  const [quickSelectOpen, setQuickSelectOpen] = useState(false);

  const [quickSelectCenter, setQuickSelectCenter] = useState(1);

  const [error, setError] = useState("");

  const [rendering, setRendering] = useState(true);

  const [text, setText] = useState("");

  const container = useRef<HTMLDivElement>(null);

  const previousCanvas = useRef<HTMLCanvasElement>(null);

  const canvas = useRef<HTMLCanvasElement>(null);

  const nextCanvas = useRef<HTMLCanvasElement>(null);

  const quickSelectCanvases = useRef(new Map<number, HTMLCanvasElement>());

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zoomRef = useRef(INITIAL_ZOOM);

  const fitZoomRef = useRef(INITIAL_ZOOM);

  const pinchStartDistance = useRef<number | null>(null);

  const pinchStartZoom = useRef(INITIAL_ZOOM);

  const trackpadDelta = useRef(0);

  const trackpadLocked = useRef(false);

  const skipQuickSelectClick = useRef(false);

  const touchGesture = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,

    moved: false,
    pinching: false,

    startAtLeftEdge: true,
    startAtRightEdge: true,
  });

  const pointerGesture = useRef({
    active: false,

    mode: "turn" as "turn" | "pan",

    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,

    startScrollLeft: 0,
    startScrollTop: 0,

    startAtLeftEdge: true,
    startAtRightEdge: true,
  });

  const quickSelectGesture = useRef({
    active: false,
    startX: 0,
    lastX: 0,
  });

  const readerMode = classifyReaderMode({
    zoom,
    fitZoom,
    fitMode,
  });

  const showSidePreviews =
    width >= PREVIEW_BREAKPOINT && fitMode && !quickSelectOpen;

  const zoomPercent = Math.round((fitMode ? fitZoom : zoom) * 100);

  const quickSelectPages = useMemo(
    () =>
      document && quickSelectOpen
        ? getQuickSelectPages(quickSelectCenter, document.numPages)
        : [],
    [document, quickSelectCenter, quickSelectOpen],
  );

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    fitZoomRef.current = fitZoom;
  }, [fitZoom]);

  const clearControlsTimer = useCallback(() => {
    if (!controlsTimer.current) {
      return;
    }

    clearTimeout(controlsTimer.current);

    controlsTimer.current = null;
  }, []);

  const scheduleControlsHide = useCallback(() => {
    clearControlsTimer();

    if (quickSelectOpen) {
      return;
    }

    controlsTimer.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROL_HIDE_MS);
  }, [clearControlsTimer, quickSelectOpen]);

  const showControls = useCallback(() => {
    setControlsVisible(true);

    scheduleControlsHide();
  }, [scheduleControlsHide]);

  const keepControlsVisible = useCallback(() => {
    clearControlsTimer();

    setControlsVisible(true);
  }, [clearControlsTimer]);

  const move = useCallback(
    (next: number, direction?: TurnDirection) => {
      if (!document) {
        return;
      }

      const current = Math.max(1, Math.min(document.numPages, next));

      if (current === page) {
        return;
      }

      setTurnDirection(direction ?? (current > page ? "next" : "previous"));

      setPage(current);

      showControls();

      onPosition({
        progress: (current / document.numPages) * 100,

        lastPosition:
          document.numPages === 1 ? 1 : (current - 1) / (document.numPages - 1),
      });
    },
    [document, onPosition, page, showControls],
  );

  const applyManualZoom = useCallback(
    (value: number) => {
      const next = clampZoom(value);

      setQuickSelectOpen(false);

      if (Math.abs(next - fitZoom) <= FIT_SNAP_TOLERANCE) {
        setFitMode(true);

        setZoom(fitZoom);
      } else {
        setFitMode(false);

        setZoom(next);
      }

      showControls();
    },
    [fitZoom, showControls],
  );

  const zoomOut = useCallback(() => {
    const current = fitMode ? fitZoom : zoom;

    applyManualZoom(current - ZOOM_STEP);
  }, [applyManualZoom, fitMode, fitZoom, zoom]);

  const zoomIn = useCallback(() => {
    const current = fitMode ? fitZoom : zoom;

    applyManualZoom(current + ZOOM_STEP);
  }, [applyManualZoom, fitMode, fitZoom, zoom]);

  const toggleQuickSelect = useCallback(() => {
    if (quickSelectOpen) {
      setQuickSelectOpen(false);

      showControls();
      return;
    }

    clearControlsTimer();

    setControlsVisible(true);

    setQuickSelectCenter(page);

    setQuickSelectOpen(true);
  }, [clearControlsTimer, page, quickSelectOpen, showControls]);

  const selectQuickPage = useCallback(
    (target: number) => {
      if (skipQuickSelectClick.current) {
        skipQuickSelectClick.current = false;

        return;
      }

      setQuickSelectOpen(false);

      setQuickSelectCenter(target);

      setFitMode(true);

      setZoom(fitZoom);

      if (target !== page) {
        move(target, target > page ? "next" : "previous");
      } else {
        showControls();
      }
    },
    [fitZoom, move, page, showControls],
  );

  const shiftQuickSelect = useCallback(
    (direction: TurnDirection) => {
      if (!document) {
        return;
      }

      setQuickSelectCenter((current) =>
        Math.max(
          1,
          Math.min(
            document.numPages,
            current + (direction === "next" ? 1 : -1),
          ),
        ),
      );
    },
    [document],
  );

  useEffect(() => {
    const element = container.current;

    if (!element) {
      return;
    }

    const updateFromEntry = (entry: ResizeObserverEntry) => {
      setWidth(Math.max(100, Math.floor(entry.contentRect.width)));

      setHeight(Math.max(320, window.innerHeight));
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      updateFromEntry(entry);
    });

    observer.observe(element);

    const handleWindowResize = () => {
      setHeight(Math.max(320, window.innerHeight));
    };

    window.addEventListener("resize", handleWindowResize);

    return () => {
      observer.disconnect();

      window.removeEventListener("resize", handleWindowResize);
    };
  }, []);

  useEffect(() => {
    scheduleControlsHide();

    return () => {
      clearControlsTimer();
    };
  }, [clearControlsTimer, scheduleControlsHide]);

  useEffect(() => {
    if (readerMode !== "fit" || quickSelectOpen) {
      return;
    }

    container.current?.scrollTo({
      left: 0,
      top: 0,
      behavior: "auto",
    });
  }, [page, quickSelectOpen, readerMode]);

  useEffect(() => {
    const surface = canvas.current;

    if (!surface || quickSelectOpen) {
      return;
    }

    const pageSurface: HTMLCanvasElement = surface;

    function finishPinch() {
      if (
        Math.abs(zoomRef.current - fitZoomRef.current) <= FIT_SNAP_TOLERANCE
      ) {
        setFitMode(true);

        setZoom(fitZoomRef.current);
      }

      pinchStartDistance.current = null;

      touchGesture.current.pinching = false;
    }

    function handleTouchStart(event: TouchEvent) {
      clearControlsTimer();

      const viewer = container.current;

      const edges = viewer
        ? getHorizontalEdges(viewer)
        : {
            atLeft: true,
            atRight: true,
          };

      if (event.touches.length === 2) {
        const distance = getTouchDistance(event.touches);

        if (distance <= 0) {
          return;
        }

        pinchStartDistance.current = distance;

        pinchStartZoom.current = fitMode ? fitZoomRef.current : zoomRef.current;

        touchGesture.current.pinching = true;

        showControls();
        return;
      }

      if (event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];

      touchGesture.current = {
        startX: touch.clientX,

        startY: touch.clientY,

        lastX: touch.clientX,

        lastY: touch.clientY,

        moved: false,
        pinching: false,

        startAtLeftEdge: edges.atLeft,

        startAtRightEdge: edges.atRight,
      };
    }

    function handleTouchMove(event: TouchEvent) {
      if (event.touches.length === 2 && pinchStartDistance.current !== null) {
        const currentDistance = getTouchDistance(event.touches);

        if (currentDistance <= 0) {
          return;
        }

        event.preventDefault();

        const ratio = currentDistance / pinchStartDistance.current;

        const nextZoom = clampZoom(pinchStartZoom.current * ratio);

        setFitMode(false);

        setZoom(nextZoom);

        return;
      }

      if (event.touches.length !== 1 || touchGesture.current.pinching) {
        return;
      }

      const touch = event.touches[0];

      const deltaX = touch.clientX - touchGesture.current.startX;

      const deltaY = touch.clientY - touchGesture.current.startY;

      touchGesture.current.lastX = touch.clientX;

      touchGesture.current.lastY = touch.clientY;

      if (
        Math.abs(deltaX) > TAP_TOLERANCE ||
        Math.abs(deltaY) > TAP_TOLERANCE
      ) {
        touchGesture.current.moved = true;
      }

      if (readerMode === "fit" && Math.abs(deltaX) > Math.abs(deltaY)) {
        event.preventDefault();
      }
    }

    function handleTouchEnd(event: TouchEvent) {
      if (pinchStartDistance.current !== null && event.touches.length < 2) {
        finishPinch();
        return;
      }

      if (event.touches.length > 0 || touchGesture.current.pinching) {
        return;
      }

      const deltaX = touchGesture.current.lastX - touchGesture.current.startX;

      const deltaY = touchGesture.current.lastY - touchGesture.current.startY;

      const direction = getSwipeDirection(deltaX, deltaY);

      if (readerMode === "fit") {
        if (direction === "next") {
          move(page + 1, "next");

          return;
        }

        if (direction === "previous") {
          move(page - 1, "previous");

          return;
        }
      }

      if (readerMode === "zoomed") {
        if (direction === "next" && touchGesture.current.startAtRightEdge) {
          move(page + 1, "next");

          return;
        }

        if (direction === "previous" && touchGesture.current.startAtLeftEdge) {
          move(page - 1, "previous");

          return;
        }
      }

      if (!touchGesture.current.moved) {
        clearControlsTimer();

        setControlsVisible((current) => {
          const next = !current;

          if (next) {
            scheduleControlsHide();
          }

          return next;
        });
      }
    }

    function handleTouchCancel() {
      finishPinch();
    }

    function handleWheel(event: WheelEvent) {
      showControls();

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        const current = fitMode ? fitZoomRef.current : zoomRef.current;

        const factor = Math.exp(-event.deltaY * 0.002);

        applyManualZoom(current * factor);

        return;
      }

      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) * 1.15) {
        return;
      }

      const viewer = container.current;

      if (!viewer) {
        return;
      }

      const direction: TurnDirection = event.deltaX > 0 ? "next" : "previous";

      const edges = getHorizontalEdges(viewer);

      const canTurn =
        readerMode === "fit" ||
        (readerMode === "zoomed" &&
          ((direction === "next" && edges.atRight) ||
            (direction === "previous" && edges.atLeft)));

      if (!canTurn) {
        return;
      }

      event.preventDefault();

      trackpadDelta.current += event.deltaX;

      if (
        !trackpadLocked.current &&
        Math.abs(trackpadDelta.current) >= TRACKPAD_THRESHOLD
      ) {
        trackpadLocked.current = true;

        trackpadDelta.current = 0;

        move(page + (direction === "next" ? 1 : -1), direction);

        window.setTimeout(() => {
          trackpadLocked.current = false;
        }, 320);
      }
    }

    function stopPointerTracking() {
      window.removeEventListener("pointermove", handlePointerMove);

      window.removeEventListener("pointerup", finishPointer);

      window.removeEventListener("pointercancel", finishPointer);
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.pointerType !== "mouse" ||
        event.button !== 0 ||
        pointerGesture.current.active
      ) {
        return;
      }

      const viewer = container.current;

      if (!viewer) {
        return;
      }

      const edges = getHorizontalEdges(viewer);

      showControls();

      pointerGesture.current = {
        active: true,

        mode: readerMode === "zoomed" ? "pan" : "turn",

        startX: event.clientX,

        startY: event.clientY,

        lastX: event.clientX,

        lastY: event.clientY,

        startScrollLeft: viewer.scrollLeft,

        startScrollTop: viewer.scrollTop,

        startAtLeftEdge: edges.atLeft,

        startAtRightEdge: edges.atRight,
      };

      window.addEventListener("pointermove", handlePointerMove);

      window.addEventListener("pointerup", finishPointer);

      window.addEventListener("pointercancel", finishPointer);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!pointerGesture.current.active) {
        return;
      }

      const deltaX = event.clientX - pointerGesture.current.startX;

      const deltaY = event.clientY - pointerGesture.current.startY;

      pointerGesture.current.lastX = event.clientX;

      pointerGesture.current.lastY = event.clientY;

      if (pointerGesture.current.mode === "pan") {
        const viewer = container.current;

        if (!viewer) {
          return;
        }

        event.preventDefault();

        viewer.scrollTo({
          left: pointerGesture.current.startScrollLeft - deltaX,

          top: pointerGesture.current.startScrollTop - deltaY,

          behavior: "auto",
        });
      }
    }

    function finishPointer() {
      if (!pointerGesture.current.active) {
        stopPointerTracking();
        return;
      }

      const deltaX =
        pointerGesture.current.lastX - pointerGesture.current.startX;

      const deltaY =
        pointerGesture.current.lastY - pointerGesture.current.startY;

      const mode = pointerGesture.current.mode;

      const direction = getSwipeDirection(deltaX, deltaY);

      pointerGesture.current.active = false;

      stopPointerTracking();

      if (mode === "turn") {
        if (direction === "next") {
          move(page + 1, "next");
        } else if (direction === "previous") {
          move(page - 1, "previous");
        }

        return;
      }

      if (direction === "next" && pointerGesture.current.startAtRightEdge) {
        move(page + 1, "next");
      } else if (
        direction === "previous" &&
        pointerGesture.current.startAtLeftEdge
      ) {
        move(page - 1, "previous");
      }
    }

    pageSurface.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });

    pageSurface.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    pageSurface.addEventListener("touchend", handleTouchEnd);

    pageSurface.addEventListener("touchcancel", handleTouchCancel);

    pageSurface.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    pageSurface.addEventListener("pointerdown", handlePointerDown);

    return () => {
      pointerGesture.current.active = false;

      stopPointerTracking();

      pageSurface.removeEventListener("touchstart", handleTouchStart);

      pageSurface.removeEventListener("touchmove", handleTouchMove);

      pageSurface.removeEventListener("touchend", handleTouchEnd);

      pageSurface.removeEventListener("touchcancel", handleTouchCancel);

      pageSurface.removeEventListener("wheel", handleWheel);

      pageSurface.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [
    applyManualZoom,
    clearControlsTimer,
    fitMode,
    move,
    page,
    quickSelectOpen,
    readerMode,
    scheduleControlsHide,
    showControls,
  ]);

  useEffect(() => {
    let active = true;

    let loading:
      | ReturnType<typeof import("pdfjs-dist").getDocument>
      | undefined;

    void import("pdfjs-dist")
      .then(async (pdf) => {
        if (!active) {
          return;
        }

        setError("");
        setRendering(true);
        setFitMode(true);

        setFitZoom(INITIAL_ZOOM);

        setZoom(INITIAL_ZOOM);

        setQuickSelectOpen(false);

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

        const safePage = Math.max(1, Math.min(loaded.numPages, initialPage));

        setPage(safePage);

        setQuickSelectCenter(safePage);

        setDocument(loaded);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setRendering(false);

        setError("Berkas PDF belum dapat dimuat. Silakan muat ulang pembaca.");
      });

    return () => {
      active = false;

      void loading?.destroy();
    };
  }, [source, initialPosition]);

  useEffect(() => {
    if (quickSelectOpen || !document || !canvas.current) {
      return;
    }

    let active = true;

    let renderTask: PdfRenderTask | undefined;

    void document
      .getPage(page)
      .then(async (pdfPage) => {
        if (!active || !canvas.current) {
          return;
        }

        setRendering(true);

        setError("");

        const ratio = Math.min(window.devicePixelRatio || 1, 2);

        const baseViewport = pdfPage.getViewport({
          scale: 1,
        });

        const horizontalPadding = width <= 600 ? 20 : 48;

        const verticalReserve = width <= 600 ? 142 : 150;

        const availableHeight = Math.max(220, height - verticalReserve);

        const availableWidth =
          width >= PREVIEW_BREAKPOINT
            ? Math.min(700, Math.max(300, width * 0.4))
            : Math.max(180, width - horizontalPadding);

        const calculatedFitZoom = computeFitZoom({
          pageWidth: baseViewport.width,

          pageHeight: baseViewport.height,

          availableWidth,

          availableHeight,
        });

        if (Math.abs(calculatedFitZoom - fitZoomRef.current) > 0.005) {
          setFitZoom(calculatedFitZoom);
        }

        const displayZoom = fitMode ? calculatedFitZoom : zoom;

        if (fitMode && Math.abs(zoom - calculatedFitZoom) > 0.005) {
          setZoom(calculatedFitZoom);
        }

        const viewport = pdfPage.getViewport({
          scale: displayZoom * ratio,
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

        if (!active) {
          return;
        }

        try {
          const content = await pdfPage.getTextContent();

          if (!active) {
            return;
          }

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

        if (!active) {
          return;
        }

        setRendering(false);

        if (document.numPages === 1) {
          onPosition({
            progress: 100,
            lastPosition: 1,
          });
        }
      })
      .catch((failure: unknown) => {
        if (!active) {
          return;
        }

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
  }, [
    document,
    fitMode,
    height,
    onPosition,
    page,
    quickSelectOpen,
    width,
    zoom,
  ]);

  useEffect(() => {
    if (!document || !showSidePreviews || quickSelectOpen) {
      return;
    }

    const pdfDocument = document;

    let active = true;

    const renderTasks: PdfRenderTask[] = [];

    async function renderPreview(
      pageNumber: number,
      targetCanvas: HTMLCanvasElement,
    ) {
      const pdfPage = await pdfDocument.getPage(pageNumber);

      if (!active) {
        return;
      }

      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);

      const baseViewport = pdfPage.getViewport({
        scale: 1,
      });

      const previewWidth = Math.min(
        260,
        Math.max(160, Math.floor(width * 0.16)),
      );

      const viewport = pdfPage.getViewport({
        scale: (previewWidth / baseViewport.width) * ratio,
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
  }, [document, page, quickSelectOpen, showSidePreviews, width]);

  useEffect(() => {
    if (!document || !quickSelectOpen) {
      return;
    }

    const pdfDocument = document;

    let active = true;

    const renderTasks: PdfRenderTask[] = [];

    async function renderQuickSelectPage(pageNumber: number) {
      const targetCanvas = quickSelectCanvases.current.get(pageNumber);

      if (!targetCanvas) {
        return;
      }

      const pdfPage = await pdfDocument.getPage(pageNumber);

      if (!active) {
        return;
      }

      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);

      const baseViewport = pdfPage.getViewport({
        scale: 1,
      });

      const previewWidth =
        width <= 600
          ? Math.max(190, Math.floor(width * 0.62))
          : width <= 900
            ? 240
            : Math.min(330, Math.max(270, Math.floor(width * 0.19)));

      const viewport = pdfPage.getViewport({
        scale: (previewWidth / baseViewport.width) * ratio,
      });

      targetCanvas.width = Math.max(1, Math.floor(viewport.width));

      targetCanvas.height = Math.max(1, Math.floor(viewport.height));

      targetCanvas.style.width = `${viewport.width / ratio}px`;

      targetCanvas.style.height = `${viewport.height / ratio}px`;

      const task = pdfPage.render({
        canvas: targetCanvas,

        viewport,
      });

      renderTasks.push(task);

      await task.promise;
    }

    void Promise.allSettled(
      quickSelectPages.map((pageNumber) => renderQuickSelectPage(pageNumber)),
    );

    return () => {
      active = false;

      renderTasks.forEach((task) => task.cancel());
    };
  }, [document, quickSelectOpen, quickSelectPages, width]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      showControls();

      if (quickSelectOpen) {
        if (event.key === "ArrowLeft") {
          shiftQuickSelect("previous");
        }

        if (event.key === "ArrowRight") {
          shiftQuickSelect("next");
        }

        if (event.key === "Escape") {
          setQuickSelectOpen(false);
        }

        return;
      }

      if (event.key === "ArrowLeft") {
        move(page - 1, "previous");
      }

      if (event.key === "ArrowRight") {
        move(page + 1, "next");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [move, page, quickSelectOpen, shiftQuickSelect, showControls]);

  const viewerClassName = [
    styles.pdfViewer,

    readerMode === "fit" ? styles.pdfViewerFit : "",

    readerMode === "zoomed" ? styles.pdfViewerZoomed : "",

    quickSelectOpen ? styles.pdfViewerQuickSelect : "",
  ]
    .filter(Boolean)
    .join(" ");

  const spreadClassName = [
    styles.pdfSpread,

    showSidePreviews ? "" : styles.pdfSpreadSingle,
  ]
    .filter(Boolean)
    .join(" ");

  const pageAnimationClass =
    turnDirection === "next"
      ? styles.pageTurnNext
      : turnDirection === "previous"
        ? styles.pageTurnPrevious
        : "";

  return (
    <div className={viewerClassName} ref={container}>
      {error ? (
        <div className={styles.readerInlineError} role="alert">
          {error}
        </div>
      ) : (
        <>
          {quickSelectOpen ? (
            <div className={styles.quickSelectViewport}>
              <div
                className={styles.quickSelectStrip}
                aria-label="Pilih halaman cepat"
                onPointerDown={(event) => {
                  if (event.button !== 0 && event.pointerType === "mouse") {
                    return;
                  }

                  quickSelectGesture.current = {
                    active: true,
                    startX: event.clientX,
                    lastX: event.clientX,
                  };

                  skipQuickSelectClick.current = false;

                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (!quickSelectGesture.current.active) {
                    return;
                  }

                  quickSelectGesture.current.lastX = event.clientX;
                }}
                onPointerUp={(event) => {
                  if (!quickSelectGesture.current.active) {
                    return;
                  }

                  const deltaX =
                    quickSelectGesture.current.lastX -
                    quickSelectGesture.current.startX;

                  quickSelectGesture.current.active = false;

                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }

                  if (Math.abs(deltaX) < QUICK_SWIPE_THRESHOLD) {
                    return;
                  }

                  skipQuickSelectClick.current = true;

                  shiftQuickSelect(deltaX < 0 ? "next" : "previous");

                  window.setTimeout(() => {
                    skipQuickSelectClick.current = false;
                  }, 0);
                }}
                onPointerCancel={(event) => {
                  quickSelectGesture.current.active = false;

                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
              >
                {quickSelectPages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`${styles.quickSelectItem} ${
                      pageNumber === quickSelectCenter
                        ? styles.quickSelectItemActive
                        : ""
                    }`}
                    aria-label={`Buka halaman ${pageNumber}`}
                    aria-current={
                      pageNumber === quickSelectCenter ? "page" : undefined
                    }
                    onClick={() => selectQuickPage(pageNumber)}
                  >
                    <canvas
                      ref={(node: HTMLCanvasElement | null) => {
                        if (node) {
                          quickSelectCanvases.current.set(pageNumber, node);
                        } else {
                          quickSelectCanvases.current.delete(pageNumber);
                        }
                      }}
                      aria-hidden="true"
                    />

                    <span className={styles.quickSelectPageNumber}>
                      {pageNumber}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={spreadClassName}>
              {showSidePreviews ? (
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

              <div
                key={page}
                className={`${styles.pdfPage} ${pageAnimationClass}`}
              >
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

              {showSidePreviews ? (
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
          )}

          <p className={styles.srOnly}>{text}</p>

          <div
            className={styles.controlsHoverZone}
            aria-hidden="true"
            onMouseEnter={keepControlsVisible}
            onMouseMove={keepControlsVisible}
            onMouseLeave={scheduleControlsHide}
          />

          <div
            className={`${styles.pageControls} ${
              controlsVisible
                ? styles.pageControlsVisible
                : styles.pageControlsHidden
            }`}
            aria-label="Navigasi halaman dan zoom"
            onPointerDown={(event) => {
              pointerGesture.current.active = false;

              event.stopPropagation();
            }}
            onMouseEnter={keepControlsVisible}
            onMouseMove={keepControlsVisible}
            onMouseLeave={scheduleControlsHide}
            onFocusCapture={keepControlsVisible}
            onBlurCapture={scheduleControlsHide}
          >
            <button
              data-button="icon"
              data-button-size="sm"
              data-button-shape="square"
              type="button"
              className={styles.readerControl}
              disabled={!document || page <= 1}
              aria-label="Halaman sebelumnya"
              onClick={() => move(page - 1, "previous")}
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
              onClick={() => move(page + 1, "next")}
            >
              <FiChevronRight size={20} aria-hidden="true" />
            </button>

            <button
              data-button="icon"
              data-button-size="sm"
              data-button-shape="square"
              type="button"
              className={`${styles.readerControl} ${styles.zoomControl}`}
              disabled={(fitMode ? fitZoom : zoom) <= MIN_ZOOM}
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
              disabled={(fitMode ? fitZoom : zoom) >= MAX_ZOOM}
              aria-label="Perbesar tampilan"
              onClick={zoomIn}
            >
              <span aria-hidden="true">+</span>
            </button>

            <button
              data-button="secondary"
              data-button-size="sm"
              type="button"
              className={`${styles.readerControl} ${styles.pagePickerControl} ${
                quickSelectOpen ? styles.pagePickerControlActive : ""
              }`}
              disabled={!document}
              aria-label="Pilih halaman cepat"
              aria-pressed={quickSelectOpen}
              onClick={toggleQuickSelect}
            >
              Pilih
            </button>
          </div>
        </>
      )}
    </div>
  );
}
