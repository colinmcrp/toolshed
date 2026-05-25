import { z } from "zod";

export const Jurisdiction = z.enum(["Scotland", "England"]);
export type Jurisdiction = z.infer<typeof Jurisdiction>;

export const CounterpartyType = z.enum([
  "LocalAuthority",
  "MaintainedSchool",
  "AcademyOrFreeSchool",
  "IndependentSchool",
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
    (d) => !(d.jurisdiction === "Scotland" && d.counterpartyType !== "LocalAuthority"),
    {
      path: ["counterpartyType"],
      message:
        "In Scotland the only valid counterparty type is Local Authority. " +
        "Scottish state schools have no separate legal personality and " +
        "cannot sign their own DSA.",
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
