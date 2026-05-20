import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { buildContext, type RenderContext } from "./build-context";
import { buildFilename } from "./filename";
import { dottedParser } from "./dotted-parser";
import type { Intake } from "./schema";

const STRAY_TOKEN_RE = /\{[#^/]?[A-Za-z][\w.]*\}/g;

// XML parts inside a .docx that docxtemplater substitutes into. Scanning
// only document.xml would miss broken tokens in headers, footers,
// footnotes, endnotes, or comments — none of which are templated today,
// but a future template edit could put one there and we want to catch it.
const SCANNED_PART_RE = /^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/;

function assertCleanRender(zip: PizZip): void {
  const partNames = Object.keys(zip.files).filter((name) =>
    SCANNED_PART_RE.test(name),
  );
  for (const name of partNames) {
    const xml = zip.file(name)?.asText() ?? "";
    const stray = xml.match(STRAY_TOKEN_RE);
    if (stray && stray.length > 0) {
      const unique = [...new Set(stray)];
      throw new Error(
        `DSA render produced unsubstituted tokens in ${name}: ${unique.join(", ")}`,
      );
    }
    if (xml.includes("undefined")) {
      throw new Error(
        `DSA render produced literal 'undefined' in ${name} — a nested placeholder did not resolve.`,
      );
    }
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
