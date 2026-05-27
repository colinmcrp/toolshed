#!/usr/bin/env node
// Bakes a three-paragraph signature placeholder block into the master
// DSA template, one block above the MCR signatory's printed name and
// one above the MCR witness's:
//
//   <w:p>{#mcrHasSignatory}</w:p>
//   <w:p>{%mcrSignatoryImage}</w:p>
//   <w:p>{/mcrHasSignatory}</w:p>
//
// Three paragraphs is required because docxtemplater-image-module-free
// expects the {%...} tag to be the sole content of its own paragraph
// — packing all three tags into one paragraph fails compile with
// "Raw tag not in paragraph".
//
// With paragraphLoop: true, the {#...}/{/...} paragraphs are consumed
// by the section trait, leaving either the image paragraph (when the
// flag is true) or nothing (when false).
//
// Idempotent — running twice is a no-op. Also self-healing: if an
// older single-paragraph form is found, it is removed before the
// correct three-paragraph form is inserted.
//
//   node scripts/dsa-builder/bake-signature-placeholders.cjs

const PizZip = require("pizzip");
const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const REPO_ROOT = resolve(__dirname, "..", "..");
const TEMPLATE_PATHS = [
  resolve(REPO_ROOT, "public", "MCR_DSA_Master_Template.docx"),
  resolve(REPO_ROOT, "public", "MCR_DSA_Charity_Master_Template.docx"),
];

const PLACEHOLDERS = [
  {
    anchor: "{mcr.signatoryName}",
    openTag: "{#mcrHasSignatory}",
    imageTag: "{%mcrSignatoryImage}",
    closeTag: "{/mcrHasSignatory}",
    name: "signatory",
  },
  {
    anchor: "{mcr.witnessName}",
    openTag: "{#mcrHasWitness}",
    imageTag: "{%mcrWitnessImage}",
    closeTag: "{/mcrHasWitness}",
    name: "witness",
  },
];

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
    const inner = match[1];
    const text = inner.replace(/<[^>]+>/g, "");
    if (text.includes(anchor)) return match.index;
  }
  return -1;
}

// Earlier bake runs produced an all-in-one paragraph like
//   <w:p><w:r><w:t xml:space="preserve">{#flag}{%tag}{/flag}</w:t></w:r></w:p>
// which docxtemplater-image-module-free rejects. This finds and
// returns that exact paragraph's bytes so we can remove it.
function findBadSinglePara(xml, openTag, imageTag, closeTag) {
  const paraRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  for (const match of xml.matchAll(paraRe)) {
    const text = match[1].replace(/<[^>]+>/g, "");
    if (
      text.includes(openTag) &&
      text.includes(imageTag) &&
      text.includes(closeTag) &&
      // Exclude the case where the three are already in their own paragraphs —
      // we'd never get all three text fragments in a single inner.
      !text.includes("</w:p><w:p>")
    ) {
      return { start: match.index, end: match.index + match[0].length };
    }
  }
  return null;
}

function bakePlaceholdersInto(templatePath) {
  const buf = readFileSync(templatePath);
  const zip = new PizZip(buf);
  let documentXml = zip.file("word/document.xml").asText();

  const actions = [];
  for (const p of PLACEHOLDERS) {
    // Remove any prior all-in-one paragraph first.
    const bad = findBadSinglePara(documentXml, p.openTag, p.imageTag, p.closeTag);
    if (bad) {
      documentXml = documentXml.slice(0, bad.start) + documentXml.slice(bad.end);
      actions.push(`removed legacy single-paragraph ${p.name}`);
    }

    // If the correct three-paragraph form is already present, skip.
    const correctBlock =
      paragraphXml(p.openTag) + paragraphXml(p.imageTag) + paragraphXml(p.closeTag);
    if (documentXml.includes(correctBlock)) {
      continue;
    }

    const idx = findParagraphStart(documentXml, p.anchor);
    if (idx === -1) {
      throw new Error(
        `${templatePath}: could not locate <w:p> containing anchor ${p.anchor} for ${p.name}`,
      );
    }
    documentXml =
      documentXml.slice(0, idx) + correctBlock + documentXml.slice(idx);
    actions.push(`inserted ${p.name}`);
  }

  if (actions.length === 0) {
    console.log(`${templatePath}: nothing to do`);
    return;
  }

  zip.file("word/document.xml", documentXml);
  const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  writeFileSync(templatePath, out);
  console.log(`${templatePath}: ${actions.join("; ")}`);
  console.log(`${templatePath}: was ${buf.length} bytes, now ${out.length} bytes`);
}

for (const p of TEMPLATE_PATHS) bakePlaceholdersInto(p);
