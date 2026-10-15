const sizes = {
  sm: "h-[4.5rem] w-12 text-[0.5rem]",
  md: "h-30 w-20 text-xs",
  lg: "h-48 w-32 text-sm",
} as const;

/** Muted tones for generated covers; the same title always gets the same tone. */
const tones = [
  "bg-[#e8dccb] text-[#3d3227]",
  "bg-[#d6e0d3] text-[#26352a]",
  "bg-[#dcd6e6] text-[#2f2a3d]",
  "bg-[#e6d3d0] text-[#3d2826]",
  "bg-[#d3dee6] text-[#22313d]",
  "bg-[#e3e0cc] text-[#36331f]",
];

export function coverTone(title: string) {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return tones[Math.abs(hash) % tones.length];
}

type BookCoverProps = {
  title: string;
  coverUrl: string | null;
  size?: keyof typeof sizes;
  /** Covers next to the title are decorative; pass alt text only when the cover stands alone. */
  alt?: string;
  className?: string;
};

/**
 * Book cover from the book database, or a plain generated cover with the title (D3: no cover
 * upload in v1). `coverUrl` is the copy in Supabase Storage when there is one, else the original
 * Open Library / Google Books URL (T20).
 */
export function BookCover({
  title,
  coverUrl,
  size = "md",
  alt = "",
  className = "",
}: BookCoverProps) {
  const frame = `${sizes[size]} shrink-0 overflow-hidden rounded-md border border-border ${className}`;

  if (coverUrl) {
    return (
      // Covers come from many hosts and sizes; Vercel image optimisation would use up the free
      // quota quickly, so the browser loads them as they are.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`${frame} bg-border object-cover`}
      />
    );
  }

  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={`${frame} ${coverTone(title)} flex items-center justify-center p-1.5 text-center font-serif leading-tight font-semibold`}
    >
      <span className="line-clamp-4">{title}</span>
    </span>
  );
}
