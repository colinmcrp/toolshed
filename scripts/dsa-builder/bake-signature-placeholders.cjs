#!/usr/bin/env node
// Bakes two new conditional-section + image-placeholder paragraphs into
// the master DSA template — one above the MCR signatory's printed name,
// one above the MCR witness's. The {%...} tag is consumed by the
// docxtemplater image module at render time; the surrounding
// {#mcrHasSignatory}...{/mcrHasSignatory} guarantees the whole paragraph
// drops out when no signature image is supplied.
//
// Idempotent — running twice is a no-op. Re-run after replacing
// public/MCR_DSA_Master_Template.docx with a new version from Word.
//
//   node scripts/dsa-builder/bake-signature-placeholders.cjs

const PizZip = require("pizzip");
const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const REPO_ROOT = resolve(__dirname, "..", "..");
const TEMPLATE_PATH = resolve(REPO_ROOT, "public", "MCR_DSA_Master_Template.docx");

const PLACEHOLDERS = [
  {
    anchor: "{mcr.signatoryName}",
    placeholder:
      "{#mcrHasSignatory}{%mcrSignatoryImage}{/mcrHasSignatory}",
    name: "signatory",
  },
  {
    anchor: "{mcr.witnessName}",
    placeholder:
      "{#mcrHasWitness}{%mcrWitnessImage}{/mcrHasWitness}",
    name: "witness",
  },
];

// A minimal paragraph wrapping a single run with a single text node. The
// template uses Word's default body style, so no rPr/pPr is needed.
function paragraphXml(text) {
  return (
    "<w:p>" +
    "<w:r><w:t xml:space=\"preserve\">" +
    text +
    "</w:t></w:r>" +
    "</w:p>"
  );
}

// Word splits a typed token like {mcr.signatoryName} across multiple
// <w:r> runs. We need the <w:p> that contains all of the run fragments
// concatenated; then we insert a new <w:p> immediately before its open
// tag.
function findParagraphStart(xml, anchor) {
  const paraRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  for (const match of xml.matchAll(paraRe)) {
    const inner = match[1];
    const text = inner.replace(/<[^>]+>/g, "");
    if (text.includes(anchor)) return match.index;
  }
  return -1;
}

const buf = readFileSync(TEMPLATE_PATH);
const zip = new PizZip(buf);
let documentXml = zip.file("word/document.xml").asText();

const inserted = [];
for (const { anchor, placeholder, name } of PLACEHOLDERS) {
  if (documentXml.includes(placeholder)) {
    console.log(`${name} placeholder already present — skipping`);
    continue;
  }
  const idx = findParagraphStart(documentXml, anchor);
  if (idx === -1) {
    throw new Error(
      `Could not locate <w:p> containing anchor ${anchor} for ${name}`,
    );
  }
  documentXml =
    documentXml.slice(0, idx) + paragraphXml(placeholder) + documentXml.slice(idx);
  inserted.push(name);
}

if (inserted.length === 0) {
  console.log("nothing to do");
  process.exit(0);
}

zip.file("word/document.xml", documentXml);
const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
writeFileSync(TEMPLATE_PATH, out);
console.log(
  `inserted ${inserted.join(", ")} placeholder paragraph(s); was ${buf.length} bytes, now ${out.length} bytes`,
);
