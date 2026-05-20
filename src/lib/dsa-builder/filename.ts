export function buildFilename(shortName: string, date: Date = new Date()): string {
  const safe = shortName
    .replace(/[^A-Za-z0-9_\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  const stem = safe.length > 0 ? safe : "counterparty";
  const iso = date.toISOString().slice(0, 10);
  return `MCR_DSA_${stem}_${iso}.docx`;
}
