#!/usr/bin/env node
// One-shot uploader: pushes the two MCR signature PNGs from
// private/dsa-signatures/ into the dsa-signatures Supabase Storage
// bucket. Run once after the bucket migration is applied; re-run
// safely after replacing either PNG locally (upsert: true).
//
// Requires:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Loads them from .env.local if present.
//
//   node scripts/dsa-builder/upload-signatures-to-bucket.cjs

const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");

const REPO_ROOT = resolve(__dirname, "..", "..");

function loadEnvLocal() {
  const path = resolve(REPO_ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key]) continue;
    process.env[key] = raw.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Add them to .env.local or export them in your shell.",
  );
  process.exit(1);
}

const { createClient } = require("@supabase/supabase-js");
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const UPLOADS = [
  {
    local: resolve(REPO_ROOT, "private", "dsa-signatures", "sharon-mcintyre.png"),
    remote: "mcr/sharon-mcintyre.png",
  },
  {
    local: resolve(REPO_ROOT, "private", "dsa-signatures", "colin-adam.png"),
    remote: "mcr/colin-adam.png",
  },
];

(async () => {
  for (const { local, remote } of UPLOADS) {
    if (!existsSync(local)) {
      console.error(`missing local source: ${local}`);
      process.exit(1);
    }
    const bytes = readFileSync(local);
    const { error } = await client.storage
      .from("dsa-signatures")
      .upload(remote, bytes, {
        contentType: "image/png",
        upsert: true,
      });
    if (error) {
      console.error(`upload failed for ${remote}: ${error.message}`);
      process.exit(1);
    }
    console.log(`uploaded ${remote} (${bytes.length} bytes)`);
  }
})();
