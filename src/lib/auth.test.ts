import { describe, it, expect } from "vitest";
import { isAllowedEmail, isSafeNextPath } from "./auth";

describe("isAllowedEmail", () => {
  it("accepts the allowed domain", () => {
    expect(isAllowedEmail("colin.adam@mcrpathways.org")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAllowedEmail("Colin.Adam@MCRPathways.ORG")).toBe(true);
  });

  it("rejects other domains", () => {
    expect(isAllowedEmail("someone@gmail.com")).toBe(false);
  });

  it("rejects lookalike domains", () => {
    expect(isAllowedEmail("someone@evilmcrpathways.org")).toBe(false);
    expect(isAllowedEmail("someone@mcrpathways.org.evil.com")).toBe(false);
  });

  it("rejects empty input", () => {
    expect(isAllowedEmail("")).toBe(false);
  });
});

describe("isSafeNextPath", () => {
  it("accepts same-origin relative paths", () => {
    expect(isSafeNextPath("/")).toBe(true);
    expect(isSafeNextPath("/my-page.html")).toBe(true);
    expect(isSafeNextPath("/bundle/deep/asset.css")).toBe(true);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isSafeNextPath("//evil.com")).toBe(false);
    expect(isSafeNextPath("//evil.com/page")).toBe(false);
  });

  it("rejects absolute URLs", () => {
    expect(isSafeNextPath("https://evil.com")).toBe(false);
    expect(isSafeNextPath("javascript:alert(1)")).toBe(false);
  });

  it("rejects backslash tricks", () => {
    expect(isSafeNextPath("/\\evil.com")).toBe(false);
    expect(isSafeNextPath("\\\\evil.com")).toBe(false);
  });

  it("rejects empty and missing values", () => {
    expect(isSafeNextPath("")).toBe(false);
    expect(isSafeNextPath(null)).toBe(false);
    expect(isSafeNextPath(undefined)).toBe(false);
  });
});
