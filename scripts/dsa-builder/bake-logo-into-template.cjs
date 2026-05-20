#!/usr/bin/env node
// Bakes the MCR Pathways logo into the master DSA template as a static
// inline image centred at the top of page 1.
//
// Why bake instead of injecting at render time:
//   The logo is invariant across every generated DSA. Baking it into the
//   template avoids a runtime image-module dependency, keeps render.ts
//   pure, and means the logo travels with the template in source control.
//   Per-DSA variable images (signatures) will need a different mechanism
//   in PR B.
//
// Idempotent — running twice is a no-op. Run after replacing
// public/MCR_DSA_Master_Template.docx with a new version from Word.
//
//   node scripts/dsa-builder/insert-logo-placeholder.cjs

const PizZip = require("pizzip");
const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const REPO_ROOT = resolve(__dirname, "..", "..");
const TEMPLATE_PATH = resolve(REPO_ROOT, "public", "MCR_DSA_Master_Template.docx");
const LOGO_PATH = resolve(REPO_ROOT, "public", "dsa-builder", "images", "mcr-logo.png");

// rId100 sits well clear of the template's existing rId1..rId9 sequence,
// leaving room for the existing relationships to grow without collision.
const LOGO_RID = "rIdMCRLogo";
const LOGO_MEDIA_NAME = "mcr-logo.png";

// 280 × 83 px target render size (matches the 3504×1044 aspect ratio).
// docx uses EMUs — 9525 EMU per pixel at 96 DPI.
const EMU_PER_PX = 9525;
const LOGO_WIDTH_PX = 280;
const LOGO_HEIGHT_PX = 83;
const LOGO_WIDTH_EMU = LOGO_WIDTH_PX * EMU_PER_PX;
const LOGO_HEIGHT_EMU = LOGO_HEIGHT_PX * EMU_PER_PX;

const LOGO_DRAWING_PARA =
  '<w:p>' +
  '<w:pPr><w:spacing w:after="240"/><w:jc w:val="center"/></w:pPr>' +
  '<w:r><w:rPr><w:noProof/></w:rPr>' +
  '<w:drawing>' +
  '<wp:inline distT="0" distB="0" distL="0" distR="0"' +
  ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
  `<wp:extent cx="${LOGO_WIDTH_EMU}" cy="${LOGO_HEIGHT_EMU}"/>` +
  '<wp:docPr id="100" name="MCR Pathways logo"/>' +
  '<wp:cNvGraphicFramePr>' +
  '<a:graphicFrameLocks noChangeAspect="1"' +
  ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>' +
  '</wp:cNvGraphicFramePr>' +
  '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
  '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
  '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
  '<pic:nvPicPr><pic:cNvPr id="100" name="MCR Pathways logo"/><pic:cNvPicPr/></pic:nvPicPr>' +
  '<pic:blipFill>' +
  '<a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"' +
  ` r:embed="${LOGO_RID}"/>` +
  '<a:stretch><a:fillRect/></a:stretch>' +
  '</pic:blipFill>' +
  '<pic:spPr>' +
  '<a:xfrm><a:off x="0" y="0"/>' +
  `<a:ext cx="${LOGO_WIDTH_EMU}" cy="${LOGO_HEIGHT_EMU}"/></a:xfrm>` +
  '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' +
  '</pic:spPr>' +
  '</pic:pic>' +
  '</a:graphicData>' +
  '</a:graphic>' +
  '</wp:inline>' +
  '</w:drawing>' +
  '</w:r>' +
  '</w:p>';

const RELS_ADDITION =
  `<Relationship Id="${LOGO_RID}"` +
  ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"' +
  ` Target="media/${LOGO_MEDIA_NAME}"/>`;

const templateBuf = readFileSync(TEMPLATE_PATH);
const logoBuf = readFileSync(LOGO_PATH);
const zip = new PizZip(templateBuf);

const documentXml = zip.file("word/document.xml").asText();
if (documentXml.includes(LOGO_RID)) {
  console.log("logo already baked into template — nothing to do");
  process.exit(0);
}

const BODY_OPEN = "<w:body>";
const bodyIdx = documentXml.indexOf(BODY_OPEN);
if (bodyIdx === -1) throw new Error("could not locate <w:body> in document.xml");

const newDocumentXml =
  documentXml.slice(0, bodyIdx + BODY_OPEN.length) +
  LOGO_DRAWING_PARA +
  documentXml.slice(bodyIdx + BODY_OPEN.length);
zip.file("word/document.xml", newDocumentXml);

const relsXml = zip.file("word/_rels/document.xml.rels").asText();
const RELS_CLOSE = "</Relationships>";
const newRelsXml =
  relsXml.slice(0, relsXml.lastIndexOf(RELS_CLOSE)) +
  RELS_ADDITION +
  RELS_CLOSE;
zip.file("word/_rels/document.xml.rels", newRelsXml);

zip.file(`word/media/${LOGO_MEDIA_NAME}`, logoBuf);

const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
writeFileSync(TEMPLATE_PATH, out);
console.log(
  `baked logo (${logoBuf.length} bytes) into template; ` +
    `was ${templateBuf.length} bytes, now ${out.length} bytes`,
);
