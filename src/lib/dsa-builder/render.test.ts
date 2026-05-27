import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import PizZip from "pizzip";
import { buildContext } from "./build-context";
import { renderToBuffer } from "./render";
import { extractDocxText } from "./docx-text";
import type { Counterparty, Intake } from "./schema";

const repoRoot = resolve(__dirname, "..", "..", "..");
const TEMPLATE = readFileSync(
  resolve(repoRoot, "public", "MCR_DSA_Master_Template.docx"),
);
const CHARITY_TEMPLATE = readFileSync(
  resolve(repoRoot, "public", "MCR_DSA_Charity_Master_Template.docx"),
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

  it("Centrestage charity fixture matches reference output text", () => {
    const intake = loadIntake("sample-charity-centrestage.json");
    const got = renderToBuffer(CHARITY_TEMPLATE, buildContext(intake));
    const expected = loadFixture("sample-charity-centrestage.generated.docx");
    expect(normaliseWhitespace(extractDocxText(got))).toBe(
      normaliseWhitespace(extractDocxText(expected)),
    );
  });
});

describe("charity-to-charity track", () => {
  function renderCharity(): string {
    const intake = loadIntake("sample-charity-centrestage.json");
    return extractDocxText(
      renderToBuffer(CHARITY_TEMPLATE, buildContext(intake)),
    );
  }

  // §7.3 — no LA/school template content leaks into the charity output.
  // The LA-only education vocab (KS2, pupil premium, free school meals) is
  // permitted exactly once each, inside the explicit "Not within scope"
  // carve-out in Schedule Part 1.
  describe("no LA-template bleed-through", () => {
    it("contains no FOISA / FOIA references", () => {
      const text = renderCharity();
      expect(text).not.toMatch(/FOISA/);
      expect(text).not.toMatch(/FOIA/);
    });

    it("contains no Schedule Part 8 or 'eight (8)' schedule count", () => {
      const text = renderCharity();
      expect(text).not.toMatch(/Schedule Part 8/);
      expect(text).not.toMatch(/eight \(8\)/);
    });

    it("does not use 'the Council' as the counterparty short-name", () => {
      const text = renderCharity();
      expect(text).not.toMatch(/the Council/);
    });

    it("contains no 'Standards in Scotland' statutory anchor", () => {
      const text = renderCharity();
      expect(text).not.toMatch(/Standards in Scotland/);
    });

    it("limits LA education vocab to the single 'Not within scope' carve-out", () => {
      const text = renderCharity();
      // Each phrase may appear at most once, inside the Schedule Part 1
      // "Not within scope" paragraph that deliberately enumerates what the
      // charity DSA does not cover.
      expect(text.match(/KS2/g)?.length ?? 0).toBeLessThanOrEqual(1);
      expect(text.match(/pupil premium/g)?.length ?? 0).toBeLessThanOrEqual(1);
      expect(text.match(/free school meals/g)?.length ?? 0).toBeLessThanOrEqual(1);
    });
  });

  // §7.4 — charity-track substantive content must be present.
  describe("charity-track content present", () => {
    it("uses the counterparty short-name in body references", () => {
      expect(renderCharity()).toMatch(/Centrestage/);
    });

    it("anchors processing on Article 6(1)(a) and Article 9(2)(a)", () => {
      const text = renderCharity();
      expect(text).toMatch(/Article 6\(1\)\(a\)/);
      expect(text).toMatch(/Article 9\(2\)\(a\)/);
    });

    it("references Programme Consent and the Combined Privacy Notice", () => {
      const text = renderCharity();
      expect(text).toMatch(/Programme Consent/);
      expect(text).toMatch(/Combined Privacy Notice/);
    });

    it("includes the PVG Scheme safeguarding clause", () => {
      expect(renderCharity()).toMatch(/PVG Scheme/);
    });

    it("cites the Age of Legal Capacity (Scotland) Act 1991", () => {
      expect(renderCharity()).toMatch(/Age of Legal Capacity \(Scotland\) Act 1991/);
    });

    it("includes the forward-looking Article 26 clause", () => {
      expect(renderCharity()).toMatch(/Article 26/);
    });
  });

  it("renders the charity template with no stray {tokens}", () => {
    const intake = loadIntake("sample-charity-centrestage.json");
    const got = renderToBuffer(CHARITY_TEMPLATE, buildContext(intake));
    expect(extractDocxText(got)).not.toMatch(/\{[A-Za-z]/);
  });

  describe("conditional Background paragraph", () => {
    it("inserts the user-supplied paragraph between Background ¶1 and 'MCR delivers'", () => {
      const intake = loadIntake("sample-charity-centrestage.json");
      const text = extractDocxText(
        renderToBuffer(CHARITY_TEMPLATE, buildContext(intake)),
      );
      const flat = normaliseWhitespace(text);
      const anchor1 = "holds the consents to engage with them in its own programmes.";
      const customMatch = "music, theatre and community-based programmes";
      const anchor2 = "MCR delivers the MCR Pathways Mentoring Programme";
      const idx1 = flat.indexOf(anchor1);
      const idxC = flat.indexOf(customMatch);
      const idx2 = flat.indexOf(anchor2);
      expect(idx1).toBeGreaterThan(-1);
      expect(idxC).toBeGreaterThan(idx1);
      expect(idx2).toBeGreaterThan(idxC);
    });

    it("omits the paragraph entirely when background is blank", () => {
      const intake = loadIntake("sample-charity-centrestage.json");
      intake.counterparty.background = "";
      const text = extractDocxText(
        renderToBuffer(CHARITY_TEMPLATE, buildContext(intake)),
      );
      expect(text).not.toMatch(/music, theatre and community-based programmes/);
      // The two surrounding paragraphs must still be present and adjacent.
      const flat = normaliseWhitespace(text);
      const anchor1Idx = flat.indexOf("holds the consents to engage with them");
      const anchor2Idx = flat.indexOf("MCR delivers the MCR Pathways");
      expect(anchor1Idx).toBeGreaterThan(-1);
      expect(anchor2Idx).toBeGreaterThan(anchor1Idx);
      // Nothing between them but the paragraph break itself — no leftover
      // {#counterparty.hasBackground} or empty Background paragraph.
      const between = flat.slice(
        anchor1Idx + "holds the consents to engage with them in its own programmes.".length,
        anchor2Idx,
      );
      expect(between.trim()).toBe("");
    });

    it("trims-whitespace-only backgrounds out (no empty paragraph)", () => {
      const intake = loadIntake("sample-charity-centrestage.json");
      intake.counterparty.background = "   \n  ";
      const text = extractDocxText(
        renderToBuffer(CHARITY_TEMPLATE, buildContext(intake)),
      );
      expect(text).not.toMatch(/music, theatre and community-based/);
    });
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
  legalDescription: "",
  background: "",
};

const englandSchoolIntake: Intake = {
  jurisdiction: "England",
  counterpartyType: "AcademyOrFreeSchool",
  counterpartyWillSign: true,
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

  it("rewrites the junior groupwork clause to Y7/Y8 in England when includeGroupwork is true", () => {
    const text = renderText({ ...englandSchoolIntake, includeGroupwork: true });
    // Sentence template: "There is {article} {range} groupwork programme ..."
    expect(text).toMatch(/There is a Year 7 and Year 8 groupwork programme/);
    expect(text).not.toMatch(/S1 and S2/);
  });

  it("keeps the Scottish junior groupwork wording with 'an S1 and S2'", () => {
    const text = renderText(loadIntake("sample-scotland.json"));
    expect(text).toMatch(/There is an S1 and S2 groupwork programme/);
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

describe("MCR Pathways logo is baked into the template", () => {
  it("preserves the logo PNG in word/media after rendering", () => {
    const intake = loadIntake("sample-scotland.json");
    const got = renderToBuffer(TEMPLATE, buildContext(intake));
    const zip = new PizZip(got);
    const mediaFiles = Object.keys(zip.files).filter((f) =>
      f.startsWith("word/media/"),
    );
    expect(mediaFiles).toContain("word/media/mcr-logo.png");
  });

  it("preserves the logo <w:drawing> element in document.xml", () => {
    const intake = loadIntake("sample-england-academy.json");
    const got = renderToBuffer(TEMPLATE, buildContext(intake));
    const zip = new PizZip(got);
    const xml = zip.file("word/document.xml")?.asText() ?? "";
    expect(xml).toContain("<w:drawing>");
    expect(xml).toContain("rIdMCRLogo");
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

describe("renderToBuffer — signatures", () => {
  const FIXTURE_PNG = readFileSync(
    resolve(FIXTURE_DIR, "signature-fixture.png"),
  );

  function countMediaImages(bytes: Uint8Array): number {
    const zip = new PizZip(bytes);
    return Object.keys(zip.files).filter((name) =>
      /^word\/media\/.+\.(png|jpg|jpeg|gif)$/i.test(name),
    ).length;
  }

  it("inserts both images into word/media/ when both buffers are supplied", () => {
    const intake = loadIntake("sample-scotland.json");
    const baseline = renderToBuffer(TEMPLATE, buildContext(intake));
    const signed = renderToBuffer(TEMPLATE, buildContext(intake), {
      signatoryImage: FIXTURE_PNG,
      witnessImage: FIXTURE_PNG,
    });
    expect(countMediaImages(signed)).toBe(countMediaImages(baseline) + 2);
  });

  it("inserts no extra images when both buffers are absent", () => {
    const intake = loadIntake("sample-scotland.json");
    const baseline = renderToBuffer(TEMPLATE, buildContext(intake));
    const unsigned = renderToBuffer(TEMPLATE, buildContext(intake), {});
    expect(countMediaImages(unsigned)).toBe(countMediaImages(baseline));
  });

  it("rejects stray image tokens after rendering unsigned", () => {
    const intake = loadIntake("sample-scotland.json");
    const bytes = renderToBuffer(TEMPLATE, buildContext(intake), {});
    const text = extractDocxText(bytes);
    expect(text).not.toMatch(/\{%mcr/);
    expect(text).not.toMatch(/\{#mcrHas/);
    expect(text).not.toMatch(/\{\/mcrHas/);
  });

  it("inserts both signature images into the charity template's word/media", () => {
    const intake = loadIntake("sample-charity-centrestage.json");
    const baseline = renderToBuffer(CHARITY_TEMPLATE, buildContext(intake));
    const signed = renderToBuffer(CHARITY_TEMPLATE, buildContext(intake), {
      signatoryImage: FIXTURE_PNG,
      witnessImage: FIXTURE_PNG,
    });
    expect(countMediaImages(signed)).toBe(countMediaImages(baseline) + 2);
  });

  it("charity template: rejects stray image tokens after rendering unsigned", () => {
    const intake = loadIntake("sample-charity-centrestage.json");
    const bytes = renderToBuffer(CHARITY_TEMPLATE, buildContext(intake), {});
    const text = extractDocxText(bytes);
    expect(text).not.toMatch(/\{%mcr/);
    expect(text).not.toMatch(/\{#mcrHas/);
    expect(text).not.toMatch(/\{\/mcrHas/);
  });
});

describe("MCR Pathways logo is baked into the charity template", () => {
  it("preserves the logo PNG in word/media after rendering", () => {
    const intake = loadIntake("sample-charity-centrestage.json");
    const got = renderToBuffer(CHARITY_TEMPLATE, buildContext(intake));
    const zip = new PizZip(got);
    const mediaFiles = Object.keys(zip.files).filter((f) =>
      f.startsWith("word/media/"),
    );
    expect(mediaFiles).toContain("word/media/mcr-logo.png");
  });

  it("preserves the logo <w:drawing> element in document.xml", () => {
    const intake = loadIntake("sample-charity-centrestage.json");
    const got = renderToBuffer(CHARITY_TEMPLATE, buildContext(intake));
    const zip = new PizZip(got);
    const xml = zip.file("word/document.xml")?.asText() ?? "";
    expect(xml).toContain("<w:drawing>");
    expect(xml).toContain("rIdMCRLogo");
  });
});
