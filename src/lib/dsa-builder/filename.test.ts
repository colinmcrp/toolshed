import { describe, expect, it } from "vitest";
import { buildFilename } from "./filename";

describe("buildFilename", () => {
  it("uses YYYY-MM-DD date and replaces spaces with underscores", () => {
    expect(buildFilename("the Council", new Date("2026-05-20T09:00:00Z")))
      .toBe("MCR_DSA_the_Council_2026-05-20.docx");
  });

  it("strips punctuation other than alphanumerics and underscore", () => {
    expect(buildFilename("St. Mary's Academy", new Date("2026-01-02T00:00:00Z")))
      .toBe("MCR_DSA_St_Marys_Academy_2026-01-02.docx");
  });

  it("collapses runs of underscores", () => {
    expect(buildFilename("  the   Council  ", new Date("2026-01-02T00:00:00Z")))
      .toBe("MCR_DSA_the_Council_2026-01-02.docx");
  });

  it("falls back when short name sanitises to empty", () => {
    expect(buildFilename("!!!", new Date("2026-01-02T00:00:00Z")))
      .toBe("MCR_DSA_counterparty_2026-01-02.docx");
  });
});
