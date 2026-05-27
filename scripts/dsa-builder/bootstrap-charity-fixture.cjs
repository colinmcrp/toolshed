#!/usr/bin/env node
// One-time bootstrap: render sample-charity-centrestage.json through the
// docx pipeline and save the result as sample-charity-centrestage.generated.docx
// so the parity test in render.test.ts has a stable reference to compare
// against. Re-run after intentional changes to the charity master template
// or the charity-track context builder.
//
// Logic mirrors buildCharityContext + renderToBuffer (kept light here so this
// script can run as plain Node without a TS build step).

const fs = require("node:fs");
const path = require("node:path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

const ROOT = path.resolve(__dirname, "..", "..");
const TEMPLATE = path.join(ROOT, "public", "MCR_DSA_Charity_Master_Template.docx");
const FIXTURE_DIR = path.join(ROOT, "src", "lib", "dsa-builder", "fixtures");
const INPUT = path.join(FIXTURE_DIR, "sample-charity-centrestage.json");
const OUTPUT = path.join(FIXTURE_DIR, "sample-charity-centrestage.generated.docx");

const MCR_DEFAULTS = {
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
};

const INSERT = "[insert]";
const fallback = (v) => (v && v.length > 0 ? v : INSERT);

function buildCharityContext(intake) {
  const cp = intake.counterparty;
  const willSign = intake.counterpartyWillSign !== false;
  const pick = (val) => (willSign ? val : "");
  const counterparty = {
    ...cp,
    signatoryName: fallback(pick(cp.signatoryName)),
    signatoryPosition: fallback(cp.signatoryPosition),
    signatoryDate: fallback(pick(cp.signatoryDate)),
    signatoryPlace: fallback(pick(cp.signatoryPlace) || cp.address),
    witnessName: fallback(pick(cp.witnessName)),
    witnessPosition: fallback(cp.witnessPosition),
    witnessDate: fallback(pick(cp.witnessDate)),
    witnessAddress: fallback(pick(cp.witnessAddress) || cp.address),
    repJobTitle: fallback(pick(cp.repJobTitle)),
    repAddress: fallback(pick(cp.repAddress)),
    repEmail: fallback(pick(cp.repEmail)),
    repPhone: fallback(pick(cp.repPhone)),
    escalationJobTitle: fallback(pick(cp.escalationJobTitle)),
    escalationAddress: fallback(pick(cp.escalationAddress)),
    escalationEmail: fallback(pick(cp.escalationEmail)),
    escalationPhone: fallback(pick(cp.escalationPhone)),
  };
  const intakeMcrNonEmpty = Object.fromEntries(
    Object.entries(intake.mcr || {}).filter(([, v]) => v !== ""),
  );
  const mcr = { ...MCR_DEFAULTS, ...intakeMcrNonEmpty };
  return {
    crim: intake.includeCriminalRecord !== false,
    counterparty: {
      ...counterparty,
      hasBackground: ((cp.background ?? "").trim().length > 0),
    },
    mcr,
  };
}

function dottedParser(tag) {
  const p = tag.trim();
  return {
    get(scope) {
      if (p === ".") return scope;
      let cur = scope;
      for (const part of p.split(".")) {
        if (cur == null) return "";
        cur = cur[part];
      }
      return cur == null ? "" : cur;
    },
  };
}

const intake = JSON.parse(fs.readFileSync(INPUT, "utf8"));
delete intake._comment;
const context = buildCharityContext(intake);

const zip = new PizZip(fs.readFileSync(TEMPLATE));
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
  delimiters: { start: "{", end: "}" },
  parser: dottedParser,
});
doc.render(context);
const out = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
fs.writeFileSync(OUTPUT, out);
console.log(`Wrote ${OUTPUT} (${out.length} bytes)`);
