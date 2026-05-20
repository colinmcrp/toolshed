# DSA Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/dsa-builder` toolshed route that produces a populated `.docx` Data Sharing Agreement from a 4-step wizard, fully client-side, reusing toolshed's existing Next.js + RHF + Zod + shadcn stack.

**Architecture:** A single Next.js dashboard route holds the wizard. One react-hook-form instance lives on the parent `Wizard` component; step components consume it via `useFormContext`. Generation is client-only — fetch the template from `public/`, render with docxtemplater, post-render-scan the XML for stray tokens, save with file-saver. `buildContext`, defaults, and the dotted parser are ported verbatim from `DSA/generate.js`. The Scotland legal explanation sits behind a `?` Popover with a "See the full pathway" link that opens a Dialog containing the existing SVG flow chart (served via `<iframe>` from `public/`).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui (Form, Popover, Dialog, RadioGroup, Switch, Card, Input, Textarea, Button), react-hook-form, zod, docxtemplater, pizzip, file-saver, Vitest + jsdom.

---

## File map

**New library code** under `src/lib/dsa-builder/`:

| File | Responsibility |
|---|---|
| `schema.ts` | Zod schemas; inferred `Intake`/`Counterparty`/`Mcr`/`RenderContext` types |
| `defaults.ts` | `SCOTLAND_DEFAULTS`, `ENGLAND_DEFAULTS`, `COUNTERPARTY_*_DEFAULTS`, `MCR_DEFAULTS` |
| `dotted-parser.ts` | docxtemplater parser that walks dot-notation paths |
| `build-context.ts` | `buildContext(intake): RenderContext` — port of `DSA/generate.js` |
| `render.ts` | `renderToBlob(template, ctx)` (pure, testable) + `generate(intake)` orchestrator |
| `docx-text.ts` | Test helper that extracts plain text from a `.docx` ArrayBuffer |
| `filename.ts` | `buildFilename(shortName, date): string` — sanitise + format |
| `fixtures/` | `sample-scotland.json`, `sample-england-academy.json`, the two `.generated.docx` |

Each lib file has a sibling `*.test.ts`.

**New UI** under `src/app/(dashboard)/dsa-builder/`:

| File | Responsibility |
|---|---|
| `page.tsx` | Route entry (Server Component) — renders `<Wizard />` |
| `wizard.tsx` | `"use client"` — owns RHF form + step index, wires submit → generate |
| `stepper.tsx` | Visual stepper for the 4 steps |
| `step1-jurisdiction.tsx` | Jurisdiction + counterparty-type radios + Scotland `?` button |
| `scotland-pathway-dialog.tsx` | `?` Popover + Dialog with the SVG flow chart `<iframe>` |
| `step2-counterparty.tsx` | Counterparty details, three groupings + conditional `coveredSchoolsSites` |
| `step3-scope.tsx` | Three scope switches |
| `step4-mcr-review.tsx` | MCR signing fields + review panel + Generate button |

**Static assets** added to `public/`:

| File | From |
|---|---|
| `public/MCR_DSA_Master_Template.docx` | copy of `DSA/MCR_DSA_Master_Template.docx` |
| `public/dsa-builder/scotland-pathway.html` | copy of `DSA/scotland_la_school_dsa_pathway.html` |

**Modified files:**

- `package.json` — add `docxtemplater`, `pizzip`, `file-saver`, `@types/file-saver`
- `src/app/(dashboard)/page.tsx` — add the DSA Builder tile to the tool grid
- `src/components/ui/radio-group.tsx`, `src/components/ui/switch.tsx` — installed via `npx shadcn@latest add radio-group switch`

---

## Task 1: Install dependencies and copy assets

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/components/ui/radio-group.tsx`, `src/components/ui/switch.tsx`
- Create: `public/MCR_DSA_Master_Template.docx`, `public/dsa-builder/scotland-pathway.html`
- Create: `src/lib/dsa-builder/fixtures/sample-scotland.json`, `src/lib/dsa-builder/fixtures/sample-england-academy.json`, `src/lib/dsa-builder/fixtures/sample-scotland.generated.docx`, `src/lib/dsa-builder/fixtures/sample-england-academy.generated.docx`

- [ ] **Step 1: Install runtime deps**

Run from repo root:
```bash
npm install docxtemplater pizzip file-saver
npm install -D @types/file-saver
```

- [ ] **Step 2: Add the two missing shadcn primitives**

```bash
npx shadcn@latest add radio-group switch
```

When prompted to overwrite existing files, say no. Confirm two new files were created at `src/components/ui/radio-group.tsx` and `src/components/ui/switch.tsx`.

- [ ] **Step 3: Copy the master template and pathway diagram into `public/`**

```bash
mkdir -p public/dsa-builder
cp DSA/MCR_DSA_Master_Template.docx public/MCR_DSA_Master_Template.docx
cp DSA/scotland_la_school_dsa_pathway.html public/dsa-builder/scotland-pathway.html
```

- [ ] **Step 4: Copy the test fixtures**

```bash
mkdir -p src/lib/dsa-builder/fixtures
cp DSA/sample-scotland.json src/lib/dsa-builder/fixtures/
cp DSA/sample-england-academy.json src/lib/dsa-builder/fixtures/
cp DSA/sample-scotland.generated.docx src/lib/dsa-builder/fixtures/
cp DSA/sample-england-academy.generated.docx src/lib/dsa-builder/fixtures/
```

- [ ] **Step 5: Verify nothing else regressed**

Run: `npm run lint && npx tsc --noEmit`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/ui/radio-group.tsx src/components/ui/switch.tsx public/MCR_DSA_Master_Template.docx public/dsa-builder/scotland-pathway.html src/lib/dsa-builder/fixtures/
git commit -m "DSA builder: install deps and copy template + fixtures"
```

---

## Task 2: Filename helper (TDD)

