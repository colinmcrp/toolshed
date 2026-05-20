# MCR DSA Builder — design

A toolshed tool that produces a fully-populated Data Sharing Agreement
(`.docx`) for any combination of jurisdiction (Scotland / England),
counterparty type (local authority, maintained school, academy / free
school, independent school), and scope toggles (criminal record data,
S1/S2 groupwork programme, fundraising in the marketing legal basis).

Replaces the current manual process of editing a Word template by hand,
which had been producing drift between agreements (typos carried across
templates, English templates ending up with Scotland-specific
abbreviations, etc.).

Source material — generator, defaults, master template, two worked sample
intakes, and the legal review report — lives in the repo's `DSA/` folder.

## Scope

In scope for v1:

- 4-step wizard that collects ~25 fields and downloads a populated `.docx`
- All four counterparty types for England; Scotland hard-blocked to LA only
- Three scope toggles (criminal record / groupwork / fundraising)
- Client-side rendering of the master template through docxtemplater
- Post-render validation that rejects stray tokens or `undefined`

Out of scope for v1 (per `DSA/HANDOVER_TO_CLAUDE_CODE.md` §11):

- Saving drafts, listing past generations, audit log
- Wales / Northern Ireland templates
- UI editing of the master template
- E-signature integration
- Backend / persistence

## Stack

Reuses toolshed's existing stack — no new framework, no new state library.

| Concern | Existing | Added |
|---|---|---|
| Framework | Next.js 16 App Router (React 19) | — |
| Forms + validation | react-hook-form + zod | — |
| UI primitives | shadcn (Card, Form, Input, Label, Select, Textarea, Button) | — |
| Toasts | sonner | — |
| Tests | Vitest + jsdom | — |
| `.docx` rendering | — | `docxtemplater`, `pizzip`, `file-saver` |

The handover's Vite + React + React Router recommendation is intentionally
dropped: toolshed is a Next.js app and the tool runs as a dashboard route
alongside the existing tools.

## Where it lives

- Route: `/dsa-builder`, inside the `(dashboard)` route group (auth comes
  from the existing dashboard layout — `getUser()` runs there)
- Tile added to the dashboard homepage tool grid at
  `src/app/(dashboard)/page.tsx`
- Master template served as a static asset from
  `public/MCR_DSA_Master_Template.docx` (copied from `DSA/`)
- No database tables, no Supabase storage, no server actions

## UI — 4-step wizard

A single `Wizard` component owns one react-hook-form instance and a
`useState`-managed step index. A `Stepper` at the top of the page shows
progress. Forward / back navigation preserves entered data. No router
between steps.

### Step 1 — Jurisdiction & counterparty type

- `jurisdiction`: radio, "Scotland" or "England", required
- `counterpartyType`: radio, filtered by jurisdiction
  - Scotland: only `LocalAuthority` is enabled. An info card under the
    option paraphrases §2 of the review report (Scottish state schools
    have no separate legal personality from their LA; the LA is the only
    legal person that can sign).
  - England: enabled options are `LocalAuthority`, `MaintainedSchool`,
    `AcademyOrFreeSchool`, `IndependentSchool`
- Both fields required to continue

### Step 2 — Counterparty details

All fields belong to the `counterparty` object. Grouped under three
sub-headings:

- **Legal identity**: `legalName`, `shortName`, `address`
- **Signatory**: `signatoryName`, `signatoryPosition`, `signatoryDate`,
  `signatoryPlace`, `witnessName`, `witnessPosition`, `witnessDate`,
  `witnessAddress`
- **Day-to-day contacts**: `repJobTitle`, `repAddress`, `repEmail`,
  `repPhone`, `escalationJobTitle`, `escalationAddress`,
  `escalationEmail`, `escalationPhone`

If `counterpartyType === "LocalAuthority"`, an additional
`coveredSchoolsSites` textarea appears at the bottom. Helper text
explains it populates Schedule Part 8. Default placeholder: "All
[Council name] secondary schools where MCR is present and delivering the
MCR Programme, and alternative provision sites as agreed first with
[Council name]."

Validation:

- `legalName`, `shortName`, `address` required
- Email fields, if non-empty, must be valid emails
- `coveredSchoolsSites` required when LA
- All other fields optional; blanks fall through to `[insert]` defaults
  in the rendered document so the counterparty can fill them by hand

### Step 3 — Scope

Three labelled switches:

- `includeCriminalRecord` — default `true`. Includes the criminal record
  bullet in Schedule Part 1 and the Article 10 row in the legal-basis
  table.
- `includeGroupwork` — default `true` for Scotland, `false` for England.
  Includes the S1/S2 (Year 7/8) groupwork programme description in
  Schedule Part 7 and changes the count of core programme aspects.
