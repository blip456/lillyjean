import { CloseLink } from "@/components/readlists/close-link";

/**
 * Header of E6 / E8: × and the title on one line, as in the wireframe. × goes back to where the
 * form was opened from, or to `closeHref` when it was opened directly.
 */
export function ChallengeFormHeader({
  title,
  closeHref,
  closeLabel,
}: {
  title: string;
  closeHref: string;
  closeLabel: string;
}) {
  return (
    <header className="flex min-h-11 items-center gap-2">
      <CloseLink fallback={closeHref} label={closeLabel} />
      <h1 className="font-serif text-2xl leading-tight font-semibold">
        {title}
      </h1>
    </header>
  );
}
