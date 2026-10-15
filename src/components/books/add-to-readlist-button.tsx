"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { AddToReadlistSheet } from "@/components/readlists/add-to-readlist-sheet";
import { Button } from "@/components/ui/button";
import type { BookListItem } from "@/lib/books/types";

/** "+ Add to readlist" on the book page (D2): opens the add-to-readlist sheet (C4). */
export function AddToReadlistButton({
  book,
}: {
  book: Pick<BookListItem, "id" | "title" | "authors">;
}) {
  const t = useTranslations("bookDetail");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        block
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">+</span>
        {t("addToReadlist")}
      </Button>
      <AddToReadlistSheet
        book={book}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
