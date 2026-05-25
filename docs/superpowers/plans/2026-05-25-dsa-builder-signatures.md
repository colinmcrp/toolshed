# DSA Builder MCR Signatures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert Sharon McIntyre's signature and Colin Adam's signature into generated DSAs whenever the MCR signing block matches the default preset, while removing the two PNGs from `public/` so they are no longer publicly downloadable.

**Architecture:** Storage moves from `public/` to a private Supabase Storage bucket (`dsa-signatures`). Document rendering moves from the browser to a Node-runtime server action that authenticates the caller, re-validates the intake, fetches the PNGs via the service-role client when the MCR signer names match `MCR_SIGNER_PRESET`, and renders the docx with `docxtemplater-image-module-free`. The template gains two new image placeholders wrapped in conditional sections so the placeholder paragraph is removed cleanly when no signature is supplied.

**Tech Stack:** Next.js 16 App Router (server actions, Node runtime), TypeScript, docxtemplater 3.x, docxtemplater-image-module-free, pizzip, Supabase Storage (private bucket), Supabase SSR (auth), Vitest.

**Spec:** `docs/superpowers/specs/2026-05-25-dsa-builder-signatures-design.md`.

---

## File map

**New files:**

| Path | Responsibility |
|---|---|
| `supabase/migrations/20260525000000_dsa_signatures_bucket.sql` | Create the private `dsa-signatures` bucket. |
| `src/lib/dsa-builder/signatures.ts` | `signaturesForPreset(mcr, deps?)` — decides whether to load images and returns them. |
| `src/lib/dsa-builder/signatures.test.ts` | Unit test for the preset-match logic with a fake downloader. |
| `src/lib/dsa-builder/fixtures/signature-fixture.png` | Tiny PNG used by render tests only. |
| `src/app/(dashboard)/dsa-builder/actions.ts` | `"use server"` action `generateDsa(intake)` — auth → validate → signatures → render → return bytes. |

**Modified files:**

| Path | Reason |
|---|---|
| `public/MCR_DSA_Master_Template.docx` | Two new image placeholders wrapped in conditional sections. **Edited manually in Word** (Task 1, step 1). |
| `package.json`, `package-lock.json` | Add `docxtemplater-image-module-free`. |
| `src/lib/dsa-builder/render.ts` | `renderToBuffer` accepts optional images, always configures the image module, merges the four image-related keys into the context. `generateAndDownload` removed. |
| `src/lib/dsa-builder/render.test.ts` | Add tests for the signed and unsigned paths. |
| `src/app/(dashboard)/dsa-builder/wizard.tsx` | Replace inline `generateAndDownload(data)` with a call to the new server action plus client-side `saveAs`. |

**Deleted files:**

- `public/dsa-builder/images/colin.png`
- `public/dsa-builder/images/Sharon.png`

(`mcr-logo.png` and `reciept.webp` in the same directory are left alone.)

---

## Task 1: Edit the template and install the image module

**Files:**
- Modify: `public/MCR_DSA_Master_Template.docx` (manual, in Word)
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Add the two image placeholders to the master template**

The implementer (the human running the plan) opens `public/MCR_DSA_Master_Template.docx` in Word and:

1. Finds the MCR signing block (the block containing `{mcr.signatoryName}` and `{mcr.signatoryPosition}`).
2. Adds a new empty paragraph **above** the line that currently shows the signatory's printed name, and types exactly (one line, no Word autocorrect quotes, no smart formatting):
   ```
   {#mcrHasSignatory}{%mcrSignatoryImage}{/mcrHasSignatory}
   ```
3. Repeats in the MCR witness block (the one with `{mcr.witnessName}`):
   ```
   {#mcrHasWitness}{%mcrWitnessImage}{/mcrHasWitness}
   ```
4. Saves and closes Word.

If Word converts `{` or `}` to smart braces, type the placeholders in another editor and paste, then Cmd-Z the autocorrect.

After saving, run:

```bash
node scripts/dsa-builder/bake-logo-into-template.cjs
```

Expected output: `logo already baked into template — nothing to do` (the script is idempotent and the logo is already inside).

- [ ] **Step 2: Verify the placeholders made it in**

Run:

```bash
unzip -p public/MCR_DSA_Master_Template.docx word/document.xml | grep -oE '\{[#%/]?mcr[A-Za-z]+\}' | sort -u
```