**Files:**
- Create: `src/lib/dsa-builder/filename.ts`
- Test: `src/lib/dsa-builder/filename.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/dsa-builder/filename.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildFilename } from "./filename";

describe("buildFilename", () => {
  it("uses YYYY-MM-DD date and replaces spaces with underscores", () => {
    expect(buildFilename("the Council", new Date("2026-05-20T09:00:00Z")))
      .toBe("MCR_DSA_the_Council_2026-05-20.docx");
  });

  it("strips punctuation other than alphanumerics and underscore", () => {
    expect(buildFilename("St. Mary's Academy", new Date("2026-01-02T00:00:00Z")))
      .toBe("MCR_DSA_St_Marys_Academy_2026-01-02.docx");
  });

  it("collapses runs of underscores", () => {
    expect(buildFilename("  the   Council  ", new Date("2026-01-02T00:00:00Z")))
      .toBe("MCR_DSA_the_Council_2026-01-02.docx");
  });

  it("falls back when short name sanitises to empty", () => {
    expect(buildFilename("!!!", new Date("2026-01-02T00:00:00Z")))
      .toBe("MCR_DSA_counterparty_2026-01-02.docx");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/lib/dsa-builder/filename.test.ts`
Expected: fails with "Cannot find module './filename'".

- [ ] **Step 3: Implement**

Create `src/lib/dsa-builder/filename.ts`:

```ts
export function buildFilename(shortName: string, date: Date = new Date()): string {
  const safe = shortName
    .replace(/[^A-Za-z0-9_\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  const stem = safe.length > 0 ? safe : "counterparty";
  const iso = date.toISOString().slice(0, 10);
  return `MCR_DSA_${stem}_${iso}.docx`;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/lib/dsa-builder/filename.test.ts`
Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsa-builder/filename.ts src/lib/dsa-builder/filename.test.ts
git commit -m "DSA builder: filename sanitiser"
```

---

## Task 3: Zod schemas

**Files:**
- Create: `src/lib/dsa-builder/schema.ts`
- Test: `src/lib/dsa-builder/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/dsa-builder/schema.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/lib/dsa-builder/schema.test.ts`
Expected: fails with "Cannot find module './schema'".

- [ ] **Step 3: Implement**

Create `src/lib/dsa-builder/schema.ts`:

```ts
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
  signatoryPosition: z.string().optional().default("Head of Schools"),
  signatoryDate: z.string().optional().default(""),
  witnessName: z.string().optional().default(""),
  witnessPosition: z.string().optional().default("Programme Manager"),
  witnessDate: z.string().optional().default(""),
});
export type Mcr = z.infer<typeof McrSchema>;

