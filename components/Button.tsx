import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "back"
  | "ghost"
  | "danger"
  | "success"
  | "warning"
  | "icon";

export type RowActionVariant = "neutral" | "primary" | "info" | "warning" | "success" | "danger-soft" | "danger";

type ButtonAppearance = {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: ReactNode;
  rowAction?: RowActionVariant;
  accentHover?: boolean;
};

type ButtonProps = ComponentProps<"button"> &
  ButtonAppearance & {
    loading?: boolean;
    loadingLabel?: ReactNode;
  };

/** Native semantics and the same opt-in styles used by existing actions. */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  rowAction,
  accentHover = false,
  loading = false,
  loadingLabel = "Memproses...",
  children,
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      data-button={variant}
      data-row-action={rowAction}
      data-button-hover={accentHover ? "accent" : undefined}
      data-button-size={size}
      data-button-full-width={fullWidth || undefined}
      data-button-loading={loading || undefined}
      disabled={disabled || loading}
      aria-busy={loading || props["aria-busy"]}
    >
      {icon ? (
        <span data-button-icon aria-hidden>
          {icon}
        </span>
      ) : null}
      <ButtonLabel loading={loading} pending={loadingLabel}>
        {children}
      </ButtonLabel>
    </button>
  );
}

/** Also keeps existing native action labels steady without replacing handlers. */
export function ButtonLabel({
  loading,
  pending,
  children,
}: {
  loading: boolean;
  pending: ReactNode;
  children: ReactNode;
}) {
  return (
    <span data-button-labels data-loading={loading}>
      <span data-button-label aria-hidden={loading || undefined}>
        {children}
      </span>
      <span data-button-pending aria-hidden={!loading}>
        {pending}
      </span>
    </span>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  icon,
  rowAction,
  accentHover = false,
  children,
  ...props
}: ComponentProps<typeof Link> & ButtonAppearance) {
  return (
    <Link
      {...props}
      data-button={variant}
      data-row-action={rowAction}
      data-button-hover={accentHover ? "accent" : undefined}
      data-button-size={size}
      data-button-full-width={fullWidth || undefined}
    >
      {icon ? (
        <span data-button-icon aria-hidden>
          {icon}
        </span>
      ) : null}
      {children}
    </Link>
  );
}