Expected output (order may differ):

```
{#mcrHasSignatory}
{#mcrHasWitness}
{%mcrSignatoryImage}
{%mcrWitnessImage}
{/mcrHasSignatory}
{/mcrHasWitness}
```

If any of the six tokens is missing, re-open in Word and retry Step 1 — likely smart-quote conversion broke a brace.

- [ ] **Step 3: Install the image module**

Run from repo root:

```bash
npm install docxtemplater-image-module-free
```

Expected: package added, no peer-dep warnings against docxtemplater 3.68.7.

- [ ] **Step 4: Type-check stays clean**

Run:

```bash
npx tsc --noEmit && npm run lint
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add public/MCR_DSA_Master_Template.docx package.json package-lock.json
git commit -m "DSA builder: add MCR signature image placeholders to template"
```

---

## Task 2: Render pipeline accepts optional signature images

**Files:**
- Modify: `src/lib/dsa-builder/render.ts`
- Modify: `src/lib/dsa-builder/render.test.ts`
- Create: `src/lib/dsa-builder/fixtures/signature-fixture.png`

- [ ] **Step 1: Add a tiny fixture PNG**

A 4×4 transparent PNG is sufficient — the render test only cares that bytes get embedded, not what they look like.

Run from repo root:

```bash
node -e '
const { writeFileSync } = require("node:fs");
// 4x4 fully-transparent PNG (smallest valid RGBA PNG).
const b64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR42mNk+M9Q" +
  "z0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC";
writeFileSync(
  "src/lib/dsa-builder/fixtures/signature-fixture.png",
  Buffer.from(b64, "base64"),
);
console.log("wrote signature-fixture.png");
'
```

Expected: prints `wrote signature-fixture.png`. Then:

```bash
file src/lib/dsa-builder/fixtures/signature-fixture.png
```

Expected: `PNG image data, 4 x 4, 8-bit/color RGBA, non-interlaced`.

- [ ] **Step 2: Write the failing tests**

Append to `src/lib/dsa-builder/render.test.ts` (after the existing `describe` blocks):

```ts
describe("renderToBuffer — signatures", () => {
  const FIXTURE_PNG = readFileSync(
    resolve(FIXTURE_DIR, "signature-fixture.png"),
  );

  function countMediaImages(bytes: Uint8Array): number {
    const zip = new PizZip(bytes);
    return Object.keys(zip.files).filter((name) =>
      /^word\/media\/.+\.(png|jpg|jpeg|gif)$/i.test(name),
    ).length;
  }

  it("inserts both images into word/media/ when both buffers are supplied", () => {
    const intake = loadIntake("sample-scotland.json");
    const baseline = renderToBuffer(TEMPLATE, buildContext(intake));
    const signed = renderToBuffer(TEMPLATE, buildContext(intake), {
      signatoryImage: FIXTURE_PNG,
      witnessImage: FIXTURE_PNG,
    });
    expect(countMediaImages(signed)).toBe(countMediaImages(baseline) + 2);
  });

  it("inserts no extra images when both buffers are absent", () => {
    const intake = loadIntake("sample-scotland.json");
    const baseline = renderToBuffer(TEMPLATE, buildContext(intake));
    const unsigned = renderToBuffer(TEMPLATE, buildContext(intake), {});
    expect(countMediaImages(unsigned)).toBe(countMediaImages(baseline));
  });

  it("rejects stray image tokens after rendering unsigned", () => {
    const intake = loadIntake("sample-scotland.json");
    const bytes = renderToBuffer(TEMPLATE, buildContext(intake), {});
    const text = extractDocxText(bytes);
    expect(text).not.toMatch(/\{%mcr/);
    expect(text).not.toMatch(/\{#mcrHas/);
    expect(text).not.toMatch(/\{\/mcrHas/);
  });
});
```

You'll also need `PizZip` imported at the top of the test file. Add this import alongside the existing imports:

```ts
import PizZip from "pizzip";
```

- [ ] **Step 3: Run and confirm the tests fail**

Run:

```bash
npx vitest run src/lib/dsa-builder/render.test.ts
```

Expected: the three new tests fail. The first two fail because `renderToBuffer` doesn't accept a third argument yet; the third may fail or pass depending on parser behaviour — both are fine. The existing parity tests should still pass (the new template placeholders collapse to whitespace in the unsigned path and are folded by `normaliseWhitespace`).

