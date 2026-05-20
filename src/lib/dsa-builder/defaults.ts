import type { CounterpartyType } from "./schema";

export const SCOTLAND_DEFAULTS = {
  foi: { short: "FOISA", full: "Freedom of Information (Scotland) Act 2002" },
  childrenAct: "Children (Scotland) Act 1995",
  businessDayGeographies: "Scotland",
  eduVocab:
    "CfE levels, SQA attainment, attendance, exclusion, free school meals, additional needs, disabilities and school leaver destinations",
  statutoryAnchor:
    "Processing is necessary for the performance of a task carried out in the public interest or in the exercise of official authority vested in the Council; in particular by sections 3B, 3D, 3F and 3H of the Standards in Scotland's Schools etc. Act 2000; The Education (Scotland) Act 1980; The Education (Additional Support for Learning) (Scotland) Act 2004; and The Education (Scotland) Act 2016.",
  targetedGroup: "care experienced or those other S1-S6 Children and Young People",
  yearGroupSeniorRange: "S3 and upwards",
  yearGroupJuniorRange: "S1 and S2",
} as const;

export const ENGLAND_DEFAULTS = {
  foi: { short: "FOIA", full: "Freedom of Information Act 2000" },
  childrenAct: "Children Act 1989 and the Children Act 2004",
  businessDayGeographies: "Scotland and England",
  eduVocab:
    "KS2 levels, GCSE/A-Level attainment, attendance, exclusion, pupil premium, free school meals, additional needs, disabilities and school leaver destinations",
  statutoryAnchor:
    "Processing is necessary for the performance of a task carried out in the public interest or in the exercise of official authority vested in the Counterparty, in particular under the Education Act 1996, the Education Act 2002, section 175 of the Education Act 2002 (safeguarding) and section 10 of the Children Act 2004 (cooperation to improve well-being).",
  targetedGroup: "care experienced or those other Year 8 to Year 13 Children and Young People",
  yearGroupSeniorRange: "Year 9 and upwards",
  yearGroupJuniorRange: "Year 7 and Year 8",
} as const;

// Keyed by `${counterpartyType}_${jurisdiction}` for LA, by counterpartyType otherwise.
export const COUNTERPARTY_INCORPORATING_DEFAULTS: Record<string, string> = {
  LocalAuthority_Scotland: "the Local Government etc. (Scotland) Act 1994",
  LocalAuthority_England: "the Local Government Act 1972",
  MaintainedSchool:
    "a maintained school whose governing body is a body corporate under section 19 of the Education Act 2002",
  AcademyOrFreeSchool:
    "a school operated by an academy trust (a company limited by guarantee and an exempt charity) under a funding agreement made under the Academies Act 2010",
  IndependentSchool:
    "an independent school registered under section 95 of the Education and Skills Act 2008",
};

export const COUNTERPARTY_DESCRIPTION_DEFAULTS: Partial<Record<CounterpartyType, string>> = {
  MaintainedSchool:
    "a maintained school whose governing body is a body corporate under section 19 of the Education Act 2002",
  AcademyOrFreeSchool:
    "an academy/free school operated by an academy trust (a company limited by guarantee and an exempt charity) under a funding agreement made under the Academies Act 2010",
  IndependentSchool:
    "an independent school registered under section 95 of the Education and Skills Act 2008",
};

// Pre-fill used by the wizard's MCR step and "Reset to defaults" button.
// Separate from MCR_DEFAULTS below, which is the [insert]-style fallback
// applied when an intake JSON arrives with blank MCR fields.
export const MCR_SIGNER_PRESET = {
  signatoryName: "Sharon McIntyre",
  signatoryPosition: "Chief Executive Officer",
  witnessName: "Colin Adam",
  witnessPosition: "Head of Solutions",
} as const;

export const MCR_DEFAULTS = {
  signatoryName: "[insert MCR signatory]",
  signatoryPosition: "Head of Schools",
  signatoryDate: "[insert]",
  witnessName: "[insert MCR witness]",
  witnessPosition: "Programme Manager",
  witnessDate: "[insert]",
  repJobTitle: "Head of Systems, Evidence and Impact",
  repAddress:
    "MCR Pathways, Anderston Hub, Mitchell Library, Berkeley St, Glasgow, G3 7DN",
  repEmail: "info@mcrpathways.org",
  repPhone: "0141 221 0200",
  escalationJobTitle: "Chief Executive Officer",
  escalationAddress:
    "MCR Pathways, Anderston Hub, Mitchell Library, Berkeley St, Glasgow, G3 7DN",
  escalationEmail: "sharon.mcintyre@mcrpathways.org",
  escalationPhone: "0141 221 0200",
} as const;
