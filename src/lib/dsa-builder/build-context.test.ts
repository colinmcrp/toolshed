import { describe, expect, it } from "vitest";
import { buildCharityContext, buildContext, buildLaSchoolContext, formatDate, pickTemplate } from "./build-context";
import type { Intake } from "./schema";

const baseCounterparty = {
  legalName: "City of Edinburgh Council",
  shortName: "the Council",
  address: "Waverley Court, Edinburgh",
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
  coveredSchoolsSites: "All schools",
  legalDescription: "",
  background: "",
};

const scotlandIntake: Intake = {
  jurisdiction: "Scotland",
  counterpartyType: "LocalAuthority",
  counterpartyWillSign: true,
  includeCriminalRecord: true,
  includeFundraising: true,
  counterparty: baseCounterparty,
  mcr: {
    signatoryName: "",
    signatoryPosition: "Head of Schools",
    signatoryDate: "",
    witnessName: "",
    witnessPosition: "Programme Manager",
    witnessDate: "",
  },
};

describe("buildContext", () => {
  it("derives Scotland flags and defaults", () => {
    const ctx = buildLaSchoolContext(scotlandIntake);
    expect(ctx.isScotland).toBe(true);
    expect(ctx.isEngland).toBe(false);
    expect(ctx.isLA).toBe(true);
    expect(ctx.isSchool).toBe(false);
    expect(ctx.foi.short).toBe("FOISA");
    expect(ctx.childrenAct).toBe("Children (Scotland) Act 1995");
    expect(ctx.schedulePartsCount).toBe("eight (8)");
  });

  it("derives England + school flags", () => {
    const ctx = buildLaSchoolContext({
      ...scotlandIntake,
      jurisdiction: "England",
      counterpartyType: "AcademyOrFreeSchool",
      counterparty: { ...baseCounterparty, coveredSchoolsSites: "" },
    });
    expect(ctx.isEngland).toBe(true);
    expect(ctx.isLA).toBe(false);
    expect(ctx.isSchool).toBe(true);
    expect(ctx.foi.short).toBe("FOIA");
    expect(ctx.schedulePartsCount).toBe("seven (7)");
  });

  it("defaults groupwork true in both jurisdictions when unset", () => {
    const sc = buildLaSchoolContext({ ...scotlandIntake, includeGroupwork: undefined });
    expect(sc.group).toBe(true);
    const en = buildLaSchoolContext({
      ...scotlandIntake,
      jurisdiction: "England",
      counterpartyType: "AcademyOrFreeSchool",
      counterparty: { ...baseCounterparty, coveredSchoolsSites: "" },
      includeGroupwork: undefined,
    });
    expect(en.group).toBe(true);
  });

  it("uses jurisdiction-appropriate junior-range article (an S1 / a Year 7)", () => {
    const sc = buildLaSchoolContext(scotlandIntake);
    expect(sc.yearGroupJuniorArticle).toBe("an");
    expect(sc.yearGroupJuniorRange).toBe("S1 and S2");
    const en = buildLaSchoolContext({
      ...scotlandIntake,
      jurisdiction: "England",
      counterpartyType: "AcademyOrFreeSchool",
      counterparty: { ...baseCounterparty, coveredSchoolsSites: "" },
    });
    expect(en.yearGroupJuniorArticle).toBe("a");
    expect(en.yearGroupJuniorRange).toBe("Year 7 and Year 8");
  });

  it("respects an explicit groupwork override", () => {
    const ctx = buildLaSchoolContext({ ...scotlandIntake, includeGroupwork: false });
    expect(ctx.group).toBe(false);
  });

  it("fills the counterparty incorporating statute for LA Scotland", () => {
    const ctx = buildLaSchoolContext(scotlandIntake);
    expect(ctx.counterparty.incorporatingStatute).toBe(
      "the Local Government etc. (Scotland) Act 1994",
    );
  });

  it("uses 'School/Local Authority Staff' wording when LA", () => {
    const ctx = buildLaSchoolContext(scotlandIntake);
    expect(ctx.staffDataSubjects).toMatch(/School\/Local Authority Staff/);
  });

  it("uses 'School Staff' wording when not LA", () => {
    const ctx = buildLaSchoolContext({
      ...scotlandIntake,
      jurisdiction: "England",
      counterpartyType: "AcademyOrFreeSchool",
      counterparty: { ...baseCounterparty, coveredSchoolsSites: "" },
    });
    expect(ctx.staffDataSubjects).toBe("School Staff and MCR Pathways Staff");
  });

  it("merges MCR_DEFAULTS with the intake's mcr block", () => {
    const ctx = buildLaSchoolContext({
      ...scotlandIntake,
      mcr: { ...scotlandIntake.mcr, signatoryName: "Natalie Smith" },
    });
    expect(ctx.mcr.signatoryName).toBe("Natalie Smith");
    expect(ctx.mcr.repJobTitle).toBe("Head of Systems, Evidence and Impact");
  });

  it("counterpartyWillSign=false forces signatory, witness, and contact blocks to [insert]", () => {
    const ctx = buildLaSchoolContext({
      ...scotlandIntake,
      counterpartyWillSign: false,
      counterparty: {
        ...baseCounterparty,
        signatoryName: "Should be hidden",
        signatoryDate: "2026-05-20",
        witnessName: "Should also be hidden",
        witnessDate: "2026-05-20",
        signatoryPlace: "Edinburgh",
        witnessAddress: "Edinburgh",
        repJobTitle: "Should be hidden",
        repAddress: "Should be hidden",
        repEmail: "rep@example.org",
        repPhone: "0131 555 0001",
        escalationJobTitle: "Should be hidden",
        escalationAddress: "Should be hidden",
        escalationEmail: "esc@example.org",
        escalationPhone: "0131 555 0002",
      },
    });
    expect(ctx.counterparty.signatoryName).toBe("[insert]");
    expect(ctx.counterparty.signatoryDate).toBe("[insert]");
    expect(ctx.counterparty.witnessName).toBe("[insert]");
    expect(ctx.counterparty.witnessDate).toBe("[insert]");
    // signatoryPlace / witnessAddress still fall back to the counterparty
    // address when blank, matching the willSign=true path.
    expect(ctx.counterparty.signatoryPlace).toBe(baseCounterparty.address);
    expect(ctx.counterparty.witnessAddress).toBe(baseCounterparty.address);
    // Day-to-day and escalation contacts follow the same toggle.
    expect(ctx.counterparty.repJobTitle).toBe("[insert]");
    expect(ctx.counterparty.repAddress).toBe("[insert]");
    expect(ctx.counterparty.repEmail).toBe("[insert]");
    expect(ctx.counterparty.repPhone).toBe("[insert]");
    expect(ctx.counterparty.escalationJobTitle).toBe("[insert]");
    expect(ctx.counterparty.escalationAddress).toBe("[insert]");
    expect(ctx.counterparty.escalationEmail).toBe("[insert]");
    expect(ctx.counterparty.escalationPhone).toBe("[insert]");
  });

  it("counterpartyWillSign=true (default) keeps the entered signatory values", () => {
    const ctx = buildLaSchoolContext({
      ...scotlandIntake,
      counterparty: {
        ...baseCounterparty,
        signatoryName: "Jackie Reid",
        signatoryDate: "2026-05-20",
      },
    });
    expect(ctx.counterparty.signatoryName).toBe("Jackie Reid");
    expect(ctx.counterparty.signatoryDate).toBe("20 May 2026");
  });

  it("keeps [insert] placeholders when intake MCR fields are empty strings", () => {
    const ctx = buildLaSchoolContext({
      ...scotlandIntake,
      mcr: {
        signatoryName: "",
        signatoryPosition: "",
        signatoryDate: "",
        witnessName: "",
        witnessPosition: "",
        witnessDate: "",
      },
    });
    expect(ctx.mcr.signatoryName).toBe("[insert MCR signatory]");
    expect(ctx.mcr.witnessName).toBe("[insert MCR witness]");
    expect(ctx.mcr.signatoryDate).toBe("[insert]");
    expect(ctx.mcr.witnessDate).toBe("[insert]");
    expect(ctx.mcr.signatoryPosition).toBe("Head of Schools");
    expect(ctx.mcr.witnessPosition).toBe("Programme Manager");
  });
});