If the existing parity tests now **fail**, the template edits in Task 1 are wrong or the conditional-section paragraph is leaving extra content. Re-check the template tokens with the grep from Task 1, Step 2.

- [ ] **Step 4: Replace `src/lib/dsa-builder/render.ts` with the image-module-aware version**

Replace the file's contents with:

```ts
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import ImageModule from "docxtemplater-image-module-free";
import type { RenderContext } from "./build-context";
import { dottedParser } from "./dotted-parser";

// Includes `%` so an unsubstituted image-module tag (e.g. {%mcrSignatoryImage})
// is caught by the post-render scan, not silently shipped.
const STRAY_TOKEN_RE = /\{[#^/%]?[A-Za-z][\w.]*\}/g;

// XML parts inside a .docx that docxtemplater substitutes into. Scanning
// only document.xml would miss broken tokens in headers, footers,
// footnotes, endnotes, or comments — none of which are templated today,
// but a future template edit could put one there and we want to catch it.
const SCANNED_PART_RE = /^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/;

function assertCleanRender(zip: PizZip): void {
  const partNames = Object.keys(zip.files).filter((name) =>
    SCANNED_PART_RE.test(name),
  );
  for (const name of partNames) {
    const xml = zip.file(name)?.asText() ?? "";
    const stray = xml.match(STRAY_TOKEN_RE);
    if (stray && stray.length > 0) {
      const unique = [...new Set(stray)];
      throw new Error(
        `DSA render produced unsubstituted tokens in ${name}: ${unique.join(", ")}`,
      );
    }
    if (xml.includes("undefined")) {
      throw new Error(
        `DSA render produced literal 'undefined' in ${name} — a nested placeholder did not resolve.`,
      );
    }
  }
}

export interface RenderImages {
  signatoryImage?: Uint8Array;
  witnessImage?: Uint8Array;
}

const SIGNATURE_SIZES: Record<string, [number, number]> = {
  // Width-locked at 200 px; height tuned per signature's natural aspect.
  mcrSignatoryImage: [200, 82], // Sharon (1954x805, ~2.43:1)
  mcrWitnessImage: [200, 96],   // Colin (1716x826, ~2.08:1)
};

// Pure renderer — no network or fs I/O. Safe to call in tests.
export function renderToBuffer(
  template: ArrayBuffer | Buffer | Uint8Array,
  context: RenderContext,
  images: RenderImages = {},
): Uint8Array {
  const zip = new PizZip(template);
  const imageModule = new ImageModule({
    centered: false,
    getImage(tagValue: unknown): Uint8Array {
      // The conditional {#mcrHasSignatory} guard means getImage is only
      // called when an image is present. If not, treat it as a bug.
      if (!(tagValue instanceof Uint8Array) && !Buffer.isBuffer(tagValue)) {
        throw new Error(
          "DSA image module asked for an image with no buffer in context — " +
            "the conditional section guard should have prevented this.",
        );
      }
      return tagValue as Uint8Array;
    },
    getSize(_img: Uint8Array, _tagValue: unknown, tagName: string): [number, number] {
      const size = SIGNATURE_SIZES[tagName];
      if (!size) {
        throw new Error(`No signature size registered for tag ${tagName}`);
      }
      return size;
    },
  });

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
    parser: dottedParser,
    modules: [imageModule],
  });

  doc.render({
    ...context,
    mcrHasSignatory: !!images.signatoryImage,
    mcrHasWitness: !!images.witnessImage,
    mcrSignatoryImage: images.signatoryImage,
    mcrWitnessImage: images.witnessImage,
  });

  assertCleanRender(doc.getZip());
  return doc.getZip().generate({ type: "uint8array", compression: "DEFLATE" });
}
```

Notes:
- The browser orchestrator `generateAndDownload` is **gone** — the only caller (`wizard.tsx`) moves to the server action in Task 5.
- `buildContext` and `Intake` are no longer imported here (they were only needed by `generateAndDownload`).

- [ ] **Step 5: Run the tests and confirm they pass**

Run:

```bash
npx vitest run src/lib/dsa-builder/render.test.ts
```

Expected: all tests pass — both the existing parity / conditional-content tests and the three new signature tests.

