"use client";

import { Children, Fragment, isValidElement, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode, type Ref, type SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown } from "react-icons/fi";

type SelectOption = { value: string | number; label: string; disabled?: boolean };
type AppSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "multiple" | "onKeyDown"> & {
  options?: SelectOption[];
  label?: string;
  placeholder?: string;
  loading?: boolean;
  icon?: ReactNode;
  error?: string;
  size?: "sm" | "md";
  ref?: Ref<HTMLButtonElement>;
};

function textContent(node: ReactNode): string {
  return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child) ? textContent(child.props.children) : String(child)).join("");
}

function childOptions(children: ReactNode, groupDisabled = false): SelectOption[] {
  const result: SelectOption[] = [];
  Children.forEach(children, child => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) return;
    if (child.type === "option") {
      const label = textContent(child.props.children);
      result.push({ value: child.props.value ?? label, label, disabled: groupDisabled || child.props.disabled });
    } else if (child.type === Fragment || child.type === "optgroup") {
      result.push(...childOptions(child.props.children, groupDisabled || Boolean(child.props.disabled)));
    }
  });
  return result;
}

/** Custom single select; the inaccessible native bridge retains form and ChangeEvent semantics. */
export default function AppSelect({ options, children, value, defaultValue, onChange, onInvalid, label, placeholder = "Pilih pilihan", loading = false, disabled = false, icon, error, size = "md", className, id, ref, required, ...nativeProps }: AppSelectProps) {
  const generated = useId();
  const triggerId = id ?? `select-${generated}`;
  const panelId = `${triggerId}-options`;
  const trigger = useRef<HTMLButtonElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLSpanElement>(null);
  const rows = options ?? childOptions(children);
  const [uncontrolled, setUncontrolled] = useState(() => String(defaultValue ?? rows.find(row => !row.disabled)?.value ?? ""));
  const selectedValue = String(value ?? uncontrolled);
  const selected = rows.find(row => String(row.value) === selectedValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [host, setHost] = useState<Element | null>(null);
  const [implicitLabel, setImplicitLabel] = useState("");
  const [validation, setValidation] = useState("");
  const typeahead = useRef({ text: "", time: 0 });
  const controlledValue = useRef(value);
  const blocked = disabled || loading;
  if (blocked && open) setOpen(false);
  const message = error || validation;
  const describedBy = [nativeProps["aria-describedby"], message ? `${triggerId}-error` : undefined].filter(Boolean).join(" ") || undefined;
  useImperativeHandle(ref, () => trigger.current!, []);

  useEffect(() => {
    const button = trigger.current;
    if (!button || label || nativeProps["aria-label"] || nativeProps["aria-labelledby"]) return;
    const labels = Array.from(button.labels ?? []).map(element => {
      const copy = element.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("[data-app-select]").forEach(control => control.remove());
      return copy.textContent?.trim() ?? "";
    }).filter(Boolean).join(" ");
    setImplicitLabel(labels);
  }, [label, nativeProps]);

  useLayoutEffect(() => {
    controlledValue.current = value;
    if (value === undefined && native.current) setUncontrolled(native.current.value);
  }, [children, options, value]);

  useEffect(() => {
    const form = native.current?.form;
    if (!form) return;
    let pending: ReturnType<typeof setTimeout>;
    // Reset's default action happens after its event/microtasks; read the restored value afterwards.
    const reset = (event: Event) => { pending = setTimeout(() => {
      if (event.defaultPrevented) return;
      if (controlledValue.current === undefined) setUncontrolled(native.current?.value ?? "");
      else if (native.current) native.current.value = String(controlledValue.current);
      setValidation("");
      setOpen(false);
    }, 0); };
    form.addEventListener("reset", reset);
    return () => { form.removeEventListener("reset", reset); clearTimeout(pending); };
  }, []);

  useLayoutEffect(() => {
    if (!open || !panel.current || !trigger.current) return;
    const element = panel.current;
    const button = trigger.current;
    function position() {
      const anchor = button.getBoundingClientRect();
      const margin = 8;
      const below = window.innerHeight - anchor.bottom - margin * 2;
      const above = anchor.top - margin * 2;
      const up = below < Math.min(320, element.scrollHeight) && above > below;
      const height = Math.max(0, Math.min(320, up ? above : below));
      const width = Math.min(anchor.width, window.innerWidth - margin * 2);
      element.style.width = `${width}px`;
      element.style.maxHeight = `${height}px`;
      element.style.left = `${Math.max(margin, Math.min(anchor.left, window.innerWidth - width - margin))}px`;
      element.style.top = `${up ? Math.max(margin, anchor.top - margin - Math.min(height, element.scrollHeight)) : anchor.bottom + margin}px`;
      element.dataset.placement = up ? "top" : "bottom";
    }
    // A portal inside the owning dialog avoids its inert background; popover escapes clipping.
    element.showPopover?.();
    position();
    const observer = new ResizeObserver(position);
    observer.observe(button);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      if (element.matches(":popover-open")) element.hidePopover();
    };
  }, [open, host]);

  useLayoutEffect(() => {
    const container = panel.current;
    const option = container?.querySelector<HTMLElement>(`[data-select-index="${active}"]`);
    if (!container || !option) return;
    if (option.offsetTop < container.scrollTop) container.scrollTop = option.offsetTop - 8;
    else if (option.offsetTop + option.offsetHeight > container.scrollTop + container.clientHeight) container.scrollTop = option.offsetTop + option.offsetHeight - container.clientHeight + 8;
  }, [active, open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [open]);

  const enabled = rows.map((row, index) => row.disabled ? -1 : index).filter(index => index >= 0);
  function reveal(preferred?: number) {
    if (blocked) return;
    setHost(trigger.current?.closest('dialog[open], [popover]:popover-open') ?? document.body);
    const current = rows.findIndex(row => String(row.value) === selectedValue && !row.disabled);
    setActive(preferred ?? (current >= 0 ? current : enabled[0] ?? -1));
    setOpen(true);
  }
  function choose(index: number) {
    const option = rows[index];
    if (blocked || !option || option.disabled || !native.current) return;
    if (native.current.value !== String(option.value)) {
      native.current.value = String(option.value);
      native.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (blocked) return;
    const key = event.key;
    if (key === "Tab") { setOpen(false); return; }
    if (key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      if (open) choose(active); else reveal();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) {
      event.preventDefault();
      if (!open) reveal(key === "End" || key === "ArrowUp" ? enabled.at(-1) : key === "Home" ? enabled[0] : undefined);
      else if (key === "Home") setActive(enabled[0] ?? -1);
      else if (key === "End") setActive(enabled.at(-1) ?? -1);
      else {
        const current = enabled.indexOf(active);
        setActive(enabled[(current + (key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length] ?? -1);
      }
    } else if (key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      const time = Date.now();
      const search = (time - typeahead.current.time < 800 ? typeahead.current.text : "") + key.toLocaleLowerCase();
      typeahead.current = { text: search, time };
      const match = enabled.find(index => rows[index].label.toLocaleLowerCase().startsWith(search));
      if (match !== undefined) { if (!open) reveal(match); else setActive(match); }
    }
  }
  function changed(event: ChangeEvent<HTMLSelectElement>) {
    if (value === undefined) setUncontrolled(event.target.value);
    setValidation("");
    onChange?.(event);
  }

  return <span ref={root} className={className} data-app-select data-select-size={size}>
    {label && <span data-select-label id={`${triggerId}-label`}>{label}</span>}
    <button ref={trigger} id={triggerId} type="button" role="combobox" data-select-trigger disabled={blocked}
      aria-label={nativeProps["aria-label"] ?? (!label && !nativeProps["aria-labelledby"] ? implicitLabel || placeholder : undefined)}
      aria-labelledby={nativeProps["aria-labelledby"] ?? (label ? `${triggerId}-label` : undefined)}
      aria-expanded={open} aria-controls={open ? panelId : undefined} aria-haspopup="listbox"
      aria-activedescendant={open && active >= 0 ? `${panelId}-${active}` : undefined}
      aria-required={required} aria-invalid={Boolean(message) || nativeProps["aria-invalid"]} aria-describedby={describedBy} aria-busy={loading}
      onClick={() => open ? setOpen(false) : reveal()} onKeyDown={keyboard}
      onBlur={event => { if (!panel.current?.contains(event.relatedTarget)) setOpen(false); }}>
      {icon && <span data-select-icon aria-hidden="true">{icon}</span>}
      <span data-select-value data-placeholder={!selected || selected.value === ""}>{loading ? "Memuat..." : selected?.label || placeholder}</span>
      <FiChevronDown data-select-chevron aria-hidden="true" />
    </button>
    <select {...nativeProps} ref={native} id={`${triggerId}-native`} data-select-native aria-hidden="true" tabIndex={-1}
      value={value} defaultValue={defaultValue} disabled={blocked} required={required} onChange={changed}
      onInvalid={event => { event.preventDefault(); setValidation(event.currentTarget.validationMessage); trigger.current?.focus(); onInvalid?.(event); }}>
      {options ? options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>) : children}
    </select>
    {message && <span data-select-error id={`${triggerId}-error`} role="alert">{message}</span>}
    {open && host && !blocked && createPortal(<div ref={panel} id={panelId} role="listbox" popover="manual" data-select-panel
      aria-label={nativeProps["aria-label"] ?? label ?? (implicitLabel || placeholder)}
      onPointerDown={event => { if ((event.target as Element).closest('[role="option"]')) event.preventDefault(); }}>
      {rows.length ? rows.map((option, index) => <div key={`${option.value}-${index}`} role="option" id={`${panelId}-${index}`} data-select-index={index}
        aria-selected={String(option.value) === selectedValue} aria-disabled={Boolean(option.disabled)} data-active={index === active}
        onPointerMove={() => { if (!option.disabled) setActive(index); }} onClick={() => choose(index)}>
        <span>{option.label}</span>{String(option.value) === selectedValue && <FiCheck data-select-check aria-hidden="true" />}
      </div>) : <p data-select-empty>Tidak ada pilihan tersedia.</p>}
    </div>, host)}
  </span>;
}
