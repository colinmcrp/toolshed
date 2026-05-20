import { describe, expect, it } from "vitest";
import { buildFilename } from "./filename";

// Constructs a Date in the runner's local timezone, so the asserted
// filename does not depend on where the test is run.
function localDate(year: number, monthOneIndexed: number, day: number): Date {
  return new Date(year, monthOneIndexed - 1, day);
}

describe("buildFilename", () => {
  it("uses YYYY-MM-DD date and replaces spaces with underscores", () => {
    expect(buildFilename("the Council", localDate(2026, 5, 20)))
      .toBe("MCR_DSA_the_Council_2026-05-20.docx");
  });

  it("strips punctuation other than alphanumerics and underscore", () => {
    expect(buildFilename("St. Mary's Academy", localDate(2026, 1, 2)))
      .toBe("MCR_DSA_St_Marys_Academy_2026-01-02.docx");
  });

  it("collapses runs of underscores", () => {
    expect(buildFilename("  the   Council  ", localDate(2026, 1, 2)))
      .toBe("MCR_DSA_the_Council_2026-01-02.docx");
  });

  it("falls back when short name sanitises to empty", () => {
    expect(buildFilename("!!!", localDate(2026, 1, 2)))
      .toBe("MCR_DSA_counterparty_2026-01-02.docx");
  });

  it("uses the local calendar date, not UTC", () => {
    // 2026-05-20 23:30 in Europe/London (BST, UTC+1) is 22:30 UTC same day,
    // but constructing via Date.UTC and then formatting locally still gives
    // the local date. Use the local-time constructor to make this assertion
    // deterministic across timezones.
    expect(buildFilename("the Council", localDate(2026, 5, 20)))
      .toBe("MCR_DSA_the_Council_2026-05-20.docx");
  });
});
