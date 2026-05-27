#!/usr/bin/env node
// Bakes per-jurisdiction tokens into the two master templates so the
// governing-law clause, the Dispute Resolution mediator fallback, and (in
// the charity template) the Programme Consent capacity test are driven by
// the same `jurisdiction` flag that already drives the FOI act, statutory
// anchor, and year-group ranges.
//
// Token map (resolved in src/lib/dsa-builder/defaults.ts):
//   {governingLawCountry}      Scotland   |  England and Wales
//   {governingLawCourts}       Scottish Courts | Courts of England and Wales
//   {mediatorFallbackLaSchool} Scotland: "chosen by the Dean of the Royal
//                              Faculty of Procurators in Glasgow or the
//                              equivalent office holder in the local
//                              authority area"
//                              England:  "appointed by the Centre for
//                              Effective Dispute Resolution (CEDR) on the
//                              application of either Party"
//   {mediatorFallbackCharity}  Charity track has no LA-area tail; otherwise
//                              the same Scotland/England split.
//
// Programme Consent capacity test uses inline conditional sections rather
// than tokens because the Scotland and England phrasings differ enough
// (the English variant introduces "{counterparty.shortName}" and "common
// law test of Gillick competence") that a token-only swap would be uglier
// than the explicit {#isScotland}…{/isScotland}{#isEngland}…{/isEngland}
// branches.
//
// Idempotent — re-running is a no-op once the target tokens are present.
//
//   node scripts/dsa-builder/bake-jurisdiction-tokens.cjs

const PizZip = require("pizzip");
const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const REPO_ROOT = resolve(__dirname, "..", "..");

const LA_TEMPLATE = resolve(
  REPO_ROOT,
  "public",
  "MCR_DSA_Master_Template.docx",
);
const CHARITY_TEMPLATE = resolve(
  REPO_ROOT,
  "public",
  "MCR_DSA_Charity_Master_Template.docx",
);

// Each edit names the exact Scotland-hardcoded text to find and the
// replacement text. `idempotentMarker` is the substring that the
// replacement introduces — if the marker is already present and the
// original is absent, we skip the edit instead of throwing.
const LA_EDITS = [
  {
    name: "LA mediator fallback",
    find:
      "chosen by the Dean of the Royal Faculty of Procurators in Glasgow or the equivalent office holder in the local authority area",
    replace: "{mediatorFallbackLaSchool}",
    idempotentMarker: "{mediatorFallbackLaSchool}",
  },
  {
    name: "LA governing-law country",
    find: "the law of Scotland",
    replace: "the law of {governingLawCountry}",
    idempotentMarker: "{governingLawCountry}",
  },
  {
    name: "LA governing-law courts",
    find: "the Scottish Courts",
    replace: "the {governingLawCourts}",
    idempotentMarker: "{governingLawCourts}",
  },
];

const CHARITY_EDITS = [
  {
    name: "Charity Programme Consent definition capacity test",
    find:
      "not assessed as capable of giving consent on their own behalf under section 2(4) or 2(4A) of the Age of Legal Capacity (Scotland) Act 1991",
    replace:
      "{#isScotland}not assessed as capable of giving consent on their own behalf under section 2(4) or 2(4A) of the Age of Legal Capacity (Scotland) Act 1991{/isScotland}{#isEngland}not assessed by {counterparty.shortName} as having capacity to consent on their own behalf under the common law test of Gillick competence{/isEngland}",
    idempotentMarker: "{#isScotland}not assessed as capable",
  },
  {
    name: "Charity operative-clause capacity test",
    // The operative clause already names {counterparty.shortName} and uses
    // "as having capacity to consent" — only the statute reference needs to
    // swap, so the conditional sits around just that fragment. We anchor on
    // "as having capacity to consent on their own behalf" so this find does
    // NOT overlap the Programme Consent definition edit (which uses "not
    // assessed as capable of giving consent on their own behalf").
    find:
      "as having capacity to consent on their own behalf under section 2(4) or 2(4A) of the Age of Legal Capacity (Scotland) Act 1991",
    replace:
      "as having capacity to consent on their own behalf under {#isScotland}section 2(4) or 2(4A) of the Age of Legal Capacity (Scotland) Act 1991{/isScotland}{#isEngland}the common law test of Gillick competence{/isEngland}",
    idempotentMarker:
      "as having capacity to consent on their own behalf under {#isScotland}section 2(4)",
  },
  {
    name: "Charity mediator fallback",
    find: "chosen by the Dean of the Royal Faculty of Procurators in Glasgow",
    replace: "{mediatorFallbackCharity}",
    idempotentMarker: "{mediatorFallbackCharity}",
  },
  {
    name: "Charity governing-law country",
    find: "the law of Scotland",
    replace: "the law of {governingLawCountry}",
    idempotentMarker: "{governingLawCountry}",
  },
  {
    name: "Charity governing-law courts",
    find: "the Scottish Courts",
    replace: "the {governingLawCourts}",
    idempotentMarker: "{governingLawCourts}",
  },
];

