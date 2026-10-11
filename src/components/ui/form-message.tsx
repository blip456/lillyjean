type FormMessageProps = { message?: string; tone?: "error" | "success" };

/** Form-level message, announced to screen readers. */
export function FormMessage({ message, tone = "error" }: FormMessageProps) {
  if (!message) return null;

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${
        tone === "error"
          ? "border-danger/40 text-danger"
          : "border-success/40 text-success"
      }`}
    >
      {message}
    </p>
  );
}
