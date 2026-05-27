#!/usr/bin/env -S npx tsx
// Renders the Centrestage charity fixture with Sharon's and Colin's
// signatures baked in, then opens the output. Calls the real buildContext +
// renderToBuffer so any new context fields (jurisdiction tokens, future
// additions) flow through automatically — no hand-rolled mirror to drift.
//
//   npx tsx scripts/dsa-builder/preview-signed-charity.ts

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildContext } from "../../src/lib/dsa-builder/build-context";
import { renderToBuffer } from "../../src/lib/dsa-builder/render";
import { MCR_SIGNER_PRESET } from "../../src/lib/dsa-builder/defaults";
import type { Intake } from "../../src/lib/dsa-builder/schema";

const ROOT = resolve(__dirname, "..", "..");
const TEMPLATE = readFileSync(
  resolve(ROOT, "public", "MCR_DSA_Charity_Master_Template.docx"),
);
const FIXTURE = resolve(
  ROOT,
  "src",
  "lib",
  "dsa-builder",
  "fixtures",
  "sample-charity-centrestage.json",
);
const SIGNATORY_PNG = resolve(
  ROOT,
  "private",
  "dsa-signatures",
  "sharon-mcintyre.png",
);
const WITNESS_PNG = resolve(
  ROOT,
  "private",
  "dsa-signatures",
  "colin-adam.png",
);
const OUTPUT = resolve(ROOT, "tmp-signed-charity-centrestage.docx");

const raw = JSON.parse(readFileSync(FIXTURE, "utf8"));
delete raw._comment;
const intake = raw as Intake;

// Force the MCR signer preset so the wizard's signaturesForPreset gate
// would trigger in the real flow.
intake.mcr = {
  ...intake.mcr,
  signatoryName: MCR_SIGNER_PRESET.signatoryName,
  signatoryPosition: MCR_SIGNER_PRESET.signatoryPosition,
  witnessName: MCR_SIGNER_PRESET.witnessName,
  witnessPosition: MCR_SIGNER_PRESET.witnessPosition,
};

const bytes = renderToBuffer(TEMPLATE, buildContext(intake), {
  signatoryImage: readFileSync(SIGNATORY_PNG),
  witnessImage: readFileSync(WITNESS_PNG),
});

writeFileSync(OUTPUT, bytes);
console.log(`Wrote ${OUTPUT} (${bytes.length} bytes)`);

execFileSync("open", ["-a", "Pages", OUTPUT]);
