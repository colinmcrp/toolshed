#!/usr/bin/env -S npx tsx
// Re-generates the three reference .docx fixtures used by render.test.ts so
// the byte-stable parity assertions reflect the current templates + context
// builder. Run after any change to:
//   - public/MCR_DSA_Master_Template.docx
//   - public/MCR_DSA_Charity_Master_Template.docx
//   - src/lib/dsa-builder/build-context.ts
//   - src/lib/dsa-builder/defaults.ts
//
//   npx tsx scripts/dsa-builder/regen-fixtures.ts
//
// Unlike the one-off bootstrap-charity-fixture.cjs, this script imports the
// real `buildContext` + `renderToBuffer` so the fixture is always in lockstep
// with the production rendering path (no duplicated context logic to drift).

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildContext } from "../../src/lib/dsa-builder/build-context";
import { renderToBuffer } from "../../src/lib/dsa-builder/render";
import { type Intake } from "../../src/lib/dsa-builder/schema";

const ROOT = resolve(__dirname, "..", "..");
const PUBLIC = resolve(ROOT, "public");
const FIXTURES = resolve(ROOT, "src", "lib", "dsa-builder", "fixtures");

const LA_TEMPLATE = readFileSync(
  resolve(PUBLIC, "MCR_DSA_Master_Template.docx"),
);
const CHARITY_TEMPLATE = readFileSync(
  resolve(PUBLIC, "MCR_DSA_Charity_Master_Template.docx"),
);

const JOBS: Array<{ intake: string; out: string; template: Buffer }> = [
  {
    intake: "sample-scotland.json",
    out: "sample-scotland.generated.docx",
    template: LA_TEMPLATE,
  },
  {
    intake: "sample-england-academy.json",
    out: "sample-england-academy.generated.docx",
    template: LA_TEMPLATE,
  },
  {
    intake: "sample-charity-centrestage.json",
    out: "sample-charity-centrestage.generated.docx",
    template: CHARITY_TEMPLATE,
  },
];

function loadIntake(file: string): Intake {
  // Matches render.test.ts: cast directly without IntakeSchema.parse — the
  // fixtures intentionally use "[insert school contact]" style placeholders
  // that the strict refine rejects but the renderer accepts.
  const raw = JSON.parse(readFileSync(resolve(FIXTURES, file), "utf8"));
  delete raw._comment;
  return raw as Intake;
}

for (const job of JOBS) {
  const intake = loadIntake(job.intake);
  const bytes = renderToBuffer(job.template, buildContext(intake));
  const outPath = resolve(FIXTURES, job.out);
  writeFileSync(outPath, bytes);
  console.log(`wrote ${job.out} (${bytes.length} bytes)`);
}
