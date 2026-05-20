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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Date inputs in the wizard store ISO YYYY-MM-DD; render as long form
// ("20 May 2026") which matches the prose style of the rest of the doc.
// Any non-ISO string (free-text from older intakes, "[insert]" sentinels,
// "TBC", etc.) is passed through unchanged so existing fixtures still
// produce byte-stable output.
export function formatDate(value: string | undefined): string {
  if (!value) return "";
  const m = value.match(ISO_DATE_RE);
  if (!m) return value;
  const [, y, mo, d] = m;
  const monthIdx = Number(mo) - 1;
  if (monthIdx < 0 || monthIdx > 11) return value;
  return `${Number(d)} ${MONTHS[monthIdx]} ${y}`;
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

  // When the user opts out of collecting counterparty signing details
  // up-front, force the signatory + witness blocks to "" so they fall
  // through to [insert] in the rendered doc — the counterparty fills
  // them in at signing time. We still keep position values, since those
  // (Headteacher, Service Director, etc.) come from the counterparty
  // type and not from the individual.
  const willSign = intake.counterpartyWillSign !== false;
  const sigName = willSign ? cp.signatoryName : "";
  const sigDate = willSign ? cp.signatoryDate : "";
  const sigPlace = willSign ? cp.signatoryPlace : "";
  const witName = willSign ? cp.witnessName : "";
  const witDate = willSign ? cp.witnessDate : "";
  const witAddress = willSign ? cp.witnessAddress : "";

  const counterparty: CounterpartyContext = {
    ...cp,
    shortName: cp.shortName || (isLA ? "the Council" : "the School"),
    incorporatingStatute: COUNTERPARTY_INCORPORATING_DEFAULTS[incorporatingKey] ?? "",
    incorporatingDescription:
      COUNTERPARTY_DESCRIPTION_DEFAULTS[intake.counterpartyType] ?? "",
    signatoryName: withInsertFallback(sigName),
    signatoryPosition: withInsertFallback(cp.signatoryPosition),
    signatoryDate: withInsertFallback(formatDate(sigDate)),
    signatoryPlace: withInsertFallback(sigPlace || cp.address),
    witnessName: withInsertFallback(witName),
    witnessPosition: withInsertFallback(cp.witnessPosition),
    witnessDate: withInsertFallback(formatDate(witDate)),
    witnessAddress: withInsertFallback(witAddress || cp.address),
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

  // Empty intake fields fall back to MCR_DEFAULTS (which contain "[insert]"
  // placeholders for the signing block), matching how withInsertFallback
  // handles the counterparty side. Without this filter, an unfilled MCR
  // step 4 would produce a doc with blank signature lines instead of visible
  // [insert] placeholders.
  const intakeMcrNonEmpty = Object.fromEntries(
    Object.entries(intake.mcr).filter(([, v]) => v !== ""),
  );
  const mcr: Record<keyof typeof MCR_DEFAULTS, string> = {
    ...MCR_DEFAULTS,
    ...intakeMcrNonEmpty,
  };
  mcr.signatoryDate = formatDate(mcr.signatoryDate);
  mcr.witnessDate = formatDate(mcr.witnessDate);

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
