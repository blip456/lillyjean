import type { ComponentProps } from "react";

import { Link } from "./link";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-border/40",
  ghost: "text-foreground underline-offset-4 hover:underline",
  danger: "border border-danger text-danger hover:bg-danger/10",
};

function classes(variant: Variant, block: boolean, className?: string) {
  return [base, variants[variant], block ? "w-full" : "", className ?? ""].join(
    " ",
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  block?: boolean;
};

export function Button({
  variant = "primary",
  block = false,
  className,
  ...props
}: ButtonProps) {
  return <button className={classes(variant, block, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  block?: boolean;
};

export function ButtonLink({
  variant = "primary",
  block = false,
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={classes(variant, block, className)} {...props} />;
}