- `includeFundraising` — default `true`. Adds "/fundraising" to the
  Schedule Part 2 marketing/recruitment legal-basis line.

### Step 4 — MCR signing & review

- MCR-side fields (signatory + witness name/position/date), pre-filled
  from `MCR_DEFAULTS` but editable per agreement
- A review panel summarising every entered field. Fields still set to
  `[insert]` defaults are highlighted yellow so the user can choose to
  fill them or leave them for the counterparty.
- **Generate DSA** button, disabled until the full Zod schema passes

On click: generate → save with file-saver → success toast with a
"Generate another" action that resets the form to defaults.

## Data model — Zod as single source of truth

TypeScript types are inferred from Zod schemas; they are not written by
hand. Lives in `src/lib/dsa-builder/schema.ts`.

```ts
const Jurisdiction = z.enum(["Scotland", "England"]);
const CounterpartyType = z.enum([
  "LocalAuthority",
  "MaintainedSchool",
  "AcademyOrFreeSchool",
  "IndependentSchool",
]);

const CounterpartySchema = z.object({
  legalName: z.string().min(1),
  shortName: z.string().min(1),
  address: z.string().min(1),
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
  repEmail: z.string().email().or(z.literal("")).optional().default(""),
  repPhone: z.string().optional().default(""),
  escalationJobTitle: z.string().optional().default(""),
  escalationAddress: z.string().optional().default(""),
  escalationEmail: z.string().email().or(z.literal("")).optional().default(""),
  escalationPhone: z.string().optional().default(""),
  coveredSchoolsSites: z.string().optional().default(""),
});

const McrSchema = z.object({
  signatoryName: z.string().optional().default(""),
  signatoryPosition: z.string().optional().default("Head of Schools"),
  signatoryDate: z.string().optional().default(""),
  witnessName: z.string().optional().default(""),
  witnessPosition: z.string().optional().default("Programme Manager"),
  witnessDate: z.string().optional().default(""),
});

const IntakeSchema = z
  .object({
    jurisdiction: Jurisdiction,
    counterpartyType: CounterpartyType,
    includeCriminalRecord: z.boolean().default(true),
    includeGroupwork: z.boolean().optional(),    // resolved in buildContext
    includeFundraising: z.boolean().default(true),
    counterparty: CounterpartySchema,
    mcr: McrSchema.optional().default({}),
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

type Intake = z.infer<typeof IntakeSchema>;
```

## Generator port

`DSA/generate.js` is ported to TypeScript verbatim — same defaults,
same `buildContext()` logic, same dotted parser, same conditional flags.
Splits into focused files:

- `src/lib/dsa-builder/defaults.ts` —  `SCOTLAND_DEFAULTS`,
  `ENGLAND_DEFAULTS`, `COUNTERPARTY_INCORPORATING_DEFAULTS`,
  `COUNTERPARTY_DESCRIPTION_DEFAULTS`, `MCR_DEFAULTS`
- `src/lib/dsa-builder/build-context.ts` — `buildContext(intake): RenderContext`
- `src/lib/dsa-builder/dotted-parser.ts` — the docxtemplater parser that
  resolves dot-notation tags (`{counterparty.legalName}`)
- `src/lib/dsa-builder/render.ts` — fetches the template, runs
  docxtemplater, scans for stray tokens, saves the blob

The template depends on these flags being present in the rendered
context. `buildContext()` derives them from the intake:

| Flag | True when |
|---|---|
| `isScotland` | `jurisdiction === "Scotland"` |
| `isEngland` | `jurisdiction === "England"` |
| `isLA` | `counterpartyType === "LocalAuthority"` |
| `isSchool` | `!isLA` |
| `crim` | `includeCriminalRecord` (default `true`) |
| `group` | `includeGroupwork` — defaults to `isScotland` if not set |
| `fund` | `includeFundraising` (default `true`) |

Plus the text-substitution fields: `foi.short`, `foi.full`, `childrenAct`,
`businessDayGeographies`, `eduVocab`, `statutoryAnchor`, `targetedGroup`,
`yearGroupSeniorRange`, `yearGroupJuniorRange`, `staffDataSubjects`,
`schedulePartsCount`, `pageCount`, and the full `counterparty` and `mcr`
objects.

## Render pipeline

```ts
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import { dottedParser } from "./dotted-parser";

export async function generate(context: RenderContext) {
  const res = await fetch("/MCR_DSA_Master_Template.docx");
  const buf = await res.arrayBuffer();
  const zip = new PizZip(buf);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
    parser: dottedParser,
  });
  doc.render(context);

  // Post-render validation — these throws mean a bug, not a user error.
  const rendered = zip.file("word/document.xml")!.asText();
  const stray = rendered.match(/\{[#^/]?[A-Za-z][\w.]*\}/g);
  if (stray?.length) {
    throw new Error(`Unsubstituted tokens in output: ${[...new Set(stray)].join(", ")}`);
  }
  if (rendered.includes("undefined")) {
    throw new Error("Rendered output contains literal 'undefined' — nested placeholder did not resolve.");
  }

  const blob = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  saveAs(blob, filename(context));
}
```

