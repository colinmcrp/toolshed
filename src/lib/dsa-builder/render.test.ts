import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildContext } from "./build-context";
import { renderToBuffer } from "./render";
import { extractDocxText } from "./docx-text";
import type { Intake } from "./schema";

const repoRoot = resolve(__dirname, "..", "..", "..");
const TEMPLATE = readFileSync(
  resolve(repoRoot, "public", "MCR_DSA_Master_Template.docx"),
);
const FIXTURE_DIR = resolve(__dirname, "fixtures");

function loadIntake(file: string): Intake {
  const raw = JSON.parse(readFileSync(resolve(FIXTURE_DIR, file), "utf8"));
  // Strip the _comment field used in the JSON fixtures.
  delete raw._comment;
  return raw as Intake;
}

function loadFixture(file: string): Buffer {
  return readFileSync(resolve(FIXTURE_DIR, file));
}

function normaliseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

describe("renderToBuffer — parity with reference fixtures", () => {
  it("Scotland LA fixture matches reference output text", () => {
    const intake = loadIntake("sample-scotland.json");
    const got = renderToBuffer(TEMPLATE, buildContext(intake));
    const expected = loadFixture("sample-scotland.generated.docx");
    expect(normaliseWhitespace(extractDocxText(got))).toBe(
      normaliseWhitespace(extractDocxText(expected)),
    );
  });

  it("England academy fixture matches reference output text", () => {
    const intake = loadIntake("sample-england-academy.json");
    const got = renderToBuffer(TEMPLATE, buildContext(intake));
    const expected = loadFixture("sample-england-academy.generated.docx");
    expect(normaliseWhitespace(extractDocxText(got))).toBe(
      normaliseWhitespace(extractDocxText(expected)),
    );
  });

  it("produces no stray {token} substrings in extracted text", () => {
    const intake = loadIntake("sample-scotland.json");
    const got = renderToBuffer(TEMPLATE, buildContext(intake));
    expect(extractDocxText(got)).not.toMatch(/\{[A-Za-z]/);
  });

  it("produces no literal 'undefined' in extracted text", () => {
    const intake = loadIntake("sample-england-academy.json");
    const got = renderToBuffer(TEMPLATE, buildContext(intake));
    expect(extractDocxText(got)).not.toContain("undefined");
  });
});
