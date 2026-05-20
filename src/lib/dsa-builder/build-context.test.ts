import { describe, expect, it } from "vitest";
import { buildContext } from "./build-context";
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
};

const scotlandIntake: Intake = {
  jurisdiction: "Scotland",
  counterpartyType: "LocalAuthority",
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
    const ctx = buildContext(scotlandIntake);
    expect(ctx.isScotland).toBe(true);
    expect(ctx.isEngland).toBe(false);
    expect(ctx.isLA).toBe(true);
    expect(ctx.isSchool).toBe(false);
    expect(ctx.foi.short).toBe("FOISA");
    expect(ctx.childrenAct).toBe("Children (Scotland) Act 1995");
    expect(ctx.schedulePartsCount).toBe("eight (8)");
  });

  it("derives England + school flags", () => {
    const ctx = buildContext({
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

  it("defaults groupwork true in Scotland and false in England when unset", () => {
    const sc = buildContext({ ...scotlandIntake, includeGroupwork: undefined });
    expect(sc.group).toBe(true);
    const en = buildContext({
      ...scotlandIntake,
      jurisdiction: "England",
      counterpartyType: "AcademyOrFreeSchool",
      counterparty: { ...baseCounterparty, coveredSchoolsSites: "" },
      includeGroupwork: undefined,
    });
    expect(en.group).toBe(false);
  });

  it("respects an explicit groupwork override", () => {
    const ctx = buildContext({ ...scotlandIntake, includeGroupwork: false });
    expect(ctx.group).toBe(false);
  });

  it("fills the counterparty incorporating statute for LA Scotland", () => {
    const ctx = buildContext(scotlandIntake);
    expect(ctx.counterparty.incorporatingStatute).toBe(
      "the Local Government etc. (Scotland) Act 1994",
    );
  });

  it("uses 'School/Local Authority Staff' wording when LA", () => {
    const ctx = buildContext(scotlandIntake);
    expect(ctx.staffDataSubjects).toMatch(/School\/Local Authority Staff/);
  });

  it("uses 'School Staff' wording when not LA", () => {
    const ctx = buildContext({
      ...scotlandIntake,
      jurisdiction: "England",
      counterpartyType: "AcademyOrFreeSchool",
      counterparty: { ...baseCounterparty, coveredSchoolsSites: "" },
    });
    expect(ctx.staffDataSubjects).toBe("School Staff and MCR Pathways Staff");
  });

  it("merges MCR_DEFAULTS with the intake's mcr block", () => {
    const ctx = buildContext({
      ...scotlandIntake,
      mcr: { ...scotlandIntake.mcr, signatoryName: "Natalie Smith" },
    });
    expect(ctx.mcr.signatoryName).toBe("Natalie Smith");
    expect(ctx.mcr.repJobTitle).toBe("Head of Systems, Evidence and Impact");
  });

  it("keeps [insert] placeholders when intake MCR fields are empty strings", () => {
    const ctx = buildContext({
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
