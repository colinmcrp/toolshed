import type { Counterparty, Intake } from "./schema";
import {
  COUNTERPARTY_DESCRIPTION_DEFAULTS,
  COUNTERPARTY_INCORPORATING_DEFAULTS,
  ENGLAND_DEFAULTS,
  MCR_DEFAULTS,
  SCOTLAND_DEFAULTS,
} from "./defaults";

type LaSchoolCounterpartyContext = Counterparty & {
  incorporatingStatute: string;
  incorporatingDescription: string;
};

export interface LaSchoolRenderContext {
  isScotland: boolean;
  isEngland: boolean;
  isLA: boolean;
  isSchool: boolean;
  crim: boolean;
  group: boolean;
  fund: boolean;
  foi: { short: string; full: string };
  childrenAct: string;
  businessDayGeographies: string;
  eduVocab: string;
  statutoryAnchor: string;
  targetedGroup: string;
  yearGroupSeniorRange: string;
  yearGroupJuniorRange: string;
  yearGroupJuniorArticle: string;
  governingLawCountry: string;
  governingLawCourts: string;
  mediatorFallbackLaSchool: string;
  mediatorFallbackCharity: string;
  staffDataSubjects: string;
  schedulePartsCount: string;
  pageCount: string;
  counterparty: LaSchoolCounterpartyContext;
  mcr: Record<keyof typeof MCR_DEFAULTS, string>;
}

type CharityCounterpartyContext = Counterparty & {
  hasBackground: boolean;
};

export interface CharityRenderContext {
  isScotland: boolean;
  isEngland: boolean;
  crim: boolean;
  governingLawCountry: string;
  governingLawCourts: string;
  mediatorFallbackLaSchool: string;
  mediatorFallbackCharity: string;
  counterparty: CharityCounterpartyContext;
  mcr: Record<keyof typeof MCR_DEFAULTS, string>;
}

export type RenderContext = LaSchoolRenderContext | CharityRenderContext;

const INSERT = "[insert]";

