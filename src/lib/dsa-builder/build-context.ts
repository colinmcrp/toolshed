import type { Counterparty, Intake } from "./schema";
import {
  COUNTERPARTY_DESCRIPTION_DEFAULTS,
  COUNTERPARTY_INCORPORATING_DEFAULTS,
  ENGLAND_DEFAULTS,
  MCR_DEFAULTS,
  SCOTLAND_DEFAULTS,
} from "./defaults";

type CounterpartyContext = Counterparty & {
  incorporatingStatute: string;
  incorporatingDescription: string;
};

export interface RenderContext {
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
  staffDataSubjects: string;
  schedulePartsCount: string;
  pageCount: string;
  counterparty: CounterpartyContext;
  mcr: Record<keyof typeof MCR_DEFAULTS, string>;
}

const INSERT = "[insert]";

function withInsertFallback(value: string | undefined): string {
  return value && value.length > 0 ? value : INSERT;
}

export function buildContext(intake: Intake): RenderContext {
  const isScotland = intake.jurisdiction === "Scotland";
  const isEngland = !isScotland;
  const isLA = intake.counterpartyType === "LocalAuthority";
  const isSchool = !isLA;
  const jurisDefaults = isScotland ? SCOTLAND_DEFAULTS : ENGLAND_DEFAULTS;

  const cp = intake.counterparty;
  const incorporatingKey = isLA
    ? isScotland
      ? "LocalAuthority_Scotland"
      : "LocalAuthority_England"
    : intake.counterpartyType;

  const counterparty: CounterpartyContext = {
    ...cp,
    shortName: cp.shortName || (isLA ? "the Council" : "the School"),
    incorporatingStatute: COUNTERPARTY_INCORPORATING_DEFAULTS[incorporatingKey] ?? "",
    incorporatingDescription:
      COUNTERPARTY_DESCRIPTION_DEFAULTS[intake.counterpartyType] ?? "",
    signatoryName: withInsertFallback(cp.signatoryName),
    signatoryPosition: withInsertFallback(cp.signatoryPosition),
    signatoryDate: withInsertFallback(cp.signatoryDate),
    signatoryPlace: withInsertFallback(cp.signatoryPlace || cp.address),
    witnessName: withInsertFallback(cp.witnessName),
    witnessPosition: withInsertFallback(cp.witnessPosition),
    witnessDate: withInsertFallback(cp.witnessDate),
    witnessAddress: withInsertFallback(cp.witnessAddress || cp.address),
    repJobTitle: withInsertFallback(cp.repJobTitle),
    repAddress: withInsertFallback(cp.repAddress),
    repEmail: withInsertFallback(cp.repEmail),
    repPhone: withInsertFallback(cp.repPhone),
    escalationJobTitle: withInsertFallback(cp.escalationJobTitle),
    escalationAddress: withInsertFallback(cp.escalationAddress),
    escalationEmail: withInsertFallback(cp.escalationEmail),
    escalationPhone: withInsertFallback(cp.escalationPhone),
    coveredSchoolsSites:
      cp.coveredSchoolsSites ||
      "[list the schools and alternative provision sites covered by this Agreement]",
  };

  const crim = intake.includeCriminalRecord;
  const group = intake.includeGroupwork === undefined ? isScotland : intake.includeGroupwork;
  const fund = intake.includeFundraising;

  const staffDataSubjects = isLA
    ? "School/Local Authority Staff and MCR Pathways Staff"
    : "School Staff and MCR Pathways Staff";

  const schedulePartsCount = isLA ? "eight (8)" : "seven (7)";

  const mcr = { ...MCR_DEFAULTS, ...intake.mcr };

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
    mcr,
  };
}