Why a custom dotted parser: docxtemplater 3.x's default parser does not
resolve dot-notation (e.g. `{counterparty.legalName}`) — it treats the
whole string as one key, and the value comes back as `undefined`. The
parser walks the scope manually instead. This is the reason the existing
sample outputs render correctly.

Filename: `MCR_DSA_<shortName>_<YYYY-MM-DD>.docx`, with the short name
sanitised — spaces become underscores; everything outside `[A-Za-z0-9_]`
is stripped.

## File layout

```
src/app/(dashboard)/dsa-builder/
  page.tsx                 # entry — renders <Wizard />
  wizard.tsx               # owns step state + RHF form
  stepper.tsx
  step1-jurisdiction.tsx
  step2-counterparty.tsx
  step3-scope.tsx
  step4-mcr-review.tsx
src/lib/dsa-builder/
  schema.ts                # Zod schemas + inferred types
  defaults.ts              # ported defaults blocks
  build-context.ts         # ported buildContext()
  build-context.test.ts
  render.ts                # docxtemplater pipeline + post-render scan
  render.test.ts           # parity test against the 2 sample fixtures
  dotted-parser.ts         # custom dot-notation parser
  filename.ts              # filename sanitiser
  filename.test.ts
  fixtures/
    sample-scotland.json
    sample-england-academy.json
    sample-scotland.generated.docx
    sample-england-academy.generated.docx
public/
  MCR_DSA_Master_Template.docx
```

Tests sit next to the lib code — matches the existing pattern in
`src/lib/html-host/*.test.ts`.

## Validation & guardrails

Enforced by the Zod schema:

- Scotland + non-LA → rejected with the legally-anchored message above.
  Also surfaced as a banner under the counterparty-type radios on step 1.
- LA requires non-empty `coveredSchoolsSites`.
- Email fields must be valid emails if non-empty.

Enforced post-render in `render.ts`:

- Any surviving `{token}` patterns throw with the offending token name.
- Literal `undefined` in the rendered XML throws — always a bug.

Enforced in the UI:

- "Generate DSA" is disabled until the full Zod schema passes.
- The review panel on step 4 highlights `[insert]` defaults in yellow.

## Acceptance criteria

1. **Two-fixture parity.** Running the generator with
   `sample-scotland.json` and `sample-england-academy.json` produces
   `.docx` files whose extracted text matches the corresponding
   `*.generated.docx` fixtures. (Byte-equivalence of the zip is not
   required — internal timestamps differ. Compare extracted text via a
   small helper.)
2. **No stray tokens.** Neither generated `.docx` contains `{` or
   `undefined` in extracted text.
3. **Scotland hard-block.** Setting jurisdiction to Scotland and trying
   to set `counterpartyType` to anything other than `LocalAuthority` is
   impossible in the UI and rejected by Zod with the specific legal
   message.
4. **Conditional content removal.** With `includeGroupwork: false`,
   "S1 and S2" (Scotland) and "Year 7 and Year 8" (England) must not
   appear. With `includeCriminalRecord: false`, "criminal record" and
   "Article 10" must not appear. With `includeFundraising: false`,
   "fundraising" must not appear.
5. **Schedule structure.** When `counterpartyType === LocalAuthority`,
   "Schedule Part 8" appears and the wording reads "eight (8)";
   otherwise neither appears and the wording reads "seven (7)".
6. **Filename.** Downloaded file is named
   `MCR_DSA_<sanitised shortName>_<YYYY-MM-DD>.docx`.
7. **Type-safe.** `tsc --noEmit` passes. ESLint passes with no warnings.
8. **Mobile-friendly.** Every wizard screen renders correctly at 380px
   width — no horizontal scroll, no clipped controls.
9. **Keyboard navigation.** Wizard is fully usable with Tab / Shift+Tab
   / Enter / Space. Form errors are announced (shadcn `FormMessage`).

## Items NOT to change without confirmation

These are legal/business decisions, not technical ones (per handover §12):

- Clauses, defined terms, schedule structure, signature blocks, and any
  other legal text in `MCR_DSA_Master_Template.docx`. The template is
  the source of legal truth. If a token name must change for technical
  reasons, change it in both the template and the generator at the same
  time, and flag it in the PR description.
- The Scotland-only-LA hard-block.
- The defaults in `SCOTLAND_DEFAULTS` and `ENGLAND_DEFAULTS`, especially
  the statutory anchor and the children's act citation.
- The MCR constants (rep address, charity number, registered office,
  domain `mcrpathways.org`).
