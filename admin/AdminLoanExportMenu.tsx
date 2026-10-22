"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { FiChevronDown, FiDownload } from "react-icons/fi";
import { Button } from "@/components/Button";
import styles from "./AdminLoanExportMenu.module.css";

type Props = {
  physicalAvailable: boolean;
  ebookAvailable: boolean;
  disabled?: boolean;
  className?: string;
  onPhysical: () => void;
  onEbook: () => void;
};

export default function AdminLoanExportMenu({ physicalAvailable, ebookAvailable, disabled = false, className = "", onPhysical, onEbook }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const last = useRef(false);
  const [open, setOpen] = useState(false);
  const blocked = disabled || (!physicalAvailable && !ebookAvailable);
  if (blocked && open) setOpen(false);

  useEffect(() => {
    const element = menu.current, button = trigger.current;
    if (!open || !element || !button) return;
    function position() {
      if (!element || !button) return;
      const anchor = button.getBoundingClientRect();
      const width = Math.min(240, window.innerWidth - 32);
      element.style.width = `${width}px`;
      element.style.left = `${Math.max(16, Math.min(anchor.right - width, window.innerWidth - width - 16))}px`;
      const height = element.getBoundingClientRect().height;
      element.style.top = `${Math.max(16, Math.min(anchor.bottom + 8, window.innerHeight - height - 16))}px`;
    }
    element.showPopover();
    position();
    const observer = new ResizeObserver(position);
    observer.observe(button);
    observer.observe(element);
    const items = [...element.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
    (last.current ? items.at(-1) : items[0])?.focus({ preventScroll: true });
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      const restore = element.contains(document.activeElement) || document.activeElement === document.body;
      if (element.matches(":popover-open")) element.hidePopover();
      if (restore) button.focus({ preventScroll: true });
    };
  }, [open]);

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Tab") {
      trigger.current?.focus({ preventScroll: true });
      setOpen(false);
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      if (!items.length) return;
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const index = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
        : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[index]?.focus();
    }
  }

  return <div className={`${styles.root} ${className}`} data-loan-export-menu>
    <Button ref={trigger} variant="primary" accentHover icon={<FiDownload />} className={styles.trigger}
      disabled={blocked} aria-label="Ekspor data peminjaman CSV" aria-haspopup="menu" aria-expanded={open}
      aria-controls={open ? id : undefined} onClick={() => { last.current = false; setOpen(value => !value); }}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          last.current = event.key === "ArrowUp";
          setOpen(true);
        }
      }}>
      Ekspor CSV <FiChevronDown aria-hidden="true" />
    </Button>
    {open && <div ref={menu} id={id} popover="auto" role="menu" aria-label="Pilihan ekspor peminjaman" className={styles.menu}
      onKeyDown={keyboard} onToggle={event => { if (event.newState === "closed") setOpen(false); }}>
      <button type="button" role="menuitem" disabled={!physicalAvailable} onClick={() => { onPhysical(); setOpen(false); }}>Ekspor Buku Fisik</button>
      <button type="button" role="menuitem" disabled={!ebookAvailable} onClick={() => { onEbook(); setOpen(false); }}>Ekspor E-Book</button>
    </div>}
  </div>;
}
