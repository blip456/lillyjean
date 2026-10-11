import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "block min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-base text-foreground aria-[invalid=true]:border-danger";

type FieldProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
};

/** Visible label above, hint and error below; wires up aria-describedby (WCAG 2.2). */
export function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {children(describedBy, Boolean(error))}
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = ComponentProps<"input">;

export function Input({ className, ...props }: InputProps) {
  return <input className={`${inputClass} ${className ?? ""}`} {...props} />;
}
