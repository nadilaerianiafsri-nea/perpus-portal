"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./RowActionTooltip.module.css";

type Tooltip = { label: string; left: number; right: number; top: number; bottom: number };

/** One tooltip for the existing native row controls, including scrollable tables. */
export default function RowActionTooltip() {
  const id = useId();
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const cancelHide = useRef<() => void>(() => {});
  const leaveBubble = useRef<() => void>(() => {});

  useEffect(() => {
    let target: HTMLElement | null = null;
    let originalTitle: string | null = null;
    let dismissed: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => { clearTimeout(timer); };
    const hide = () => {
      clear();
      if (target) {
        if (originalTitle != null) target.setAttribute("title", originalTitle);
        const descriptions = (target.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(value => value && value !== id);
        if (descriptions.length) target.setAttribute("aria-describedby", descriptions.join(" "));
        else target.removeAttribute("aria-describedby");
      }
      target = null;
      originalTitle = null;
      setTooltip(null);
    };
    const trigger = (node: EventTarget | null) => node instanceof Element ? node.closest<HTMLElement>('[data-row-action][data-button-shape="square"]') : null;
    const show = (element: HTMLElement | null) => {
      clear();
      if (!element || element === dismissed) return;
      if (element === target) return;
      hide();
      const label = element.getAttribute("title") || element.getAttribute("aria-label");
      if (!label) return;
      target = element;
      originalTitle = element.getAttribute("title");
      // Suppress the native duplicate while the hover/focus tooltip is visible.
      element.removeAttribute("title");
      element.setAttribute("aria-describedby", `${element.getAttribute("aria-describedby") ?? ""} ${id}`.trim());
      const rect = element.getBoundingClientRect();
      setTooltip({ label, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
    };
    const scheduleHide = () => { clear(); timer = setTimeout(() => { if (target !== document.activeElement) hide(); }, 120); };
    const over = (event: PointerEvent) => { const element = trigger(event.target); if (element) show(element); };
    const out = (event: PointerEvent) => {
      const element = trigger(event.target);
      if (element && event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
      if (element === dismissed) dismissed = null;
      if (bubble.current && event.relatedTarget instanceof Node && bubble.current.contains(event.relatedTarget)) clear();
      else if (element === target) scheduleHide();
    };
    const focus = (event: FocusEvent) => show(trigger(event.target));
    const blur = (event: FocusEvent) => { if (trigger(event.target) === target) hide(); dismissed = null; };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { dismissed = target; hide(); } };
    cancelHide.current = clear;
    leaveBubble.current = scheduleHide;
    const observer = new MutationObserver(() => { if (target && !target.isConnected) hide(); });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", blur);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("blur", hide);
    return () => {
      hide(); observer.disconnect();
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", blur);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("blur", hide);
    };
  }, [id]);

  useLayoutEffect(() => {
    const element = bubble.current;
    if (!element || !tooltip) return;
    const rect = element.getBoundingClientRect();
    const left = Math.min(Math.max(8, (tooltip.left + tooltip.right - rect.width) / 2), window.innerWidth - rect.width - 8);
    const top = tooltip.top >= rect.height + 12 ? tooltip.top - rect.height - 8 : tooltip.bottom + 8;
    element.style.left = `${left}px`;
    element.style.top = `${Math.min(top, window.innerHeight - rect.height - 8)}px`;
  }, [tooltip]);

  return tooltip ? createPortal(<div ref={bubble} id={id} role="tooltip" className={styles.tooltip} onPointerEnter={() => cancelHide.current()} onPointerLeave={() => leaveBubble.current()}>{tooltip.label}</div>, document.body) : null;
}
