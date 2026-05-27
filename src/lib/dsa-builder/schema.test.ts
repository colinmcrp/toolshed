import { describe, expect, it } from "vitest";
import { IntakeSchema } from "./schema";

const baseCounterparty = {
  legalName: "City of Edinburgh Council",
  shortName: "the Council",
  address: "Waverley Court, Edinburgh",
};

describe("IntakeSchema", () => {
  it("accepts a valid Scotland LA intake", () => {
    const result = IntakeSchema.safeParse({
      jurisdiction: "Scotland",
      counterpartyType: "LocalAuthority",
      counterparty: { ...baseCounterparty, coveredSchoolsSites: "All schools" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects Scotland + MaintainedSchool with the legally-anchored message", () => {
    const result = IntakeSchema.safeParse({
      jurisdiction: "Scotland",
      counterpartyType: "MaintainedSchool",
      counterparty: baseCounterparty,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.join(".") === "counterpartyType",
      );
      expect(issue?.message).toMatch(/Scotland the only valid counterparty/);
      expect(issue?.message).toMatch(/no separate legal personality/);
    }
  });

  it("accepts Scotland + CharityPartner (no coveredSchoolsSites required)", () => {
    const result = IntakeSchema.safeParse({
      jurisdiction: "Scotland",
      counterpartyType: "CharityPartner",
      counterparty: {
        ...baseCounterparty,
        legalName: "Centrestage Communities Ltd",
        shortName: "Centrestage",
        legalDescription:
          "a company limited by guarantee registered in Scotland and a Scottish charity",
      },
    });
    expect(result.success).toBe(true);
  });

  it("requires legalDescription when counterparty is CharityPartner", () => {
    const result = IntakeSchema.safeParse({
      jurisdiction: "Scotland",
      counterpartyType: "CharityPartner",
      counterparty: {
        ...baseCounterparty,
        legalName: "Centrestage Communities Ltd",
        shortName: "Centrestage",
        // legalDescription omitted — defaults to "" and must be rejected.
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.join(".") === "counterparty.legalDescription",
      );
      expect(issue?.message).toMatch(/charity's legal status/);
    }
  });

  it("rejects whitespace-only legalDescription for CharityPartner", () => {
    const result = IntakeSchema.safeParse({
      jurisdiction: "Scotland",
      counterpartyType: "CharityPartner",
      counterparty: {
        ...baseCounterparty,
        legalDescription: "   \n  ",
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts England + CharityPartner", () => {
    const result = IntakeSchema.safeParse({
      jurisdiction: "England",
      counterpartyType: "CharityPartner",
      counterparty: {
        ...baseCounterparty,
        legalDescription: "a charitable company limited by guarantee",
      },
    });
    expect(result.success).toBe(true);
  });

  it("requires coveredSchoolsSites when counterparty is LocalAuthority", () => {
    const result = IntakeSchema.safeParse({
      jurisdiction: "Scotland",
      counterpartyType: "LocalAuthority",
      counterparty: baseCounterparty,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.join(".") === "counterparty.coveredSchoolsSites",
      );
      expect(issue?.message).toMatch(/List the schools/);
    }
  });

  it("accepts an English academy without coveredSchoolsSites", () => {
    const result = IntakeSchema.safeParse({
      jurisdiction: "England",
      counterpartyType: "AcademyOrFreeSchool",
      counterparty: baseCounterparty,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email when one is provided", () => {
    const result = IntakeSchema.safeParse({
      jurisdiction: "England",
      counterpartyType: "AcademyOrFreeSchool",
      counterparty: { ...baseCounterparty, repEmail: "not-an-email" },
    });
    expect(result.success).toBe(false);
  });

  it("defaults useEnglishLegalSystem to false for both jurisdictions", () => {
    for (const jurisdiction of ["Scotland", "England"] as const) {
      const result = IntakeSchema.safeParse({
        jurisdiction,
        counterpartyType:
          jurisdiction === "Scotland" ? "LocalAuthority" : "AcademyOrFreeSchool",
        counterparty: { ...baseCounterparty, coveredSchoolsSites: "All schools" },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.useEnglishLegalSystem).toBe(false);
      }
    }
  });

  it("accepts England + useEnglishLegalSystem true (opt-in path)", () => {
    const result = IntakeSchema.safeParse({
      jurisdiction: "England",
      useEnglishLegalSystem: true,
      counterpartyType: "AcademyOrFreeSchool",
      counterparty: { ...baseCounterparty, coveredSchoolsSites: "All schools" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects Scotland + useEnglishLegalSystem true (legally incoherent)", () => {
    const result = IntakeSchema.safeParse({
      jurisdiction: "Scotland",
      useEnglishLegalSystem: true,
      counterpartyType: "LocalAuthority",
      counterparty: { ...baseCounterparty, coveredSchoolsSites: "All schools" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.join(".") === "useEnglishLegalSystem",
      );
      expect(issue?.message).toMatch(/not available for Scotland/);
    }
  });

  it("ignores invalid contact emails when counterpartyWillSign is false", () => {
    // The contacts UI is hidden in this case, so a stale invalid value in
    // form state must not silently block the form.
    const result = IntakeSchema.safeParse({
      jurisdiction: "England",
      counterpartyType: "AcademyOrFreeSchool",
      counterpartyWillSign: false,
      counterparty: {
        ...baseCounterparty,
        repEmail: "not-an-email",
        escalationEmail: "still-not-an-email",
      },
    });
    expect(result.success).toBe(true);
  });
});
