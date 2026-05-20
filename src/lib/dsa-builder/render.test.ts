import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildContext } from "./build-context";
import { renderToBuffer } from "./render";
import { extractDocxText } from "./docx-text";
import type { Counterparty, Intake } from "./schema";

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

const englandSchoolCounterparty: Counterparty = {
  legalName: "Example Academy Trust",
  shortName: "the Academy",
  address: "1 Example Street, Example Town, EX1 1EX",
  signatoryName: "",
  signatoryPosition: "",
  signatoryDate: "",
  signatoryPlace: "",
  witnessName: "",
  witnessPosition: "",
  witnessDate: "",
  witnessAddress: "",
  repJobTitle: "",
  repAddress: "",
  repEmail: "",
  repPhone: "",
  escalationJobTitle: "",
  escalationAddress: "",
  escalationEmail: "",
  escalationPhone: "",
  coveredSchoolsSites: "",
};

const englandSchoolIntake: Intake = {
  jurisdiction: "England",
  counterpartyType: "AcademyOrFreeSchool",
  includeCriminalRecord: true,
  includeFundraising: true,
  counterparty: englandSchoolCounterparty,
  mcr: {
    signatoryName: "",
    signatoryPosition: "Head of Schools",
    signatoryDate: "",
    witnessName: "",
    witnessPosition: "Programme Manager",
    witnessDate: "",
  },
};

function renderText(intake: Intake): string {
  return extractDocxText(renderToBuffer(TEMPLATE, buildContext(intake)));
}

describe("conditional content removal", () => {
  it("omits S1/S2 groupwork content when includeGroupwork is false (Scotland)", () => {
    const intake = loadIntake("sample-scotland.json");
    intake.includeGroupwork = false;
    expect(renderText(intake)).not.toMatch(/S1 and S2/);
  });

  it("omits Year 7/8 groupwork content when includeGroupwork is false in England", () => {
    expect(
      renderText({ ...englandSchoolIntake, includeGroupwork: false }),
    ).not.toMatch(/Year 7 and Year 8/);
  });

  it("omits criminal record content when includeCriminalRecord is false", () => {
    const text = renderText({ ...englandSchoolIntake, includeCriminalRecord: false });
    expect(text).not.toMatch(/criminal record/i);
    expect(text).not.toMatch(/Article 10/);
  });

  it("omits fundraising content when includeFundraising is false", () => {
    const text = renderText({ ...englandSchoolIntake, includeFundraising: false });
    expect(text).not.toMatch(/fundraising/i);
  });
});

describe("schedule structure differs by counterparty", () => {
  it("LA counterparty: 'Schedule Part 8' present and 'eight (8)' wording", () => {
    const text = renderText(loadIntake("sample-scotland.json"));
    expect(text).toContain("Schedule Part 8");
    expect(text).toContain("eight (8)");
  });

  it("School counterparty: 'Schedule Part 8' absent and 'seven (7)' wording", () => {
    const text = renderText(englandSchoolIntake);
    expect(text).not.toContain("Schedule Part 8");
    expect(text).toContain("seven (7)");
  });
});
