#!/usr/bin/env node
// Bakes a 3-paragraph conditional block into the charity master template,
// inserted between the existing first Background paragraph (which defines
// "Counterparty Activities") and the "MCR delivers..." paragraph:
//
//   <w:p>{#counterparty.hasBackground}</w:p>
//   <w:p>{counterparty.background}</w:p>
//   <w:p>{/counterparty.hasBackground}</w:p>
//
// With paragraphLoop: true, the {#...}/{/...} delimiter paragraphs are
// consumed by the section trait and only the middle paragraph survives
// (when the flag is truthy). When the flag is falsy, the whole block is
// removed and the recitals flow straight from paragraph 1 to "MCR delivers".
//
// Idempotent — re-running is a no-op once the correct block is present.
//
//   node scripts/dsa-builder/bake-charity-background-block.cjs

const PizZip = require("pizzip");
const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const REPO_ROOT = resolve(__dirname, "..", "..");
const TEMPLATE_PATH = resolve(
  REPO_ROOT,
  "public",
  "MCR_DSA_Charity_Master_Template.docx",
);

const OPEN_TAG = "{#counterparty.hasBackground}";
const BODY_TAG = "{counterparty.background}";
const CLOSE_TAG = "{/counterparty.hasBackground}";
// Anchor paragraph that starts paragraph 2 of Background. We insert the
// new block immediately BEFORE this paragraph, so the new paragraph (when
// rendered) sits between Background ¶1 ("runs its own programmes...") and
// the "MCR delivers..." paragraph.
const ANCHOR = "MCR delivers the MCR Pathways Mentoring Programme";

function paragraphXml(text) {
  return (
    "<w:p>" +
    "<w:r><w:t xml:space=\"preserve\">" +
    text +
    "</w:t></w:r>" +
    "</w:p>"
  );
}

function findParagraphStart(xml, anchor) {
  const paraRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  for (const match of xml.matchAll(paraRe)) {
    const text = match[1].replace(/<[^>]+>/g, "");
    if (text.includes(anchor)) return match.index;
  }
  return -1;
}

const buf = readFileSync(TEMPLATE_PATH);
const zip = new PizZip(buf);
let documentXml = zip.file("word/document.xml").asText();

const correctBlock =
  paragraphXml(OPEN_TAG) + paragraphXml(BODY_TAG) + paragraphXml(CLOSE_TAG);

if (documentXml.includes(correctBlock)) {
  console.log("background conditional block already baked — nothing to do");
  process.exit(0);
}

const idx = findParagraphStart(documentXml, ANCHOR);
if (idx === -1) {
  throw new Error(
    `Could not locate <w:p> containing anchor "${ANCHOR}" — has the charity ` +
      "template's Background section been re-worded?",
  );
}

documentXml =
  documentXml.slice(0, idx) + correctBlock + documentXml.slice(idx);

zip.file("word/document.xml", documentXml);
const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
writeFileSync(TEMPLATE_PATH, out);
console.log(
  `baked background conditional block; was ${buf.length} bytes, now ${out.length} bytes`,
);
