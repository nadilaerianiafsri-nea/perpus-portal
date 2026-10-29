"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { FiAlertTriangle, FiCheckCircle, FiInfo } from "react-icons/fi";
import { Button } from "./Button";
import styles from "./ConfirmDialog.module.css";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  variant?: "primary" | "info" | "warning" | "danger" | "success";
  size?: "default" | "compact";
  icon?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  pending?: boolean;
  error?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel: () => void;
  children?: ReactNode;
};

/** Controlled confirmation surface; callers retain their existing mutation flow. */
export default function ConfirmDialog({
  open,
  title,
  description,
  variant = "primary",
  size = "default",
  icon,
  confirmLabel = "Konfirmasi",
  cancelLabel,
  loadingLabel = "Memproses...",
  pending = false,
  error = "",
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const dismissButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const locked = useRef(false);
  const pressedOutside = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [unexpectedError, setUnexpectedError] = useState("");
  const busy = pending || confirming;
  const message = error || unexpectedError;

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;

    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    // Begin on the safe action, especially for destructive confirmations.
    dismissButton.current?.focus({ preventScroll: true });

    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = [...element.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )].filter((control) => control.getClientRects().length > 0 && getComputedStyle(control).visibility !== "hidden");
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        element.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
      } else if (!element.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", keepFocus, true);

    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) {
      document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight || "0") + scrollbar}px`;
    }
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", keepFocus, true);
      if (element.open) element.close();
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = padding;
      if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Prevent the browser's close request even when disabled controls lose focus.
      event.preventDefault();
      event.stopPropagation();
      if (pending || locked.current) return;
      setUnexpectedError("");
      onCancel();
    };
    document.addEventListener("keydown", closeOnEscape, true);
    return () => document.removeEventListener("keydown", closeOnEscape, true);
  }, [open, pending, onCancel]);

  function dismiss() {
    if (pending || locked.current) return;
    setUnexpectedError("");
    onCancel();
  }

  async function confirm() {
    if (pending || locked.current || !onConfirm) return;
    locked.current = true;
    setConfirming(true);
    setUnexpectedError("");
    try {
      await onConfirm();
    } catch {
      setUnexpectedError("Tindakan belum berhasil. Silakan coba lagi.");
    } finally {
      locked.current = false;
      setConfirming(false);
    }
  }

  function outside(clientX: number, clientY: number) {
    const rect = dialog.current?.getBoundingClientRect();
    return Boolean(rect && (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom));
  }

  const defaultIcon = variant === "danger" || variant === "warning"
    ? <FiAlertTriangle aria-hidden="true" />
    : variant === "info" ? <FiInfo aria-hidden="true" /> : <FiCheckCircle aria-hidden="true" />;

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      data-confirm-dialog
      data-dialog-variant={variant}
      data-dialog-size={size}
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      aria-busy={busy}
      onCancel={(event) => { event.preventDefault(); dismiss(); }}
      onPointerDown={(event) => { pressedOutside.current = event.target === event.currentTarget && outside(event.clientX, event.clientY); }}
      onPointerCancel={() => { pressedOutside.current = false; }}
      onClick={(event) => {
        const dismissOverlay = pressedOutside.current && event.target === event.currentTarget && outside(event.clientX, event.clientY);
        pressedOutside.current = false;
        if (dismissOverlay && variant !== "danger") dismiss();
      }}
    >
      <div className={styles.icon} aria-hidden="true">{icon ?? defaultIcon}</div>
      <h2 id={`${id}-title`} className={styles.title} tabIndex={-1}>{title}</h2>
      <div id={`${id}-description`} className={styles.description}>{description}</div>
      {children ? <div className={styles.details}>{children}</div> : null}
      {message ? <p className={styles.error} role="alert">{message}</p> : null}
      <div className={`${styles.actions} ${!onConfirm ? styles.singleAction : ""}`}>
        <Button ref={dismissButton} variant="secondary" size="lg" disabled={busy} onClick={dismiss}>
          {cancelLabel ?? (onConfirm ? "Batal" : "Tutup")}
        </Button>
        {onConfirm ? (
          <Button
            data-dialog-confirm
            variant={variant === "danger" ? "danger" : variant === "success" ? "success" : "primary"}
            size="lg"
            loading={busy}
            loadingLabel={loadingLabel}
            onClick={() => void confirm()}
          >
            {confirmLabel}
          </Button>
        ) : null}
      </div>
    </dialog>
  );
}
