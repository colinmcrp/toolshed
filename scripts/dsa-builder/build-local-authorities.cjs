#!/usr/bin/env node
// Regenerates src/lib/dsa-builder/local-authorities.ts from the CSV at the
// repo root. Idempotent — run after editing the CSV.
//
//   node scripts/dsa-builder/build-local-authorities.cjs

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const csvPath = path.join(
  repoRoot,
  "scotland_england_local_authorities - scotland_england_local_authorities.csv",
);
const outPath = path.join(repoRoot, "src", "lib", "dsa-builder", "local-authorities.ts");

const csv = fs.readFileSync(csvPath, "utf8");
const lines = csv.split(/\r?\n/).filter(Boolean);
lines.shift(); // header

const rows = lines.map((line) => {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  fields.push(cur);
  if (fields.length !== 3) {
    throw new Error(`Expected 3 fields, got ${fields.length}: ${line}`);
  }
  const [name, address, country] = fields.map((f) => f.trim());
  if (country !== "Scotland" && country !== "England") {
    throw new Error(`Unexpected country "${country}" on row: ${line}`);
  }
  return { name, address, country };
});

const fmt = (arr) =>
  arr
    .map(
      (r) =>
        `  { name: ${JSON.stringify(r.name)}, address: ${JSON.stringify(r.address)} },`,
    )
    .join("\n");

const scotland = rows.filter((r) => r.country === "Scotland");
const england = rows.filter((r) => r.country === "England");

const body = `// AUTO-GENERATED — do not edit by hand.
// Regenerate via: node scripts/dsa-builder/build-local-authorities.cjs

export type LocalAuthority = { name: string; address: string };

export const SCOTLAND_LOCAL_AUTHORITIES: readonly LocalAuthority[] = [
${fmt(scotland)}
] as const;

export const ENGLAND_LOCAL_AUTHORITIES: readonly LocalAuthority[] = [
${fmt(england)}
] as const;

export function localAuthoritiesFor(
  jurisdiction?: "Scotland" | "England" | null,
): readonly LocalAuthority[] {
  if (jurisdiction === "Scotland") return SCOTLAND_LOCAL_AUTHORITIES;
  if (jurisdiction === "England") return ENGLAND_LOCAL_AUTHORITIES;
  return [];
}
`;

fs.writeFileSync(outPath, body);
console.log(
  `Wrote ${path.relative(repoRoot, outPath)} (${scotland.length} Scotland, ${england.length} England)`,
);