function withInsertFallback(value: string | undefined): string {
  return value && value.length > 0 ? value : INSERT;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Wizard date inputs store ISO; doc prose uses "20 May 2026". Non-ISO
// strings (free-text fixtures, "[insert]", "TBC") pass through unchanged
// so byte-stable fixture parity holds.
export function formatDate(value: string | undefined): string {
  if (!value) return "";
  const m = value.match(ISO_DATE_RE);
  if (!m) return value;
  const [, y, mo, d] = m;
  const monthIdx = Number(mo) - 1;
  if (monthIdx < 0 || monthIdx > 11) return value;
  return `${Number(d)} ${MONTHS[monthIdx]} ${y}`;
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Merges intake.mcr with MCR_DEFAULTS, skipping empty intake values so the
// [insert] placeholders survive into the rendered document.
function buildMcr(intake: Intake): Record<keyof typeof MCR_DEFAULTS, string> {
  const intakeMcrNonEmpty = Object.fromEntries(
    Object.entries(intake.mcr).filter(([, v]) => v !== ""),
  );
  const mcr: Record<keyof typeof MCR_DEFAULTS, string> = {
    ...MCR_DEFAULTS,
    ...intakeMcrNonEmpty,
  };
  mcr.signatoryDate = formatDate(mcr.signatoryDate);
  mcr.witnessDate = formatDate(mcr.witnessDate);
  return mcr;
}

// Applies the counterpartyWillSign toggle and [insert] fallbacks. Shared
// between the LA/school and charity tracks.
function buildCounterpartyBase(intake: Intake): Counterparty {
  const cp = intake.counterparty;
  // Position values are kept regardless — they come from the counterparty
  // type (Headteacher, Service Director), not the individual.
  const willSign = intake.counterpartyWillSign !== false;
  const sigName = willSign ? cp.signatoryName : "";
  const sigDate = willSign ? cp.signatoryDate : "";
  const sigPlace = willSign ? cp.signatoryPlace : "";
  const witName = willSign ? cp.witnessName : "";
  const witDate = willSign ? cp.witnessDate : "";
  const witAddress = willSign ? cp.witnessAddress : "";
  const repJobTitle = willSign ? cp.repJobTitle : "";
  const repAddress = willSign ? cp.repAddress : "";
  const repEmail = willSign ? cp.repEmail : "";
  const repPhone = willSign ? cp.repPhone : "";
  const escalationJobTitle = willSign ? cp.escalationJobTitle : "";
  const escalationAddress = willSign ? cp.escalationAddress : "";
  const escalationEmail = willSign ? cp.escalationEmail : "";
  const escalationPhone = willSign ? cp.escalationPhone : "";

  return {
    ...cp,
    signatoryName: withInsertFallback(sigName),
    signatoryPosition: withInsertFallback(cp.signatoryPosition),
    signatoryDate: withInsertFallback(formatDate(sigDate)),
    signatoryPlace: withInsertFallback(sigPlace || cp.address),
    witnessName: withInsertFallback(witName),
    witnessPosition: withInsertFallback(cp.witnessPosition),
    witnessDate: withInsertFallback(formatDate(witDate)),
    witnessAddress: withInsertFallback(witAddress || cp.address),
    repJobTitle: withInsertFallback(repJobTitle),
    repAddress: withInsertFallback(repAddress),
    repEmail: withInsertFallback(repEmail),
    repPhone: withInsertFallback(repPhone),
    escalationJobTitle: withInsertFallback(escalationJobTitle),
    escalationAddress: withInsertFallback(escalationAddress),
    escalationEmail: withInsertFallback(escalationEmail),
    escalationPhone: withInsertFallback(escalationPhone),
  };
}

export function buildLaSchoolContext(intake: Intake): LaSchoolRenderContext {
  const isScotland = intake.jurisdiction === "Scotland";
  const isEngland = intake.jurisdiction === "England";
  const isLA = intake.counterpartyType === "LocalAuthority";
  const isSchool = !isLA;
  const jurisDefaults = isScotland ? SCOTLAND_DEFAULTS : ENGLAND_DEFAULTS;

  const cp = intake.counterparty;
  const incorporatingKey = isLA
    ? isScotland
      ? "LocalAuthority_Scotland"
      : "LocalAuthority_England"
    : intake.counterpartyType;

  const base = buildCounterpartyBase(intake);

  const counterparty: LaSchoolCounterpartyContext = {
    ...base,
    shortName: cp.shortName || (isLA ? "the Council" : "the School"),
    incorporatingStatute: COUNTERPARTY_INCORPORATING_DEFAULTS[incorporatingKey] ?? "",
    incorporatingDescription:
      COUNTERPARTY_DESCRIPTION_DEFAULTS[intake.counterpartyType] ?? "",
    coveredSchoolsSites:
      cp.coveredSchoolsSites ||
      "[list the schools and alternative provision sites covered by this Agreement]",
  };

  const crim = intake.includeCriminalRecord;
  // The groupwork clause is rewritten per jurisdiction (S1/S2 vs Y7/Y8) via
  // yearGroupJuniorRange + yearGroupJuniorArticle, so it now applies by default
  // in both jurisdictions when the intake leaves the flag unset.
  const group = intake.includeGroupwork === undefined ? true : intake.includeGroupwork;
  const fund = intake.includeFundraising;

  const staffDataSubjects = isLA
    ? "School/Local Authority Staff and MCR Pathways Staff"
    : "School Staff and MCR Pathways Staff";

  const schedulePartsCount = isLA ? "eight (8)" : "seven (7)";

  return {
    isScotland,
    isEngland,
    isLA,
    isSchool,
    crim,
    group,
    fund,
    ...jurisDefaults,
    staffDataSubjects,
    schedulePartsCount,
    pageCount: "nine (9)",
    counterparty,
    mcr: buildMcr(intake),
  };
}

// Charity-to-charity track. Smaller context — the charity template uses
// {#crim} as a conditional, {#counterparty.hasBackground} for the optional
// partner-specific Background paragraph, {#isEngland}/{#isScotland} for the
// Programme Consent capacity test, and {counterparty.*} / {mcr.*}
// substitutions for everything else.
export function buildCharityContext(intake: Intake): CharityRenderContext {
  const isScotland = intake.jurisdiction === "Scotland";
  const isEngland = intake.jurisdiction === "England";
  const jurisDefaults = isScotland ? SCOTLAND_DEFAULTS : ENGLAND_DEFAULTS;
  const base = buildCounterpartyBase(intake);
  return {
    isScotland,
    isEngland,
    crim: intake.includeCriminalRecord,
    governingLawCountry: jurisDefaults.governingLawCountry,
    governingLawCourts: jurisDefaults.governingLawCourts,
    mediatorFallbackLaSchool: jurisDefaults.mediatorFallbackLaSchool,
    mediatorFallbackCharity: jurisDefaults.mediatorFallbackCharity,
    counterparty: {
      ...base,
      // Schema refine enforces non-empty for both fields, but withInsertFallback
      // is a belt-and-braces guard against bypass paths (test fixtures that cast
      // around IntakeSchema.parse, future admin endpoints). shortName lands
      // inside the English Programme Consent capacity test as
      // "not assessed by {counterparty.shortName} as having capacity…", so a
      // silent empty value would render a double-space typographic glitch.
      shortName: withInsertFallback(intake.counterparty.shortName),
      legalDescription: withInsertFallback(intake.counterparty.legalDescription),
      hasBackground: (intake.counterparty.background ?? "").trim().length > 0,
    },
    mcr: buildMcr(intake),
  };
}

export function buildContext(intake: Intake): RenderContext {
  return intake.counterpartyType === "CharityPartner"
    ? buildCharityContext(intake)
    : buildLaSchoolContext(intake);
}

// Selects the master template path matching the chosen counterparty track.
// Paths are relative to the repo's public/ directory.
export function pickTemplate(counterpartyType: Intake["counterpartyType"]): string {
  return counterpartyType === "CharityPartner"
    ? "MCR_DSA_Charity_Master_Template.docx"
    : "MCR_DSA_Master_Template.docx";
}
