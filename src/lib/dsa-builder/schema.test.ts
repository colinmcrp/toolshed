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

  it("rejects Scotland + non-LA with the legally-anchored message", () => {
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
});