If the "no extra images" test fails because `countMediaImages` returned more than baseline for the unsigned path, the image module is being invoked when `mcrHasSignatory` is false — the conditional-section guard isn't taking effect. Re-check that the template uses `{#mcrHasSignatory}{%mcrSignatoryImage}{/mcrHasSignatory}` on the same paragraph, not split across paragraphs.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dsa-builder/render.ts src/lib/dsa-builder/render.test.ts src/lib/dsa-builder/fixtures/signature-fixture.png
git commit -m "DSA builder: render pipeline supports optional MCR signature images"
```

---

## Task 3: `signaturesForPreset` helper

**Files:**
- Create: `src/lib/dsa-builder/signatures.ts`
- Create: `src/lib/dsa-builder/signatures.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/dsa-builder/signatures.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { signaturesForPreset } from "./signatures";
import { MCR_SIGNER_PRESET } from "./defaults";

const PRESET_MCR = {
  signatoryName: MCR_SIGNER_PRESET.signatoryName,
  signatoryPosition: MCR_SIGNER_PRESET.signatoryPosition,
  signatoryDate: "2026-05-25",
  witnessName: MCR_SIGNER_PRESET.witnessName,
  witnessPosition: MCR_SIGNER_PRESET.witnessPosition,
  witnessDate: "2026-05-25",
};

const SIG_BYTES = new Uint8Array([1, 2, 3]);
const WIT_BYTES = new Uint8Array([4, 5, 6]);

function makeDownloader() {
  return vi.fn(async (path: string) => {
    if (path === "mcr/sharon-mcintyre.png") return SIG_BYTES;
    if (path === "mcr/colin-adam.png") return WIT_BYTES;
    throw new Error(`Unexpected download path: ${path}`);
  });
}

