/** Initials avatar; photo upload comes later (P30). */
export function Avatar({
  username,
  size = "md",
}: {
  username: string | null;
  size?: "md" | "lg";
}) {
  const initial = (username ?? "?").charAt(0).toUpperCase();
  const dimensions = size === "lg" ? "size-16 text-2xl" : "size-11 text-lg";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-background font-serif font-semibold ${dimensions}`}
    >
      {initial}
    </span>
  );
}
