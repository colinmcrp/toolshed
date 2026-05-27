#!/usr/bin/env node
// Renders the Centrestage charity fixture with Sharon's and Colin's
// signatures baked in, then opens the output. Mirrors render.ts's image-
// module setup (markers, per-signer sizes, conditional flags) so a
// preview run matches what the wizard would produce when the MCR signer
// preset is selected.

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");

const ROOT = path.resolve(__dirname, "..", "..");
const TEMPLATE = path.join(ROOT, "public", "MCR_DSA_Charity_Master_Template.docx");
const FIXTURE = path.join(
  ROOT,
  "src",
  "lib",
  "dsa-builder",
  "fixtures",
  "sample-charity-centrestage.json",
);
const SIG_DIR = path.join(ROOT, "private", "dsa-signatures");
const SIGNATORY_PNG = path.join(SIG_DIR, "sharon-mcintyre.png");
const WITNESS_PNG = path.join(SIG_DIR, "colin-adam.png");
const OUTPUT = path.join(ROOT, "tmp-signed-charity-centrestage.docx");

const MCR_SIGNER_PRESET = {
  signatoryName: "Sharon McIntyre",
  signatoryPosition: "Chief Executive Officer",
  witnessName: "Colin Adam",
  witnessPosition: "Head of Solutions",
};

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

const IMAGE_MARKERS = {
  SIGNATORY: "mcr-signatory",
  WITNESS: "mcr-witness",
};
const SIGNATURE_SIZES = {
  [IMAGE_MARKERS.SIGNATORY]: [200, 82],
  [IMAGE_MARKERS.WITNESS]: [200, 96],
};

const INSERT = "[insert]";
const fallback = (v) => (v && v.length > 0 ? v : INSERT);

// Mirror src/lib/dsa-builder/build-context.ts:formatDate so the preview docx
// matches what the wizard would render for ISO-date fixtures.
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
function formatDate(value) {
  if (!value) return "";
  const m = value.match(ISO_DATE_RE);
  if (!m) return value;
  const [, y, mo, d] = m;
  const monthIdx = Number(mo) - 1;
  if (monthIdx < 0 || monthIdx > 11) return value;
  return `${Number(d)} ${MONTHS[monthIdx]} ${y}`;
}

function buildCharityContext(intake) {
  const cp = intake.counterparty;
  const willSign = intake.counterpartyWillSign !== false;
  const pick = (val) => (willSign ? val : "");
  const counterparty = {
    ...cp,
    signatoryName: fallback(pick(cp.signatoryName)),
    signatoryPosition: fallback(cp.signatoryPosition),
    signatoryDate: fallback(formatDate(pick(cp.signatoryDate))),
    signatoryPlace: fallback(pick(cp.signatoryPlace) || cp.address),
    witnessName: fallback(pick(cp.witnessName)),
    witnessPosition: fallback(cp.witnessPosition),
    witnessDate: fallback(formatDate(pick(cp.witnessDate))),
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
  mcr.signatoryDate = formatDate(mcr.signatoryDate);
  mcr.witnessDate = formatDate(mcr.witnessDate);
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

const intake = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
delete intake._comment;

// Force the MCR signer preset so the wizard's signaturesForPreset gate
// would trigger in the real flow.
intake.mcr = {
  ...intake.mcr,
  signatoryName: MCR_SIGNER_PRESET.signatoryName,
  signatoryPosition: MCR_SIGNER_PRESET.signatoryPosition,
  witnessName: MCR_SIGNER_PRESET.witnessName,
  witnessPosition: MCR_SIGNER_PRESET.witnessPosition,
};

const signatoryImage = fs.readFileSync(SIGNATORY_PNG);
const witnessImage = fs.readFileSync(WITNESS_PNG);
const buffers = {
  [IMAGE_MARKERS.SIGNATORY]: signatoryImage,
  [IMAGE_MARKERS.WITNESS]: witnessImage,
};

const imageModule = new ImageModule({
  centered: false,
  getImage(tagValue) {
    return buffers[tagValue];
  },
  getSize(_img, tagValue) {
    return SIGNATURE_SIZES[tagValue];
  },
});

const context = {
  ...buildCharityContext(intake),
  mcrHasSignatory: true,
  mcrHasWitness: true,
  mcrSignatoryImage: IMAGE_MARKERS.SIGNATORY,
  mcrWitnessImage: IMAGE_MARKERS.WITNESS,
};

const zip = new PizZip(fs.readFileSync(TEMPLATE));
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
  delimiters: { start: "{", end: "}" },
  parser: dottedParser,
  modules: [imageModule],
});
doc.render(context);
const out = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
fs.writeFileSync(OUTPUT, out);
console.log(`Wrote ${OUTPUT} (${out.length} bytes)`);

execFileSync("open", ["-a", "Pages", OUTPUT]);