function applyEdits(templatePath, edits) {
  const buf = readFileSync(templatePath);
  const zip = new PizZip(buf);
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error(
      `${templatePath}: word/document.xml is missing — file is not a ` +
        `valid .docx, or PizZip failed to read it.`,
    );
  }
  let xml = docXmlFile.asText();
  const before = xml.length;
  const summary = [];

  for (const edit of edits) {
    // Marker takes precedence: a conditional-section replacement contains
    // the original Scotland phrasing inside its {#isScotland} branch, so
    // `find` is still present after a successful bake. Marker presence
    // means "already done — leave alone".
    if (xml.includes(edit.idempotentMarker)) {
      summary.push(`  ${edit.name}: already baked`);
      continue;
    }
    if (!xml.includes(edit.find)) {
      throw new Error(
        `${templatePath}\n  ${edit.name}: could not find original text ` +
          `(and no idempotent marker) — has the template been re-worded?\n` +
          `  looking for: ${JSON.stringify(edit.find)}`,
      );
    }

    // Advance past the inserted replacement; otherwise an idempotent-by-
    // construction edit (Scotland branch contains find verbatim) would
    // infinite-loop on the first pass.
    let count = 0;
    let pos = 0;
    while (true) {
      const i = xml.indexOf(edit.find, pos);
      if (i === -1) break;
      xml = xml.slice(0, i) + edit.replace + xml.slice(i + edit.find.length);
      pos = i + edit.replace.length;
      count += 1;
    }
    // Every current edit targets exactly one site. A future template
    // revision that introduces a substring collision (e.g. a recital
    // referencing "the Scotland Act 1998") would otherwise be silently
    // mutated — fail loudly so the operator decides whether to narrow the
    // find or whether the second occurrence is intentional.
    if (count !== 1) {
      throw new Error(
        `${templatePath}\n  ${edit.name}: expected exactly 1 occurrence of ` +
          `${JSON.stringify(edit.find)}, found ${count}`,
      );
    }
    summary.push(`  ${edit.name}: replaced ${count}×`);
  }

  // Post-condition: every edit's idempotentMarker must now be present.
  // Catches typos in edit.replace (e.g. "{#isScotand}", missing closing
  // brace) at bake time, before the broken template reaches renderToBuffer.
  for (const edit of edits) {
    if (!xml.includes(edit.idempotentMarker)) {
      throw new Error(
        `${templatePath}\n  ${edit.name}: post-condition failed — ` +
          `idempotentMarker ${JSON.stringify(edit.idempotentMarker)} not ` +
          `present after edits. Check edit.replace for a typo.`,
      );
    }
  }

  zip.file("word/document.xml", xml);
  const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  writeFileSync(templatePath, out);
  console.log(`${templatePath}: ${before} → ${out.length} bytes`);
  for (const line of summary) console.log(line);
}

applyEdits(LA_TEMPLATE, LA_EDITS);
applyEdits(CHARITY_TEMPLATE, CHARITY_EDITS);
