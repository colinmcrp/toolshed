import { z } from "zod";

export const Jurisdiction = z.enum(["Scotland", "England"]);
export type Jurisdiction = z.infer<typeof Jurisdiction>;

export const CounterpartyType = z.enum([
  "LocalAuthority",
  "MaintainedSchool",
  "AcademyOrFreeSchool",
  "IndependentSchool",
  "CharityPartner",
]);
export type CounterpartyType = z.infer<typeof CounterpartyType>;

// Email check is enforced at the IntakeSchema level (see below) so that it
// can be conditional on counterpartyWillSign — when the toggle is off, the
// contact UI is hidden and any stale value would otherwise silently block
// the form with no visible error.
const optionalString = z.string().optional().default("");

export const CounterpartySchema = z.object({
  legalName: z.string().min(1, "Required"),
  shortName: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  signatoryName: optionalString,
  signatoryPosition: optionalString,
  signatoryDate: optionalString,
  signatoryPlace: optionalString,
  witnessName: optionalString,
  witnessPosition: optionalString,
  witnessDate: optionalString,
  witnessAddress: optionalString,
  repJobTitle: optionalString,
  repAddress: optionalString,
  repEmail: optionalString,
  repPhone: optionalString,
  escalationJobTitle: optionalString,
  escalationAddress: optionalString,
  escalationEmail: optionalString,
  escalationPhone: optionalString,
  coveredSchoolsSites: optionalString,
  // Charity-track only — free-text legal status (e.g. "a company limited by
  // guarantee registered in Scotland, company number SCxxxxxx, and a Scottish
  // charity regulated by OSCR, charity number SCxxxxxx"). Equivalent to the
  // LA/school track's COUNTERPARTY_INCORPORATING_DEFAULTS lookup.
  legalDescription: optionalString,
  // Charity-track only — optional partner-specific Background paragraph
  // dropped into the recitals between the "runs its own programmes" anchor
  // and the "MCR delivers" paragraph. Blank → paragraph omitted.
  background: optionalString,
});
export type Counterparty = z.infer<typeof CounterpartySchema>;

export const McrSchema = z.object({
  signatoryName: z.string().optional().default(""),
  signatoryPosition: z.string().optional().default("Chief Executive Officer"),
  signatoryDate: z.string().optional().default(""),
  witnessName: z.string().optional().default(""),
  witnessPosition: z.string().optional().default("Head of Solutions"),
  witnessDate: z.string().optional().default(""),
});
export type Mcr = z.infer<typeof McrSchema>;

export const IntakeSchema = z
  .object({
    jurisdiction: Jurisdiction,
    // Most English partnerships agree to Scots law on the executed DSA
    // (matches MCR's home jurisdiction). The minority who want their
    // agreement governed by English law set this flag, which swaps the
    // governing-law / courts / mediator / capacity-test clauses. Not
    // exposed for Scotland intakes — there's no scenario where a Scottish
    // DSA elects English law.
    useEnglishLegalSystem: z.boolean().default(false),
    counterpartyType: CounterpartyType,
    counterpartyWillSign: z.boolean().default(true),
    includeCriminalRecord: z.boolean().default(true),
    includeGroupwork: z.boolean().optional(),
    includeFundraising: z.boolean().default(true),
    counterparty: CounterpartySchema,
    mcr: McrSchema.optional().default({
      signatoryName: "",
      signatoryPosition: "Chief Executive Officer",
      signatoryDate: "",
      witnessName: "",
      witnessPosition: "Head of Solutions",
      witnessDate: "",
    }),
  })
  .refine(
    (d) =>
      !(
        d.jurisdiction === "Scotland" &&
        d.counterpartyType !== "LocalAuthority" &&
        d.counterpartyType !== "CharityPartner"
      ),
    {
      path: ["counterpartyType"],
      message:
        "In Scotland the only valid counterparty types are Local Authority " +
        "or Charity Partner. Scottish state schools have no separate legal " +
        "personality and cannot sign their own DSA.",
    },
  )
  .refine(
    (d) => !(d.jurisdiction === "Scotland" && d.useEnglishLegalSystem),
    {
      path: ["useEnglishLegalSystem"],
      message:
        "English legal system is not available for Scotland-jurisdiction DSAs.",
    },
  )
  .refine(
    (d) =>
      d.counterpartyType !== "LocalAuthority" ||
      (d.counterparty.coveredSchoolsSites ?? "").length > 0,
    {
      path: ["counterparty", "coveredSchoolsSites"],
      message:
        "List the schools / sites covered when the counterparty is a Local Authority.",
    },
  )
  .refine(
    (d) =>
      d.counterpartyType !== "CharityPartner" ||
      (d.counterparty.legalDescription ?? "").trim().length > 0,
    {
      path: ["counterparty", "legalDescription"],
      message:
        "Describe the charity's legal status (company / OSCR registration) when the counterparty is a Charity Partner.",
    },
  )
  .superRefine((d, ctx) => {
    // Skip when the counterparty will fill in their own details — contact
    // fields are hidden in the UI and blanked at render, so stale values
    // (including ones the user typed and then toggled away from) must not
    // block the form.
    if (d.counterpartyWillSign === false) return;
    for (const key of ["repEmail", "escalationEmail"] as const) {
      const v = d.counterparty[key];
      if (v && !z.string().email().safeParse(v).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["counterparty", key],
          message: "Must be a valid email",
        });
      }
    }
  });
export type Intake = z.infer<typeof IntakeSchema>;