export const IntakeSchema = z
  .object({
    jurisdiction: Jurisdiction,
    counterpartyType: CounterpartyType,
    includeCriminalRecord: z.boolean().default(true),
    includeGroupwork: z.boolean().optional(),
    includeFundraising: z.boolean().default(true),
    counterparty: CounterpartySchema,
    mcr: McrSchema.optional().default({
      signatoryName: "",
      signatoryPosition: "Head of Schools",
      signatoryDate: "",
      witnessName: "",
      witnessPosition: "Programme Manager",
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
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/lib/dsa-builder/schema.test.ts`
Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsa-builder/schema.ts src/lib/dsa-builder/schema.test.ts
git commit -m "DSA builder: Zod schemas"
```

---

## Task 4: Defaults port

**Files:**
- Create: `src/lib/dsa-builder/defaults.ts`

This is a verbatim port of the constants in `DSA/generate.js`. No tests — these are pure data.

- [ ] **Step 1: Create the file**

Create `src/lib/dsa-builder/defaults.ts`:

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dsa-builder/defaults.ts
git commit -m "DSA builder: port defaults from generate.js"
```

---

## Task 5: Dotted parser

**Files:**
- Create: `src/lib/dsa-builder/dotted-parser.ts`
- Test: `src/lib/dsa-builder/dotted-parser.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/dsa-builder/dotted-parser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dottedParser } from "./dotted-parser";

describe("dottedParser", () => {
  it("resolves a top-level key", () => {
    const parser = dottedParser("name");
    expect(parser.get({ name: "Edinburgh" })).toBe("Edinburgh");
  });

  it("resolves a dot-notation path", () => {
    const parser = dottedParser("counterparty.legalName");
    expect(parser.get({ counterparty: { legalName: "Edinburgh" } }))
      .toBe("Edinburgh");
  });

  it("returns empty string for a missing path", () => {
    const parser = dottedParser("counterparty.missing");
    expect(parser.get({ counterparty: {} })).toBe("");
  });

  it("returns empty string for null along the path", () => {
    const parser = dottedParser("counterparty.legalName");
    expect(parser.get({ counterparty: null })).toBe("");
  });

  it("returns the scope itself for '.'", () => {
    const parser = dottedParser(".");
    expect(parser.get("self")).toBe("self");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/lib/dsa-builder/dotted-parser.test.ts`
Expected: fails — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/dsa-builder/dotted-parser.ts`:

```ts
// docxtemplater 3.x's default parser does not resolve dot-notation paths
// (e.g. {counterparty.legalName}) — it treats the whole string as one key
// and the value comes back as undefined. This parser walks the scope manually.
export function dottedParser(tag: string) {
  const path = tag.trim();
  return {
    get(scope: unknown): unknown {
      if (path === ".") return scope;
      const parts = path.split(".");
      let cur: unknown = scope;
      for (const part of parts) {
        if (cur == null || typeof cur !== "object") return "";
        cur = (cur as Record<string, unknown>)[part];
      }
      return cur == null ? "" : cur;
    },
  };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/lib/dsa-builder/dotted-parser.test.ts`
Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsa-builder/dotted-parser.ts src/lib/dsa-builder/dotted-parser.test.ts
git commit -m "DSA builder: dotted-path docxtemplater parser"
```

---

## Task 6: `buildContext` port

**Files:**
- Create: `src/lib/dsa-builder/build-context.ts`
- Test: `src/lib/dsa-builder/build-context.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/dsa-builder/build-context.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/lib/dsa-builder/build-context.test.ts`
Expected: fails — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/dsa-builder/build-context.ts`:

```ts
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
  mcr: typeof MCR_DEFAULTS;
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
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/lib/dsa-builder/build-context.test.ts`
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsa-builder/build-context.ts src/lib/dsa-builder/build-context.test.ts
git commit -m "DSA builder: port buildContext from generate.js"
```

---

## Task 7: docx-text helper and render pipeline (TDD against fixtures)

**Files:**
- Create: `src/lib/dsa-builder/docx-text.ts`
- Create: `src/lib/dsa-builder/render.ts`
- Test: `src/lib/dsa-builder/render.test.ts`

This task pairs a tiny test helper (`extractDocxText`) with the render pipeline, because the parity tests need both. There is no separate test for `extractDocxText` — it is exercised by every render test.

- [ ] **Step 1: Write the failing test**

Create `src/lib/dsa-builder/render.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildContext } from "./build-context";
import { renderToBuffer } from "./render";
import { extractDocxText } from "./docx-text";
import type { Intake } from "./schema";

const repoRoot = resolve(__dirname, "..", "..", "..");
const TEMPLATE = readFileSync(
  resolve(repoRoot, "public", "MCR_DSA_Master_Template.docx"),
);
const FIXTURE_DIR = resolve(__dirname, "fixtures");

function loadIntake(file: string): Intake {
  const raw = JSON.parse(readFileSync(resolve(FIXTURE_DIR, file), "utf8"));
  // Strip the _comment field used in the JSON fixtures.
  delete raw._comment;
  return raw as Intake;
}

function loadFixture(file: string): Buffer {
  return readFileSync(resolve(FIXTURE_DIR, file));
}

function normaliseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

describe("renderToBuffer — parity with reference fixtures", () => {
  it("Scotland LA fixture matches reference output text", () => {
    const intake = loadIntake("sample-scotland.json");
    const got = renderToBuffer(TEMPLATE, buildContext(intake));
    const expected = loadFixture("sample-scotland.generated.docx");
    expect(normaliseWhitespace(extractDocxText(got))).toBe(
      normaliseWhitespace(extractDocxText(expected)),
    );
  });

  it("England academy fixture matches reference output text", () => {
    const intake = loadIntake("sample-england-academy.json");
    const got = renderToBuffer(TEMPLATE, buildContext(intake));
    const expected = loadFixture("sample-england-academy.generated.docx");
    expect(normaliseWhitespace(extractDocxText(got))).toBe(
      normaliseWhitespace(extractDocxText(expected)),
    );
  });

  it("produces no stray {token} substrings in extracted text", () => {
    const intake = loadIntake("sample-scotland.json");
    const got = renderToBuffer(TEMPLATE, buildContext(intake));
    expect(extractDocxText(got)).not.toMatch(/\{[A-Za-z]/);
  });

  it("produces no literal 'undefined' in extracted text", () => {
    const intake = loadIntake("sample-england-academy.json");
    const got = renderToBuffer(TEMPLATE, buildContext(intake));
    expect(extractDocxText(got)).not.toContain("undefined");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/lib/dsa-builder/render.test.ts`
Expected: fails — `./render` and `./docx-text` modules not found.

- [ ] **Step 3: Implement the text extractor**

Create `src/lib/dsa-builder/docx-text.ts`:

```ts
import PizZip from "pizzip";

// Pulls the readable text out of a .docx ArrayBuffer / Buffer by reading
// word/document.xml and stripping XML tags. Used by tests to compare
// rendered output to reference fixtures by content, not by byte equality
// (zip metadata timestamps will differ between runs).
export function extractDocxText(input: ArrayBuffer | Buffer | Uint8Array): string {
  const zip = new PizZip(input);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  return xml
    .replace(/<w:tab\/>/g, " ")
    .replace(/<w:br\/>/g, " ")
    .replace(/<w:p[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
```

- [ ] **Step 4: Implement the renderer**

Create `src/lib/dsa-builder/render.ts`:

```ts
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { buildContext, type RenderContext } from "./build-context";
import { buildFilename } from "./filename";
import { dottedParser } from "./dotted-parser";
import type { Intake } from "./schema";

const STRAY_TOKEN_RE = /\{[#^/]?[A-Za-z][\w.]*\}/g;

function assertCleanRender(zip: PizZip): void {
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  const stray = xml.match(STRAY_TOKEN_RE);
  if (stray && stray.length > 0) {
    const unique = [...new Set(stray)];
    throw new Error(
      `DSA render produced unsubstituted tokens: ${unique.join(", ")}`,
    );
  }
  if (xml.includes("undefined")) {
    throw new Error(
      "DSA render produced literal 'undefined' in the document XML — a nested placeholder did not resolve.",
    );
  }
}

// Pure renderer: takes a template buffer and a context, returns the
// rendered .docx as a Buffer-like Uint8Array. Suitable for tests.
export function renderToBuffer(
  template: ArrayBuffer | Buffer | Uint8Array,
  context: RenderContext,
): Uint8Array {
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
    parser: dottedParser,
  });
  doc.render(context);
  assertCleanRender(doc.getZip());
  return doc.getZip().generate({ type: "uint8array", compression: "DEFLATE" });
}

// Browser orchestrator: fetch the template, render, save with file-saver.
export async function generateAndDownload(intake: Intake): Promise<void> {
  const res = await fetch("/MCR_DSA_Master_Template.docx");
  if (!res.ok) {
    throw new Error(
      `Failed to fetch DSA template: ${res.status} ${res.statusText}`,
    );
  }
  const buf = await res.arrayBuffer();
  const context = buildContext(intake);
  const bytes = renderToBuffer(buf, context);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  saveAs(blob, buildFilename(intake.counterparty.shortName));
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npx vitest run src/lib/dsa-builder/render.test.ts`
Expected: all 4 tests pass.

If the parity tests fail with a substantive text diff, the cause is almost always one of:
- A typo in the ported defaults — re-check `defaults.ts` against `DSA/generate.js` line by line.
- A field omitted from the `RenderContext` — confirm every key referenced in the master template has a value in the context object.
- The `dottedParser` isn't being passed in the docxtemplater options — re-check `renderToBuffer`.

Do not edit the reference fixtures to make the tests pass. The fixtures are the source of truth.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dsa-builder/docx-text.ts src/lib/dsa-builder/render.ts src/lib/dsa-builder/render.test.ts
git commit -m "DSA builder: render pipeline with fixture parity tests"
```

---

## Task 8: Conditional-content acceptance tests

**Files:**
- Modify: `src/lib/dsa-builder/render.test.ts`

These tests cover acceptance criteria #4 and #5 from the spec — conditional content removal based on scope toggles, and schedule structure changes between LA and school counterparties.

- [ ] **Step 1: Add the new test cases**

Append to `src/lib/dsa-builder/render.test.ts`:

```ts
import type { Counterparty } from "./schema";

const englandSchoolCounterparty: Counterparty = {
  legalName: "Example Academy Trust",
  shortName: "the Academy",
  address: "1 Example Street, Example Town, EX1 1EX",
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
  coveredSchoolsSites: "",
};

const englandSchoolIntake: Intake = {
  jurisdiction: "England",
  counterpartyType: "AcademyOrFreeSchool",
  includeCriminalRecord: true,
  includeFundraising: true,
  counterparty: englandSchoolCounterparty,
  mcr: {
    signatoryName: "",
    signatoryPosition: "Head of Schools",
    signatoryDate: "",
    witnessName: "",
    witnessPosition: "Programme Manager",
    witnessDate: "",
  },
};

function renderText(intake: Intake): string {
  return extractDocxText(renderToBuffer(TEMPLATE, buildContext(intake)));
}

describe("conditional content removal", () => {
  it("omits S1/S2 groupwork content when includeGroupwork is false (Scotland)", () => {
    const intake = loadIntake("sample-scotland.json");
    intake.includeGroupwork = false;
    expect(renderText(intake)).not.toMatch(/S1 and S2/);
  });

  it("omits Year 7/8 groupwork content when includeGroupwork is true in England", () => {
    expect(
      renderText({ ...englandSchoolIntake, includeGroupwork: false }),
    ).not.toMatch(/Year 7 and Year 8/);
  });

  it("omits criminal record content when includeCriminalRecord is false", () => {
    const text = renderText({ ...englandSchoolIntake, includeCriminalRecord: false });
    expect(text).not.toMatch(/criminal record/i);
    expect(text).not.toMatch(/Article 10/);
  });

  it("omits fundraising content when includeFundraising is false", () => {
    const text = renderText({ ...englandSchoolIntake, includeFundraising: false });
    expect(text).not.toMatch(/fundraising/i);
  });
});

describe("schedule structure differs by counterparty", () => {
  it("LA counterparty: 'Schedule Part 8' present and 'eight (8)' wording", () => {
    const text = renderText(loadIntake("sample-scotland.json"));
    expect(text).toContain("Schedule Part 8");
    expect(text).toContain("eight (8)");
  });

  it("School counterparty: 'Schedule Part 8' absent and 'seven (7)' wording", () => {
    const text = renderText(englandSchoolIntake);
    expect(text).not.toContain("Schedule Part 8");
    expect(text).toContain("seven (7)");
  });
});
```

- [ ] **Step 2: Run the tests and confirm they pass**

Run: `npx vitest run src/lib/dsa-builder/render.test.ts`
Expected: 10 tests pass.

If a content-removal assertion fails, the master template's conditional section likely doesn't match the flag name. Confirm `crim`, `group`, `fund`, `isLA` are referenced as `{#flag} ... {/flag}` or `{^flag} ... {/flag}` in `MCR_DSA_Master_Template.docx` and that the names in `RenderContext` line up exactly.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dsa-builder/render.test.ts
git commit -m "DSA builder: conditional-content + schedule-structure acceptance tests"
```

---

## Task 9: Dashboard route, stepper, and wizard shell

**Files:**
- Create: `src/app/(dashboard)/dsa-builder/page.tsx`
- Create: `src/app/(dashboard)/dsa-builder/wizard.tsx`
- Create: `src/app/(dashboard)/dsa-builder/stepper.tsx`

This task lays down the route with a working RHF form and a stepper, but each step is just a placeholder card showing the step number. Subsequent tasks fill the steps in.

- [ ] **Step 1: Server-component entry**

Create `src/app/(dashboard)/dsa-builder/page.tsx`:

```tsx
import { Wizard } from "./wizard";

export default function DsaBuilderPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          DSA Builder
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate a Data Sharing Agreement as a downloadable Word document.
        </p>
      </div>
      <Wizard />
    </div>
  );
}
```

- [ ] **Step 2: Stepper**

Create `src/app/(dashboard)/dsa-builder/stepper.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  "Jurisdiction",
  "Counterparty",
  "Scope",
  "MCR & review",
] as const;

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs sm:text-sm">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2",
              i < STEPS.length - 1 && "flex-1",
            )}
          >
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium",
                active && "border-primary bg-primary text-primary-foreground",
                done && "border-primary bg-primary/10 text-primary",
                !active && !done && "border-border text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "whitespace-nowrap",
                active ? "font-medium" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 3: Wizard shell with RHF and placeholder steps**

Create `src/app/(dashboard)/dsa-builder/wizard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IntakeSchema, type Intake } from "@/lib/dsa-builder/schema";
import { generateAndDownload } from "@/lib/dsa-builder/render";
import { Stepper } from "./stepper";

const DEFAULT_VALUES: Intake = {
  jurisdiction: "Scotland",
  counterpartyType: "LocalAuthority",
  includeCriminalRecord: true,
  includeGroupwork: undefined,
  includeFundraising: true,
  counterparty: {
    legalName: "",
    shortName: "",
    address: "",
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
    coveredSchoolsSites: "",
  },
  mcr: {
    signatoryName: "",
    signatoryPosition: "Head of Schools",
    signatoryDate: "",
    witnessName: "",
    witnessPosition: "Programme Manager",
    witnessDate: "",
  },
};

export function Wizard() {
  const [step, setStep] = useState(0);
  const form = useForm<Intake>({
    resolver: zodResolver(IntakeSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await generateAndDownload(data);
      toast.success("DSA generated", {
        action: {
          label: "Generate another",
          onClick: () => {
            form.reset(DEFAULT_VALUES);
            setStep(0);
          },
        },
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate the DSA",
      );
    }
  });

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <Stepper current={step} />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Step {step + 1} placeholder — to be implemented.
            </p>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={() => setStep((s) => Math.min(3, s + 1))}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={onSubmit}>
              Generate DSA
            </Button>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
```

- [ ] **Step 4: Smoke-check**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

Optional manual check: run `npm run dev`, browse to `http://localhost:3000/dsa-builder` (signing in if prompted), and confirm the page renders with the stepper, a placeholder card, and working Back / Next / Generate buttons. The Generate button will fail validation noisily at this point — that is expected until step content is built.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dsa-builder/page.tsx src/app/\(dashboard\)/dsa-builder/wizard.tsx src/app/\(dashboard\)/dsa-builder/stepper.tsx
git commit -m "DSA builder: route, stepper, and wizard shell"
```

---

## Task 10: Step 1 — Jurisdiction, counterparty type, and Scotland pathway popover

**Files:**
- Create: `src/app/(dashboard)/dsa-builder/step1-jurisdiction.tsx`
- Create: `src/app/(dashboard)/dsa-builder/scotland-pathway-dialog.tsx`
- Modify: `src/app/(dashboard)/dsa-builder/wizard.tsx`

- [ ] **Step 1: Scotland pathway popover + dialog**

Create `src/app/(dashboard)/dsa-builder/scotland-pathway-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ScotlandPathwayHelp() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            aria-label="Why is only Local Authority enabled for Scotland?"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 text-sm">
          <p className="font-medium">Why only Local Authority for Scotland?</p>
          <p className="mt-2 text-muted-foreground">
            Scottish state schools have no separate legal personality from their
            local authority. Under the Education (Scotland) Act 1980 the council
            is the &ldquo;education authority&rdquo; that controls pupil data — so
            the DSA is with the council, not the school.
          </p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="mt-3 text-primary underline-offset-4 hover:underline"
          >
            See the full pathway →
          </button>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Scotland LA-owned school DSA pathway</DialogTitle>
          </DialogHeader>
          <iframe
            src="/dsa-builder/scotland-pathway.html"
            title="Scotland LA-owned school DSA pathway"
            className="h-[70vh] w-full rounded border border-border"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Step 1 component**

Create `src/app/(dashboard)/dsa-builder/step1-jurisdiction.tsx`:

```tsx
"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Intake } from "@/lib/dsa-builder/schema";
import { ScotlandPathwayHelp } from "./scotland-pathway-dialog";

const COUNTERPARTY_OPTIONS = [
  { value: "LocalAuthority", label: "Local Authority" },
  { value: "MaintainedSchool", label: "Maintained school" },
  { value: "AcademyOrFreeSchool", label: "Academy / free school" },
  { value: "IndependentSchool", label: "Independent school" },
] as const;

export function Step1Jurisdiction() {
  const form = useFormContext<Intake>();
  const jurisdiction = form.watch("jurisdiction");
  const isScotland = jurisdiction === "Scotland";

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="jurisdiction"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Jurisdiction</FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  // If switching back to Scotland, force counterparty back to LA.
                  if (value === "Scotland") {
                    form.setValue("counterpartyType", "LocalAuthority", {
                      shouldValidate: true,
                    });
                  }
                }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Scotland" id="jurisdiction-scotland" />
                  <Label htmlFor="jurisdiction-scotland">Scotland</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="England" id="jurisdiction-england" />
                  <Label htmlFor="jurisdiction-england">England</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="counterpartyType"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-1">
              <FormLabel>Counterparty type</FormLabel>
              {isScotland && <ScotlandPathwayHelp />}
            </div>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col gap-2"
              >
                {COUNTERPARTY_OPTIONS.map((opt) => {
                  const disabled = isScotland && opt.value !== "LocalAuthority";
                  return (
                    <div
                      key={opt.value}
                      className="flex items-center gap-2"
                      data-disabled={disabled || undefined}
                    >
                      <RadioGroupItem
                        value={opt.value}
                        id={`counterparty-${opt.value}`}
                        disabled={disabled}
                      />
                      <Label
                        htmlFor={`counterparty-${opt.value}`}
                        className={disabled ? "text-muted-foreground" : ""}
                      >
                        {opt.label}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
```

- [ ] **Step 3: Wire Step 1 into the wizard and add per-step validation on Next**

Edit `src/app/(dashboard)/dsa-builder/wizard.tsx`. Replace the placeholder card render and the Next handler with step-aware versions.

Locate the import block at the top and add this import:

```tsx
import { Step1Jurisdiction } from "./step1-jurisdiction";
```

Then locate the existing `<Card>` and Next-button section:

```tsx
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Step {step + 1} placeholder — to be implemented.
            </p>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={() => setStep((s) => Math.min(3, s + 1))}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={onSubmit}>
              Generate DSA
            </Button>
          )}
        </div>
```

Replace it with:

```tsx
        <Card>
          <CardContent className="p-6">
            {step === 0 && <Step1Jurisdiction />}
            {step !== 0 && (
              <p className="text-sm text-muted-foreground">
                Step {step + 1} placeholder — to be implemented.
              </p>
            )}
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              onClick={async () => {
                const fields = STEP_FIELDS[step];
                const valid = await form.trigger(fields);
                if (valid) setStep((s) => Math.min(3, s + 1));
              }}
            >
              Next
            </Button>
          ) : (
            <Button type="button" onClick={onSubmit}>
              Generate DSA
            </Button>
          )}
        </div>
```

Then update the existing react-hook-form import line so it also brings in the `Path` type:

```tsx
import { FormProvider, useForm, type Path } from "react-hook-form";
```

And add this constant immediately after `DEFAULT_VALUES`:

```tsx
const STEP_FIELDS: Record<number, Path<Intake>[]> = {
  0: ["jurisdiction", "counterpartyType"],
  1: ["counterparty"],
  2: ["includeCriminalRecord", "includeGroupwork", "includeFundraising"],
  3: ["mcr"],
};
```

- [ ] **Step 4: Smoke-check**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 5: Manual check**

Run `npm run dev`, browse to `/dsa-builder`, and confirm:

- Selecting Scotland shows a `?` icon next to "Counterparty type".
- Clicking the `?` opens a popover with the legal explanation.
- Clicking "See the full pathway →" opens a dialog with the flow chart (rendered in an iframe).
- Selecting England hides the `?` and enables all four counterparty options.
- Switching back to Scotland resets counterparty type to LocalAuthority.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/dsa-builder/step1-jurisdiction.tsx src/app/\(dashboard\)/dsa-builder/scotland-pathway-dialog.tsx src/app/\(dashboard\)/dsa-builder/wizard.tsx
git commit -m "DSA builder: step 1 (jurisdiction + counterparty + Scotland pathway help)"
```

---

## Task 11: Step 2 — Counterparty details

**Files:**
- Create: `src/app/(dashboard)/dsa-builder/step2-counterparty.tsx`
- Modify: `src/app/(dashboard)/dsa-builder/wizard.tsx`

- [ ] **Step 1: Create Step 2**

Create `src/app/(dashboard)/dsa-builder/step2-counterparty.tsx`:

```tsx
"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Intake } from "@/lib/dsa-builder/schema";

type Field = {
  name: keyof Intake["counterparty"];
  label: string;
  required?: boolean;
  type?: "email";
};

const LEGAL_IDENTITY: Field[] = [
  { name: "legalName", label: "Legal name", required: true },
  { name: "shortName", label: "Short name", required: true },
  { name: "address", label: "Address", required: true },
];

const SIGNATORY: Field[] = [
  { name: "signatoryName", label: "Signatory name" },
  { name: "signatoryPosition", label: "Signatory position" },
  { name: "signatoryDate", label: "Signatory date" },
  { name: "signatoryPlace", label: "Place of signing" },
  { name: "witnessName", label: "Witness name" },
  { name: "witnessPosition", label: "Witness position" },
  { name: "witnessDate", label: "Witness date" },
  { name: "witnessAddress", label: "Witness address" },
];

const CONTACTS: Field[] = [
  { name: "repJobTitle", label: "Day-to-day contact — job title" },
  { name: "repAddress", label: "Day-to-day contact — address" },
  { name: "repEmail", label: "Day-to-day contact — email", type: "email" },
  { name: "repPhone", label: "Day-to-day contact — phone" },
  { name: "escalationJobTitle", label: "Escalation contact — job title" },
  { name: "escalationAddress", label: "Escalation contact — address" },
  { name: "escalationEmail", label: "Escalation contact — email", type: "email" },
  { name: "escalationPhone", label: "Escalation contact — phone" },
];

function TextField({ field }: { field: Field }) {
  const form = useFormContext<Intake>();
  return (
    <FormField
      control={form.control}
      name={`counterparty.${field.name}` as const}
      render={({ field: f }) => (
        <FormItem>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </FormLabel>
          <FormControl>
            <Input type={field.type ?? "text"} {...f} value={f.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function Section({ title, fields }: { title: string; fields: Field[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <TextField key={f.name} field={f} />
        ))}
      </div>
    </section>
  );
}

export function Step2Counterparty() {
  const form = useFormContext<Intake>();
  const isLA = form.watch("counterpartyType") === "LocalAuthority";

  return (
    <div className="space-y-6">
      <Section title="Legal identity" fields={LEGAL_IDENTITY} />
      <Section title="Signatory" fields={SIGNATORY} />
      <Section title="Day-to-day contacts" fields={CONTACTS} />

      {isLA && (
        <FormField
          control={form.control}
          name="counterparty.coveredSchoolsSites"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Schools and alternative provision sites covered
                <span className="text-destructive"> *</span>
              </FormLabel>
              <FormDescription>
                Populates Schedule Part 8. A standing description such as
                &ldquo;All [Council name] secondary schools where MCR is present
                and delivering the MCR Programme&rdquo; means newly-added
                schools are covered automatically — no variation letter
                needed.
              </FormDescription>
              <FormControl>
                <Textarea rows={4} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire Step 2 into the wizard**

Edit `src/app/(dashboard)/dsa-builder/wizard.tsx`. Add the import:

```tsx
import { Step2Counterparty } from "./step2-counterparty";
```

Inside the `<CardContent>`, change:

```tsx
            {step !== 0 && (
              <p className="text-sm text-muted-foreground">
                Step {step + 1} placeholder — to be implemented.
              </p>
            )}
```

to:

```tsx
            {step === 1 && <Step2Counterparty />}
            {step >= 2 && (
              <p className="text-sm text-muted-foreground">
                Step {step + 1} placeholder — to be implemented.
              </p>
            )}
```

- [ ] **Step 3: Smoke-check**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 4: Manual check**

Run `npm run dev`. With Scotland selected on step 1 and LA, step 2 should show three sections plus the covered-schools textarea. Switching to England + AcademyOrFreeSchool on step 1 should hide the textarea on step 2.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dsa-builder/step2-counterparty.tsx src/app/\(dashboard\)/dsa-builder/wizard.tsx
git commit -m "DSA builder: step 2 (counterparty details)"
```

---

## Task 12: Step 3 — Scope toggles

**Files:**
- Create: `src/app/(dashboard)/dsa-builder/step3-scope.tsx`
- Modify: `src/app/(dashboard)/dsa-builder/wizard.tsx`

- [ ] **Step 1: Create Step 3**

Create `src/app/(dashboard)/dsa-builder/step3-scope.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import type { Intake } from "@/lib/dsa-builder/schema";

type ScopeField = {
  name: "includeCriminalRecord" | "includeGroupwork" | "includeFundraising";
  label: string;
  description: string;
};

const FIELDS: ScopeField[] = [
  {
    name: "includeCriminalRecord",
    label: "Include criminal record data",
    description:
      "Includes the criminal record bullet in Schedule Part 1 and the Article 10 row in the legal-basis table. Turn off only if MCR has been told not to receive criminal record data for this partnership.",
  },
  {
    name: "includeGroupwork",
    label: "Include S1/S2 groupwork programme",
    description:
      "Includes the S1/S2 (Year 7/Year 8) groupwork programme description in Schedule Part 7 and changes the count of core programme aspects to two.",
  },
  {
    name: "includeFundraising",
    label: "Include fundraising in marketing legal basis",
    description:
      "Adds “/fundraising” to the Schedule Part 2 marketing/recruitment legal-basis line.",
  },
];

export function Step3Scope() {
  const form = useFormContext<Intake>();

  // includeGroupwork defaults to true in Scotland, false in England. We
  // resolve the undefined-on-mount case here so the switch reflects the
  // jurisdiction-aware default visually.
  useEffect(() => {
    const value = form.getValues("includeGroupwork");
    if (value === undefined) {
      const jurisdiction = form.getValues("jurisdiction");
      form.setValue("includeGroupwork", jurisdiction === "Scotland");
    }
  }, [form]);

  return (
    <div className="space-y-4">
      {FIELDS.map((f) => (
        <FormField
          key={f.name}
          control={form.control}
          name={f.name}
          render={({ field }) => (
            <FormItem className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div className="space-y-1">
                <FormLabel className="text-sm">{f.label}</FormLabel>
                <FormDescription className="text-xs">
                  {f.description}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire Step 3 into the wizard**

Edit `src/app/(dashboard)/dsa-builder/wizard.tsx`. Add the import:

```tsx
import { Step3Scope } from "./step3-scope";
```

Change:

```tsx
            {step === 1 && <Step2Counterparty />}
            {step >= 2 && (
              <p className="text-sm text-muted-foreground">
                Step {step + 1} placeholder — to be implemented.
              </p>
            )}
```

to:

```tsx
            {step === 1 && <Step2Counterparty />}
            {step === 2 && <Step3Scope />}
            {step === 3 && (
              <p className="text-sm text-muted-foreground">
                Step 4 placeholder — to be implemented.
              </p>
            )}
```

- [ ] **Step 3: Smoke-check**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dsa-builder/step3-scope.tsx src/app/\(dashboard\)/dsa-builder/wizard.tsx
git commit -m "DSA builder: step 3 (scope toggles)"
```

---

## Task 13: Step 4 — MCR signing and review

**Files:**
- Create: `src/app/(dashboard)/dsa-builder/step4-mcr-review.tsx`
- Modify: `src/app/(dashboard)/dsa-builder/wizard.tsx`

- [ ] **Step 1: Create Step 4**

Create `src/app/(dashboard)/dsa-builder/step4-mcr-review.tsx`:

```tsx
"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Intake } from "@/lib/dsa-builder/schema";

const MCR_FIELDS: { name: keyof Intake["mcr"]; label: string }[] = [
  { name: "signatoryName", label: "MCR signatory name" },
  { name: "signatoryPosition", label: "MCR signatory position" },
  { name: "signatoryDate", label: "MCR signatory date" },
  { name: "witnessName", label: "MCR witness name" },
  { name: "witnessPosition", label: "MCR witness position" },
  { name: "witnessDate", label: "MCR witness date" },
];

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  const isInsert = !value || value.trim() === "";
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "col-span-2 break-words",
          isInsert && "rounded bg-yellow-100 px-1 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100",
        )}
      >
        {isInsert ? "[insert]" : value}
      </dd>
    </div>
  );
}

export function Step4McrReview() {
  const form = useFormContext<Intake>();
  const values = form.watch();
  const isLA = values.counterpartyType === "LocalAuthority";

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">MCR signing</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {MCR_FIELDS.map((f) => (
            <FormField
              key={f.name}
              control={form.control}
              name={`mcr.${f.name}` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{f.label}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Review</h2>
        <p className="text-xs text-muted-foreground">
          Fields highlighted in yellow are still <code>[insert]</code> defaults
          — they will appear that way in the generated document. Click Back to
          fill them in now, or leave them for the counterparty to complete by
          hand.
        </p>
        <dl className="rounded-lg border border-border p-4">
          <ReviewRow label="Jurisdiction" value={values.jurisdiction} />
          <ReviewRow label="Counterparty type" value={values.counterpartyType} />
          <ReviewRow label="Counterparty legal name" value={values.counterparty.legalName} />
          <ReviewRow label="Counterparty short name" value={values.counterparty.shortName} />
          <ReviewRow label="Counterparty address" value={values.counterparty.address} />
          {isLA && (
            <ReviewRow
              label="Covered schools / sites"
              value={values.counterparty.coveredSchoolsSites}
            />
          )}
          <ReviewRow label="Signatory name" value={values.counterparty.signatoryName} />
          <ReviewRow label="Signatory position" value={values.counterparty.signatoryPosition} />
          <ReviewRow label="Signatory date" value={values.counterparty.signatoryDate} />
          <ReviewRow label="Witness name" value={values.counterparty.witnessName} />
          <ReviewRow label="Witness position" value={values.counterparty.witnessPosition} />
          <ReviewRow label="Witness date" value={values.counterparty.witnessDate} />
          <ReviewRow label="Day-to-day rep title" value={values.counterparty.repJobTitle} />
          <ReviewRow label="Day-to-day rep email" value={values.counterparty.repEmail} />
          <ReviewRow label="Escalation rep title" value={values.counterparty.escalationJobTitle} />
          <ReviewRow label="Escalation rep email" value={values.counterparty.escalationEmail} />
          <ReviewRow
            label="Criminal record"
            value={values.includeCriminalRecord ? "Included" : "Excluded"}
          />
          <ReviewRow
            label="S1/S2 groupwork"
            value={values.includeGroupwork ? "Included" : "Excluded"}
          />
          <ReviewRow
            label="Fundraising"
            value={values.includeFundraising ? "Included" : "Excluded"}
          />
          <ReviewRow label="MCR signatory" value={values.mcr.signatoryName} />
          <ReviewRow label="MCR signatory date" value={values.mcr.signatoryDate} />
          <ReviewRow label="MCR witness" value={values.mcr.witnessName} />
          <ReviewRow label="MCR witness date" value={values.mcr.witnessDate} />
        </dl>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Wire Step 4 + disable Generate until the whole form validates**

Edit `src/app/(dashboard)/dsa-builder/wizard.tsx`. Add the import:

```tsx
import { Step4McrReview } from "./step4-mcr-review";
```

Replace the placeholder branch:

```tsx
            {step === 3 && (
              <p className="text-sm text-muted-foreground">
                Step 4 placeholder — to be implemented.
              </p>
            )}
```

with:

```tsx
            {step === 3 && <Step4McrReview />}
```

Then update the Generate button to disable while invalid and while submitting:

Replace:

```tsx
          ) : (
            <Button type="button" onClick={onSubmit}>
              Generate DSA
            </Button>
          )}
```

with:

```tsx
          ) : (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!form.formState.isValid || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Generating…" : "Generate DSA"}
            </Button>
          )}
```

- [ ] **Step 3: Smoke-check**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 4: Manual end-to-end check**

Run `npm run dev`. Walk through:

1. Step 1: Scotland → LocalAuthority. Verify the `?` popover + dialog work.
2. Step 2: legal name "City of Edinburgh Council", short name "the Council", address "Waverley Court, Edinburgh", covered schools "All Edinburgh secondary schools where MCR is present". Leave the rest blank.
3. Step 3: leave all three switches at defaults.
4. Step 4: confirm the review panel shows yellow `[insert]` rows for the empty fields. Click Generate.
5. Confirm a file like `MCR_DSA_the_Council_YYYY-MM-DD.docx` downloads and opens in Word with realistic content.
6. Confirm a "Generate another" toast appears and resets the form when clicked.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dsa-builder/step4-mcr-review.tsx src/app/\(dashboard\)/dsa-builder/wizard.tsx
git commit -m "DSA builder: step 4 (MCR signing + review + generate)"
```

---

## Task 14: Homepage tile

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Add the tile**

Open `src/app/(dashboard)/page.tsx`. Locate the existing `tools` array:

```tsx
import { Lock, Globe } from "lucide-react";
// ...
const tools = [
  {
    href: "/secure-zip",
    icon: Lock,
    title: "Secure Zip",
    description: "Create password-protected zip archives.",
  },
  {
    href: "/html-host",
    icon: Globe,
    title: "HTML Host",
    description: "Host and share HTML artifacts by link.",
  },
];
```

Update the icon import and add the new tile:

```tsx
import { Lock, Globe, FileText } from "lucide-react";
// ...
const tools = [
  {
    href: "/secure-zip",
    icon: Lock,
    title: "Secure Zip",
    description: "Create password-protected zip archives.",
  },
  {
    href: "/html-host",
    icon: Globe,
    title: "HTML Host",
    description: "Host and share HTML artifacts by link.",
  },
  {
    href: "/dsa-builder",
    icon: FileText,
    title: "DSA Builder",
    description: "Generate a Data Sharing Agreement Word document.",
  },
];
```

- [ ] **Step 2: Smoke-check**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "DSA builder: add tile to dashboard homepage"
```

---

## Task 15: Final verification

This is the acceptance pass. No code changes — only running checks.

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all DSA builder tests pass (filename, schema, dotted-parser, build-context, render parity + conditional content + schedule structure) alongside the existing html-host tests.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass with no errors and no warnings.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds. The build output should include `/dsa-builder` as a route.

- [ ] **Step 4: Manual acceptance pass**

Run `npm run dev` and verify each acceptance criterion from the spec:

- **#3 Scotland hard-block:** select Scotland, try to choose any non-LA option — disabled. Open the `?` popover and the "See the full pathway" dialog.
- **#5 Schedule structure:** generate a Scotland LA DSA, open in Word, confirm "Schedule Part 8" exists and "eight (8)" appears in the schedule preamble. Repeat with an English Academy and confirm both are absent / "seven (7)".
- **#4 Conditional removal:** toggle off includeFundraising; confirm "/fundraising" is gone from the generated doc.
- **#6 Filename:** check the saved file is `MCR_DSA_<shortName>_<YYYY-MM-DD>.docx` with sanitised short name.
- **#8 Mobile:** resize the browser to 380px width; walk the wizard; no horizontal scroll, no clipped controls.
- **#9 Keyboard nav:** Tab through every step; press Enter on Next; confirm `aria-invalid` / `FormMessage` text is announced on invalid Generate.

- [ ] **Step 5: Final commit (if anything needs adjusting)**

If the manual pass surfaces issues, fix them inline and commit. If everything passes, no final commit is required — the work is done.

---

## Self-review notes

- **Spec coverage:** All wizard steps, schemas, ports, defaults, generator pipeline, popover/dialog, homepage tile, and the 9 acceptance criteria each have at least one task. The post-render scan is covered by Task 7 and exercised by Tasks 7-8.
- **TDD discipline:** Tasks 2, 3, 5, 6, 7 are red-green TDD. Task 4 (defaults port) skips tests because it is pure data; Tasks 9-13 (UI) rely on type-check + manual verification because UI snapshot tests have low value here and per-step RHF/Zod assertions already cover validation. Task 8 adds the acceptance-criteria tests that don't fit cleanly into one earlier task.
- **Type consistency:** `RenderContext`, `Counterparty`, `Intake`, and the wizard `STEP_FIELDS` keys all reference the same property paths throughout.
- **Open question for execution:** if `Switch` and `RadioGroup` come out of `npx shadcn add` with class names that conflict with Tailwind v4 in this repo, treat the styling tweak as in-scope for Task 1 — the rest of the plan assumes they render correctly.
