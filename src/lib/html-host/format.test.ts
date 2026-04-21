import { describe, it, expect } from "vitest";
import { formatBytes, formatRelative } from "./format";

// ─── formatBytes ──────────────────────────────────────────────────────────────

describe("formatBytes", () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it('returns "500 B" for 500 bytes', () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it('returns "1.0 KB" for 1024 bytes', () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it('returns "1.5 KB" for 1536 bytes', () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it('returns "5.0 MB" for 5 * 1024 * 1024 bytes', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

// ─── formatRelative ───────────────────────────────────────────────────────────

describe("formatRelative", () => {
  function isoSecondsAgo(seconds: number): string {
    return new Date(Date.now() - seconds * 1000).toISOString();
  }

  it('returns "just now" for a date 30 seconds ago', () => {
    const result = formatRelative(isoSecondsAgo(30));
    expect(result.toLowerCase()).toMatch(/second|just now/);
  });

  it("includes 'min' for a date 5 minutes ago", () => {
    const result = formatRelative(isoSecondsAgo(5 * 60));
    expect(result).toMatch(/minute|min/);
  });

  it("includes 'hr' for a date 2 hours ago", () => {
    const result = formatRelative(isoSecondsAgo(2 * 60 * 60));
    expect(result).toMatch(/hour|hr/);
  });

  it("includes 'day' for a date 3 days ago", () => {
    const result = formatRelative(isoSecondsAgo(3 * 24 * 60 * 60));
    expect(result).toMatch(/day/);
  });
});
