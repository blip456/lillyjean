import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const updateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ updateTag, revalidatePath }));

const { refreshScreens } = await import("./refresh-screens.server");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")
      ? [full]
      : [];
  });
}

describe("refreshScreens (T22)", () => {
  it("updates a tag that no fetch uses instead of revalidating paths", () => {
    refreshScreens();
    expect(updateTag).toHaveBeenCalledWith("screens");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("is the only way the app refreshes screens after a change", () => {
    // revalidatePath("/", "layout") also expires the cached book database responses, so every
    // book added from the search searched Open Library again (tester report after v0.4.2).
    const offenders = sourceFiles(path.join(process.cwd(), "src")).filter(
      (file) => /\brevalidatePath\s*\(/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