describe("formatDate", () => {
  it("converts ISO YYYY-MM-DD to long form", () => {
    expect(formatDate("2026-05-20")).toBe("20 May 2026");
    expect(formatDate("2025-09-03")).toBe("3 September 2025");
    expect(formatDate("2025-12-01")).toBe("1 December 2025");
  });

  it("passes free-text and [insert] sentinels through unchanged", () => {
    expect(formatDate("26 August 2025")).toBe("26 August 2025");
    expect(formatDate("03/09/2025")).toBe("03/09/2025");
    expect(formatDate("[insert]")).toBe("[insert]");
    expect(formatDate("TBC")).toBe("TBC");
  });

  it("handles empty / undefined input", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("passes invalid ISO dates through (out-of-range month)", () => {
    expect(formatDate("2026-13-01")).toBe("2026-13-01");
  });
});

const charityIntake: Intake = {
  jurisdiction: "Scotland",
  counterpartyType: "CharityPartner",
  counterpartyWillSign: true,
  includeCriminalRecord: true,
  includeFundraising: true,
  counterparty: {
    ...baseCounterparty,
    legalName: "Centrestage Communities Ltd",
    shortName: "Centrestage",
    address: "50 Sturrock Street, Kilmarnock KA1 2DZ",
    legalDescription:
      "a company limited by guarantee registered in Scotland (company number SC123456) and a Scottish charity regulated by OSCR, charity number SC039611",
    coveredSchoolsSites: "",
  },
  mcr: {
    signatoryName: "",
    signatoryPosition: "Head of Schools",
    signatoryDate: "",
    witnessName: "",
    witnessPosition: "Programme Manager",
    witnessDate: "",
  },
};

describe("buildCharityContext", () => {
  it("returns the smaller charity-track context shape", () => {
    const ctx = buildCharityContext(charityIntake);
    expect(ctx.crim).toBe(true);
    expect(ctx.counterparty.legalName).toBe("Centrestage Communities Ltd");
    expect(ctx.counterparty.legalDescription).toContain("OSCR");
    expect(ctx.mcr.signatoryPosition).toBe("Head of Schools");
    // LA/school-only fields must be absent — they would silently leak
    // jurisdiction text into a charity render otherwise.
    expect("isScotland" in ctx).toBe(false);
    expect("foi" in ctx).toBe(false);
    expect("statutoryAnchor" in ctx).toBe(false);
    expect("schedulePartsCount" in ctx).toBe(false);
  });

  it("applies counterpartyWillSign=false [insert] fallbacks", () => {
    const ctx = buildCharityContext({
      ...charityIntake,
      counterpartyWillSign: false,
      counterparty: {
        ...charityIntake.counterparty,
        signatoryName: "Should be hidden",
        repEmail: "rep@example.org",
      },
    });
    expect(ctx.counterparty.signatoryName).toBe("[insert]");
    expect(ctx.counterparty.repEmail).toBe("[insert]");
  });

  it("respects includeCriminalRecord=false", () => {
    const ctx = buildCharityContext({
      ...charityIntake,
      includeCriminalRecord: false,
    });
    expect(ctx.crim).toBe(false);
  });

  it("hasBackground is false when background is empty / whitespace", () => {
    const empty = buildCharityContext(charityIntake);
    expect(empty.counterparty.hasBackground).toBe(false);
    const blank = buildCharityContext({
      ...charityIntake,
      counterparty: { ...charityIntake.counterparty, background: "   \n  " },
    });
    expect(blank.counterparty.hasBackground).toBe(false);
  });

  it("hasBackground is true when background has content; text passes through", () => {
    const ctx = buildCharityContext({
      ...charityIntake,
      counterparty: {
        ...charityIntake.counterparty,
        background:
          "Centrestage works with young people through music and theatre.",
      },
    });
    expect(ctx.counterparty.hasBackground).toBe(true);
    expect(ctx.counterparty.background).toMatch(/music and theatre/);
  });
});

describe("buildContext dispatcher", () => {
  it("routes CharityPartner to buildCharityContext", () => {
    const ctx = buildContext(charityIntake);
    expect("isScotland" in ctx).toBe(false);
    expect(ctx.crim).toBe(true);
  });

  it("routes LocalAuthority to buildLaSchoolContext", () => {
    const ctx = buildContext(scotlandIntake);
    expect("isScotland" in ctx).toBe(true);
  });
});

describe("pickTemplate", () => {
  it("returns the charity master template for CharityPartner", () => {
    expect(pickTemplate("CharityPartner")).toBe(
      "MCR_DSA_Charity_Master_Template.docx",
    );
  });

  it("returns the LA/school master template for every other type", () => {
    expect(pickTemplate("LocalAuthority")).toBe("MCR_DSA_Master_Template.docx");
    expect(pickTemplate("MaintainedSchool")).toBe("MCR_DSA_Master_Template.docx");
    expect(pickTemplate("AcademyOrFreeSchool")).toBe(
      "MCR_DSA_Master_Template.docx",
    );
    expect(pickTemplate("IndependentSchool")).toBe(
      "MCR_DSA_Master_Template.docx",
    );
  });
});