describe("signaturesForPreset", () => {
  it("returns both buffers when names match the preset exactly", async () => {
    const download = makeDownloader();
    const result = await signaturesForPreset(PRESET_MCR, { download });
    expect(result).toEqual({
      signatoryImage: SIG_BYTES,
      witnessImage: WIT_BYTES,
    });
    expect(download).toHaveBeenCalledTimes(2);
  });

  it("returns {} when signatoryName is edited", async () => {
    const download = makeDownloader();
    const result = await signaturesForPreset(
      { ...PRESET_MCR, signatoryName: "Someone Else" },
      { download },
    );
    expect(result).toEqual({});
    expect(download).not.toHaveBeenCalled();
  });

  it("returns {} when witnessName is edited", async () => {
    const download = makeDownloader();
    const result = await signaturesForPreset(
      { ...PRESET_MCR, witnessName: "Someone Else" },
      { download },
    );
    expect(result).toEqual({});
    expect(download).not.toHaveBeenCalled();
  });

  it("returns {} when both names are edited", async () => {
    const download = makeDownloader();
    const result = await signaturesForPreset(
      { ...PRESET_MCR, signatoryName: "A", witnessName: "B" },
      { download },
    );
    expect(result).toEqual({});
    expect(download).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run:

```bash
npx vitest run src/lib/dsa-builder/signatures.test.ts
```

Expected: fails with `Cannot find module './signatures'`.

- [ ] **Step 3: Implement**

Create `src/lib/dsa-builder/signatures.ts`:

```ts
import { createServiceClient } from "@/lib/supabase/service";
import { MCR_SIGNER_PRESET } from "./defaults";
import type { Mcr } from "./schema";
import type { RenderImages } from "./render";

const BUCKET = "dsa-signatures";
const SIGNATORY_PATH = "mcr/sharon-mcintyre.png";
const WITNESS_PATH = "mcr/colin-adam.png";

export interface SignaturesDeps {
  download: (path: string) => Promise<Uint8Array>;
}

async function defaultDownload(path: string): Promise<Uint8Array> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    throw new Error(
      `Failed to load signature ${path}: ${error?.message ?? "no data"}`,
    );
  }
  return new Uint8Array(await data.arrayBuffer());
}

export async function signaturesForPreset(
  mcr: Mcr,
  deps: SignaturesDeps = { download: defaultDownload },
): Promise<RenderImages> {
  if (
    mcr.signatoryName !== MCR_SIGNER_PRESET.signatoryName ||
    mcr.witnessName !== MCR_SIGNER_PRESET.witnessName
  ) {
    return {};
  }
  const [signatoryImage, witnessImage] = await Promise.all([
    deps.download(SIGNATORY_PATH),
    deps.download(WITNESS_PATH),
  ]);
  return { signatoryImage, witnessImage };
}
```

- [ ] **Step 4: Run and confirm it passes**

Run:

```bash
npx vitest run src/lib/dsa-builder/signatures.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsa-builder/signatures.ts src/lib/dsa-builder/signatures.test.ts
git commit -m "DSA builder: signaturesForPreset gates by exact preset match"
```

---

## Task 4: Migration for the private signatures bucket

**Files:**
- Create: `supabase/migrations/20260525000000_dsa_signatures_bucket.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260525000000_dsa_signatures_bucket.sql`:

```sql
-- Private storage bucket for MCR signatures used by the DSA builder.
-- No RLS read policy is added — only the service-role client can read,
-- which is what src/lib/dsa-builder/signatures.ts uses.
insert into storage.buckets (id, name, public)
values ('dsa-signatures', 'dsa-signatures', false)
on conflict (id) do nothing;
```

- [ ] **Step 2: Sanity-check the SQL**

Run:

```bash
ls supabase/migrations/20260525000000_dsa_signatures_bucket.sql
```

Expected: the file exists. If the local repo has a Supabase CLI installed with the local stack running, also run:

```bash
npx supabase db reset
```

to confirm the migration applies cleanly. If the CLI / local stack is not available, skip this — the migration will be applied on next deploy.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260525000000_dsa_signatures_bucket.sql
git commit -m "DSA builder: add private dsa-signatures storage bucket"
```

---

## Task 5: Server action and wizard integration

**Files:**
- Create: `src/app/(dashboard)/dsa-builder/actions.ts`
- Modify: `src/app/(dashboard)/dsa-builder/wizard.tsx`

- [ ] **Step 1: Implement the server action**

Create `src/app/(dashboard)/dsa-builder/actions.ts`:

```ts
"use server";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getUser } from "@/lib/supabase/server";
import { buildContext } from "@/lib/dsa-builder/build-context";
import { buildFilename } from "@/lib/dsa-builder/filename";
import { renderToBuffer } from "@/lib/dsa-builder/render";
import { IntakeSchema, type Intake } from "@/lib/dsa-builder/schema";
import { signaturesForPreset } from "@/lib/dsa-builder/signatures";

export interface GeneratedDsa {
  filename: string;
  bytes: Uint8Array;
}

export async function generateDsa(rawIntake: unknown): Promise<GeneratedDsa> {
  const user = await getUser();
  if (!user) {
    throw new Error("Not signed in");
  }

  const intake: Intake = IntakeSchema.parse(rawIntake);

  const templatePath = resolve(
    process.cwd(),
    "public",
    "MCR_DSA_Master_Template.docx",
  );
  const template = await readFile(templatePath);

  const images = await signaturesForPreset(intake.mcr);
  const bytes = renderToBuffer(template, buildContext(intake), images);

  return {
    filename: buildFilename(intake.counterparty.shortName),
    bytes,
  };
}
```

- [ ] **Step 2: Wire the wizard to the server action**

In `src/app/(dashboard)/dsa-builder/wizard.tsx`:

Replace the import:

```ts
import { generateAndDownload } from "@/lib/dsa-builder/render";
```

with:

```ts
import { saveAs } from "file-saver";
import { generateDsa } from "./actions";
```

Replace the `onSubmit` body. The current handler is:

```ts
const onSubmit = form.handleSubmit(async (data) => {
  try {
    await generateAndDownload(data);
    toast.success("DSA generated", {
      action: {
        label: "Generate another",
        onClick: () => {
          form.reset(buildDefaultValues());
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
```

Replace with:

```ts
const onSubmit = form.handleSubmit(async (data) => {
  try {
    const { filename, bytes } = await generateDsa(data);
    saveAs(
      new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      filename,
    );
    toast.success("DSA generated", {
      action: {
        label: "Generate another",
        onClick: () => {
          form.reset(buildDefaultValues());
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
```

- [ ] **Step 3: Type-check and lint**

Run:

```bash
npx tsc --noEmit && npm run lint
```

Expected: both pass.

If TypeScript complains about `Blob` constructor and `Uint8Array` (a known DOM-types nuance), wrap the bytes in an array literal explicitly typed as `BlobPart[]`:

```ts
new Blob([bytes as BlobPart], { ... });
```

(matches the cast used in the deleted `generateAndDownload`.)

- [ ] **Step 4: Manual smoke test (dev server)**

This step requires the user; if running headless, skip and report.

```bash
npm run dev
```

Then in a browser at `http://localhost:3000/dsa-builder`:

1. Fill the wizard with any valid intake — leave the MCR step pre-filled (Sharon / Colin).
2. Click Generate DSA. Confirm a `.docx` downloads.
3. Open it in Word. Confirm two new images appear above the printed MCR signatory and witness names.
4. Re-run, but edit the MCR signatory name to anything else. Confirm the resulting `.docx` has no signature above the signatory line, but still has Colin's signature (because only the signatory was edited). Then edit the witness name back to "Colin Adam" and the signatory back to "Sharon McIntyre" and confirm both signatures return.

The actual signature PNGs in the bucket are needed for this — see Task 7 if they aren't uploaded yet. Until then, expect a server-side error toast.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dsa-builder/actions.ts src/app/\(dashboard\)/dsa-builder/wizard.tsx
git commit -m "DSA builder: render via server action with MCR signature injection"
```

---

## Task 6: Remove the public signature PNGs

**Files:**
- Delete: `public/dsa-builder/images/colin.png`
- Delete: `public/dsa-builder/images/Sharon.png`

- [ ] **Step 1: Confirm no code references either path**

Run:

```bash
grep -rn -E "images/(colin|Sharon)\.png" src/ public/ docs/ scripts/ 2>/dev/null || echo "no references"
```

Expected: `no references`. If anything turns up, fix it first — they should have been migrated by earlier tasks.

- [ ] **Step 2: Delete the files**

```bash
git rm public/dsa-builder/images/colin.png public/dsa-builder/images/Sharon.png
```

- [ ] **Step 3: Commit**

```bash
git commit -m "DSA builder: remove publicly-served MCR signature PNGs"
```

---

## Task 7: Upload signatures to the bucket (manual)

**This task does not produce code or a commit — it is a deployment step the implementer must do once, after Tasks 1–6 are merged, before users hit the new flow.**

- [ ] **Step 1: Apply the migration to the target environment**

Production: the next deploy that includes the migration in Task 4 will create the bucket automatically. For a local Supabase stack, the bucket exists after `npx supabase db reset`.

- [ ] **Step 2: Upload the two PNGs**

Source files (the originals deleted in Task 6) are also in the implementer's local backup or in the previous git history. Recover them and re-upload to the new bucket:

1. Open Supabase Studio for the project. Storage → buckets → `dsa-signatures`.
2. Create folder `mcr/` if not auto-created.
3. Upload Sharon's PNG as `mcr/sharon-mcintyre.png`.
4. Upload Colin's PNG as `mcr/colin-adam.png`.

(If the originals are lost: `git show HEAD~N:public/dsa-builder/images/Sharon.png > /tmp/Sharon.png` where `N` is the depth back to before Task 6.)

- [ ] **Step 3: Confirm with a generate**

Open the dashboard `/dsa-builder` route, leave the MCR preset in place, generate, and open the resulting `.docx` — both signatures should appear.

---

## Final verification

After Tasks 1–7 are complete:

- [ ] **All tests pass**

```bash
npm run test:run
```

- [ ] **No lint or type errors**

```bash
npx tsc --noEmit && npm run lint
```

- [ ] **Network panel sanity-check**

In Chrome devtools → Network, generate a DSA. The request to the server action (POST to `/dsa-builder` or `/_actions/...` depending on Next's encoding) appears; the response carries the `.docx` bytes. No request to `/dsa-builder/images/colin.png` or `Sharon.png` appears (those URLs now 404).

- [ ] **Acceptance criteria check (from the spec)**

1. Preset match → signed: ✓ verified in Task 5, Step 4.
2. Edited signatory → unsigned: ✓ verified in Task 5, Step 4.
3. Public delete: ✓ Task 6.
4. Auth required: implicit (server action calls `getUser()` and throws if absent).
5. Validation re-run: implicit (server action calls `IntakeSchema.parse`).
6. No infra leakage: ✓ verified in network-panel check.
7. Tests green: ✓ above.
8. Type-safe: ✓ above.
