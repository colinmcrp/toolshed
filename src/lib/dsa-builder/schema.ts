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

const emailOrEmpty = z
  .string()
  .optional()
  .default("")
  .refine((v) => v === "" || z.string().email().safeParse(v).success, {
    message: "Must be a valid email",
  });

export const CounterpartySchema = z.object({
  legalName: z.string().min(1, "Required"),
  shortName: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  signatoryName: z.string().optional().default(""),
  signatoryPosition: z.string().optional().default(""),
  signatoryDate: z.string().optional().default(""),
  signatoryPlace: z.string().optional().default(""),
  witnessName: z.string().optional().default(""),
  witnessPosition: z.string().optional().default(""),
  witnessDate: z.string().optional().default(""),
  witnessAddress: z.string().optional().default(""),
  repJobTitle: z.string().optional().default(""),
  repAddress: z.string().optional().default(""),
  repEmail: emailOrEmpty,
  repPhone: z.string().optional().default(""),
  escalationJobTitle: z.string().optional().default(""),
  escalationAddress: z.string().optional().default(""),
  escalationEmail: emailOrEmpty,
  escalationPhone: z.string().optional().default(""),
  coveredSchoolsSites: z.string().optional().default(""),
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
    // When false, the counterparty signatory + witness fields are left as
    // [insert] placeholders in the generated doc — the counterparty fills
    // them in by hand at signing time. Default true to preserve the
    // existing flow where MCR collects signatory details up-front.
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
  );
export type Intake = z.infer<typeof IntakeSchema>;
