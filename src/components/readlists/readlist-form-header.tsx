import { CloseLink } from "./close-link";

/** Header of C3: × and the title on one line, as in the wireframe. */
export function ReadlistFormHeader({
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
