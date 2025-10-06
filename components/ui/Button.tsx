"use client";
import { ComponentPropsWithoutRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center font-medium transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed select-none";

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white hover:opacity-90 active:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/35",
  secondary:
    "bg-[var(--color-secondary)] text-white hover:opacity-90 active:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]/35",
  outline:
    "border border-[var(--color-muted)] bg-white text-[var(--color-ink)] hover:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25",
  ghost:
    "bg-transparent text-[var(--color-ink)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20",
};

type Props = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
  size?: Size;
};

export default function Button({
  className = "",
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  return (
    <button
      className={["rounded-full", base, sizes[size], variants[variant], className].join(" ")}
      {...props}
    />
  );
}
