export function buildFilename(shortName: string, date: Date = new Date()): string {
  const safe = shortName
    .replace(/[^A-Za-z0-9_\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  const stem = safe.length > 0 ? safe : "counterparty";
  // Local date components — avoids UTC rollover putting "tomorrow" in the
  // filename when generating late at night in non-UTC timezones.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `MCR_DSA_${stem}_${year}-${month}-${day}.docx`;
}
