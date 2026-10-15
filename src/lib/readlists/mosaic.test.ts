import { describe, expect, it } from "vitest";

import { mosaicCells } from "./mosaic";

describe("mosaicCells", () => {
  it("fills an empty readlist with four neutral tiles", () => {
    expect(mosaicCells([])).toEqual([
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
      { kind: "empty" },
    ]);
  });

  it("uses covers in order, generated covers for books without one, then neutral tiles", () => {
    expect(
      mosaicCells([
        { title: "Emma", coverUrl: "https://example.test/emma.jpg" },
        { title: "The Quiet Shelf", coverUrl: null },
      ]),
    ).toEqual([
      {
        kind: "image",
        title: "Emma",
        coverUrl: "https://example.test/emma.jpg",
      },
      { kind: "generated", title: "The Quiet Shelf" },
      { kind: "empty" },
      { kind: "empty" },
    ]);
  });

  it("never shows more than four cells", () => {
    const covers = ["A", "B", "C", "D", "E"].map((title) => ({
      title,
      coverUrl: null,
    }));
    expect(mosaicCells(covers).map((cell) => cell.kind)).toEqual([
      "generated",
      "generated",
      "generated",
      "generated",
    ]);
    expect(
      mosaicCells(covers).map((cell) =>
        cell.kind === "empty" ? null : cell.title,
      ),
    ).toEqual(["A", "B", "C", "D"]);
  });

  it("treats an empty cover URL as no cover", () => {
    expect(mosaicCells([{ title: "Persuasion", coverUrl: "" }])[0]).toEqual({
      kind: "generated",
      title: "Persuasion",
    });
  });
});
