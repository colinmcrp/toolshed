import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { buildContext, type RenderContext } from "./build-context";
import { buildFilename } from "./filename";
import { dottedParser } from "./dotted-parser";
import type { Intake } from "./schema";

const STRAY_TOKEN_RE = /\{[#^/]?[A-Za-z][\w.]*\}/g;

function assertCleanRender(zip: PizZip): void {
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  const stray = xml.match(STRAY_TOKEN_RE);
  if (stray && stray.length > 0) {
    const unique = [...new Set(stray)];
    throw new Error(
      `DSA render produced unsubstituted tokens: ${unique.join(", ")}`,
    );
  }
  if (xml.includes("undefined")) {
    throw new Error(
      "DSA render produced literal 'undefined' in the document XML — a nested placeholder did not resolve.",
    );
  }
}

// Pure renderer — no network I/O. Safe to call in tests.
export function renderToBuffer(
  template: ArrayBuffer | Buffer | Uint8Array,
  context: RenderContext,
): Uint8Array {
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
    parser: dottedParser,
  });
  doc.render(context);
  assertCleanRender(doc.getZip());
  return doc.getZip().generate({ type: "uint8array", compression: "DEFLATE" });
}

export async function generateAndDownload(intake: Intake): Promise<void> {
  const res = await fetch("/MCR_DSA_Master_Template.docx");
  if (!res.ok) {
    throw new Error(
      `Failed to fetch DSA template: ${res.status} ${res.statusText}`,
    );
  }
  const buf = await res.arrayBuffer();
  const context = buildContext(intake);
  const bytes = renderToBuffer(buf, context);
  const blob = new Blob([bytes as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  saveAs(blob, buildFilename(intake.counterparty.shortName));
}
