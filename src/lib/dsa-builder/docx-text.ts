import PizZip from "pizzip";

// Pulls the readable text out of a .docx ArrayBuffer / Buffer by reading
// word/document.xml and stripping XML tags. Used by tests to compare
// rendered output to reference fixtures by content, not by byte equality
// (zip metadata timestamps will differ between runs).
export function extractDocxText(input: ArrayBuffer | Buffer | Uint8Array): string {
  const zip = new PizZip(input);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  return xml
    .replace(/<w:tab\/>/g, " ")
    .replace(/<w:br\/>/g, " ")
    .replace(/<w:p[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
