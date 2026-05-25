# DSA Builder — MCR signatures — design

Add Sharon McIntyre's and Colin Adam's signatures (PNG) to generated
DSAs whenever the MCR signing block carries the default preset. Move
the existing publicly-served signature files out of `public/` so they
are no longer downloadable by anyone who guesses the URL.

The MCR logo is already baked into the master template (PR #17). This
spec covers the per-DSA variable images that the bake-logo script's
header comment deferred to "PR B".

## Trigger

Auto-detected by exact name match against `MCR_SIGNER_PRESET`:

- If `intake.mcr.signatoryName === "Sharon McIntyre"` **and**
  `intake.mcr.witnessName === "Colin Adam"`, both signatures are inserted.
- Any edit to either name → no signatures inserted; the document renders
  with blank signature lines (the existing `[insert]` flow).

The match is performed authoritatively on the server. The client may
suggest, but cannot force, a signed output.

No new UI: the existing wizard "Reset to defaults" + name fields are the
sole user-facing control.

## Storage

Signatures live in a new private Supabase Storage bucket:

```
dsa-signatures/
  mcr/
    sharon-mcintyre.png
    colin-adam.png
```

- Bucket created via migration; `public = false`.
- No RLS read policy for `anon` or `authenticated` roles. Only the
  service role (used server-side) can read.
- Filenames match the canonical preset names with spaces → hyphens and
  lowercase, so the lookup is mechanical from `MCR_SIGNER_PRESET`.
- Manual one-time upload via the Supabase dashboard. Replacing a
  signature in future is a dashboard re-upload — no code change.

The existing files at `public/dsa-builder/images/colin.png` and
`Sharon.png` are deleted in this PR. (The MCR logo at `mcr-logo.png`
and `reciept.webp` are left alone — only the two signatures move.)

## Template edits

Two new placeholders are added **manually in Word** to
`public/MCR_DSA_Master_Template.docx`:

- `{%mcrSignatoryImage}` — on its own line directly above the printed
  signatory name line in the MCR signing block.
- `{%mcrWitnessImage}` — same, in the MCR witness block.

The `%` prefix is the docxtemplater image-module convention. When the
value supplied for that tag is `null`/`undefined` the module collapses
the run to nothing, leaving a blank line above the printed name —
matching today's appearance for unsigned drafts.

After adding the tags in Word, re-run
`node scripts/dsa-builder/bake-logo-into-template.cjs` so the logo
stays baked in (the script is idempotent).

## Architecture

Rendering moves from the browser to a server action.

### Server action

`src/app/(dashboard)/dsa-builder/actions.ts` (new, `"use server"`):

```ts
export async function generateDsa(intake: Intake): Promise<{
  filename: string;
  bytes: Uint8Array;
}>
```

Pipeline:

1. **Auth** — `createClient()` from `@/lib/supabase/server`, call
   `getUser()`. If no user, throw — matches the existing dashboard
   route guard.
2. **Re-validate** intake with `IntakeSchema.parse` (do not trust the
   client to have validated).
3. **Decide images** — call `signaturesForPreset(intake.mcr)` (see
   library section). Returns `{ signatoryImage?, witnessImage? }`.
4. **Render** — call `renderToBuffer(template, buildContext(intake),
   { signatoryImage, witnessImage })`. The template is read from
   `public/MCR_DSA_Master_Template.docx` via `fs.readFile` (Node
   runtime, server side — no `fetch` round-trip needed).
5. **Return** `{ filename: buildFilename(...), bytes }`.

The action runs on Node.js runtime (Vercel default since the
knowledge-update note above — Fluid Compute, full Node).

### Client

`wizard.tsx` swaps its inline `generateAndDownload(intake)` for:

```ts
const res = await generateDsa(form.getValues());
saveAs(
  new Blob([res.bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }),
  res.filename,
);
```

Error toasts unchanged. The `useState` step index, RHF form, and
review panel are all unchanged.

### Library

`src/lib/dsa-builder/render.ts`:

```ts
export interface RenderImages {
  signatoryImage?: Uint8Array;
  witnessImage?: Uint8Array;
}

export function renderToBuffer(
  template: ArrayBuffer | Buffer | Uint8Array,
  context: RenderContext,
  images?: RenderImages,
): Uint8Array;
```

The `ImageModule` is **always** configured, because the template
carries `{%mcrSignatoryImage}` / `{%mcrWitnessImage}` placeholders
that docxtemplater can't resolve without the module. `renderToBuffer`
merges `images.signatoryImage` / `images.witnessImage` into the
context dict under the keys `mcrSignatoryImage` / `mcrWitnessImage`
immediately before calling `doc.render`. When a key is null the image
module returns `null` from `getImage` and the placeholder collapses
to nothing.

`getSize` uses per-tag dimensions to preserve each signature's
natural aspect ratio:

- Sharon (1954×805, ≈2.43:1) → 200×82 px
- Colin (1716×826, ≈2.08:1) → 200×96 px

`renderToBuffer` stays pure — no network, no fs. It accepts buffers
and returns buffers, so tests pass fixture PNGs directly.

`src/lib/dsa-builder/signatures.ts` (new):

```ts
import { MCR_SIGNER_PRESET } from "./defaults";

export async function signaturesForPreset(
  mcr: Intake["mcr"],
): Promise<RenderImages> {
  if (
    mcr.signatoryName !== MCR_SIGNER_PRESET.signatoryName ||
    mcr.witnessName !== MCR_SIGNER_PRESET.witnessName
  ) {
    return {};
  }
  const supabase = serviceClient();
  const [sig, wit] = await Promise.all([
    download("mcr/sharon-mcintyre.png"),
    download("mcr/colin-adam.png"),
  ]);
  return { signatoryImage: sig, witnessImage: wit };
}
```

Where `download(path)` calls
`supabase.storage.from("dsa-signatures").download(path)` and
returns the bytes as `Uint8Array`. A bucket-fetch failure throws —
this is a server bug, not a user error, and surfaces as the existing
error-toast path.

The existing browser orchestrator `generateAndDownload` in
`render.ts` is removed. It has only one caller (`wizard.tsx`), and
that caller switches to the server action.

`src/lib/dsa-builder/build-context.ts` does not change.
`buildContext` stays a pure function over the intake, returning a
text-only `RenderContext`. `renderToBuffer` merges the optional
image buffers into the docxtemplater context dict at the call site —
the image keys never appear on the `RenderContext` type.

## Migration

`supabase/migrations/<ts>_dsa_signatures_bucket.sql`:

```sql
insert into storage.buckets (id, name, public)
values ('dsa-signatures', 'dsa-signatures', false)
on conflict (id) do nothing;
```

No RLS policies are added. The default policy on `storage.objects`
denies anonymous and authenticated reads on private buckets — only
the service role can read, which is what the server action uses.

## Tests

- `render.test.ts` adds:
  - **with signatures** — passes fixture buffers for both images and
    asserts the rendered ZIP contains `word/media/image*.png` entries
    (count increased by 2 relative to the pre-image render).
  - **no signatures, no stray tokens** — renders with both images
    `undefined` and confirms the post-render scan accepts the
    template (the image module is expected to consume the
    `{%...}` placeholders even when their value is null).
- `signatures.test.ts` (new) — tests `signaturesForPreset`:
  - matching preset → both buffers returned;
  - edited signatory → returns `{}`;
  - edited witness → returns `{}`;
  - both edited → returns `{}`.
  Bucket download is mocked through dependency injection (a
  `download` arg with a default of the real Supabase call).
- A small fixture PNG is added at
  `src/lib/dsa-builder/fixtures/signature-fixture.png` — tiny,
  ~1 KB, used by tests only. The real signatures stay in the bucket.
- The server action gets a single integration test using the same
  dependency-injection seam: pass a fake `loadImages` argument so the
  test does not touch Supabase.
- Existing fixture-parity tests still pass without regenerating the
  reference `.docx` files. The new `{%...}` placeholders collapse to
  empty paragraphs when no images are supplied, and the test's
  `normaliseWhitespace` step (`replace(/\s+/g, " ")`) folds any
  extra blank lines back into single spaces.

## Validation & guardrails

- The server action re-runs `IntakeSchema.parse` so a tampered
  client payload cannot bypass the Scotland-LA hard-block or the
  required-fields check.
- Bucket name and object paths are constants, not user-supplied —
  no path traversal surface.
- The service-role key is already in the environment (`html-host`
  uses it). The new bucket is read with the same key; nothing new
  to manage.
- The auth gate is the existing dashboard guard — the action just
  re-checks `getUser()` so a leaked action endpoint can't be called
  unauthenticated.

## Acceptance criteria

1. **Preset match → signed.** Generating with the default MCR fields
   (Sharon signatory, Colin witness) produces a `.docx` containing
   exactly two new images in `word/media/` beyond the baked logo.
2. **Edited signatory → unsigned.** Changing `signatoryName` to
   anything other than "Sharon McIntyre" produces a `.docx` with the
   same media count as today's output. Same for `witnessName`.
3. **Public delete.** `public/dsa-builder/images/colin.png` and
   `Sharon.png` are removed from the repo. No other files in
   `public/` are affected.
4. **Auth required.** Calling `generateDsa` without a session
   throws. The wizard's UX is unchanged for logged-in users.
5. **Validation re-run.** A tampered intake (e.g., Scotland + Academy)
   submitted directly to the server action rejects with the Zod
   refinement message.
6. **No infra leakage.** Service-role key is not exposed to the
   client. Network panel during generate shows only the server-action
   call and the eventual `.docx` download from `file-saver`.
7. **Tests green.** `npm run test:run` passes, including the new
   signatures suite and the regenerated-fixture parity tests.
8. **Type-safe.** `npx tsc --noEmit` and `npm run lint` pass.

## Items NOT to change without confirmation

- Clause text, schedule structure, defined terms in the master
  template. The image placeholders are additions, not replacements.
- The Scotland-LA hard-block.
- The `MCR_SIGNER_PRESET` and `MCR_DEFAULTS` constants in
  `src/lib/dsa-builder/defaults.ts` — these are the canonical names
  the match relies on.
- The bake-logo script.

## Out of scope

- Other MCR signers. Today only Sharon + Colin are supported. Adding
  more would mean expanding the preset and uploading new PNGs.
- Signature on the counterparty side — counterparties always sign by
  hand.
- Replacing the baked logo with image-module injection. The logo
  stays static.
- Audit log of generated signed copies. If you want a
  `dsa_generations` table later, that's a separate feature.
