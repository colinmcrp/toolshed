/**
 * POST /api/publish — headless HTML artifact publishing.
 *
 * Lets a trusted, non-interactive client (e.g. a Claude Code session via the
 * `mcr-publish` skill) publish an HTML artifact without a browser session.
 * Mirrors the html-host server actions (prepare/finalize) but authenticates
 * with a single scoped bearer token instead of a Supabase user session, and
 * writes via the service-role client.
 *
 * Auth:   Authorization: Bearer <PUBLISH_API_TOKEN>
 * Owner:  rows are created under PUBLISH_OWNER_ID (a real auth.users id), since
 *         html_artifacts.owner_id is NOT NULL → auth.users(id). API publishes
 *         only ever read/replace artifacts owned by PUBLISH_OWNER_ID, so the
 *         token can never clobber an artifact a web-UI user created.
 *
 * Body (JSON):
 *   { "slug": "my-page",
 *     "files": { "index.html": "<base64>", "assets/app.css": "<base64>", ... },
 *     "overwrite": false }
 *
 * - A lone `index.html` is published as a single file → served at /<slug>.html
 * - Any other shape is a bundle → served at /<slug>/  (assets at /<slug>/<path>)
 *
 * NOTE: the whole request is one JSON body. On Vercel's lower tiers the request
 * body is capped around 4.5 MB, so practical bundles are a few MB (base64 adds
 * ~33%). The web UI's signed-upload flow remains the path for very large zips.
 *
 * NOTE: replace (overwrite:true) is delete-then-insert (artifacts are immutable;
 * the slug is globally unique). It is not transactional — if the re-insert fails
 * after the delete, the old artifact is gone and the caller re-publishes. The
 * caller already holds the content, so this is recoverable by retry.
 */

import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import mime from "mime-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { validateSlug } from "@/lib/html-host/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "html-artifacts";
const MAX_TOTAL_BYTES = 8 * 1024 * 1024; // hard cap; see body-size note above
const MAX_FILES = 300;
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

const BodySchema = z.object({
  slug: z.string(),
  files: z.record(z.string(), z.string()), // relative path → base64 contents
  overwrite: z.boolean().optional(),
});

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

/** Constant-time token comparison via fixed-length digests (no length leak). */
function tokenMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Decode base64, validating the format first. Returns null on malformed input. */
function decodeBase64(value: string): Buffer | null {
  const trimmed = value.replace(/\s+/g, "");
  // Accept unpadded base64 too (Node decodes it); only length % 4 === 1 is impossible.
  if (!BASE64_RE.test(trimmed) || trimmed.length % 4 === 1) return null;
  return Buffer.from(trimmed, "base64");
}

/** Reject path traversal, absolute paths, and odd segments (but allow '..' inside a filename). */
function isSafePath(p: string): boolean {
  if (!p || p.length > 255) return false;
  if (p.startsWith("/") || p.includes("\\")) return false;
  return p.split("/").every((seg) => seg !== "" && seg !== "." && seg !== "..");
}

/** Recursively list every storage object under `<id>/` (folders have id === null). */
async function listAllObjects(supabase: SupabaseClient, prefix: string): Promise<string[]> {
  const { data: items, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw new Error(`list ${prefix}: ${error.message}`);
  const out: string[] = [];
  for (const item of items ?? []) {
    const full = `${prefix}/${item.name}`;
    if (item.id === null) out.push(...(await listAllObjects(supabase, full)));
    else out.push(full);
  }
  return out;
}

/** Remove an artifact's storage objects + DB row. Returns an Error on failure (caller decides). */
async function removeArtifact(supabase: SupabaseClient, id: string): Promise<Error | null> {
  try {
    const paths = await listAllObjects(supabase, id);
    if (paths.length > 0) {
      const { error } = await supabase.storage.from(BUCKET).remove(paths);
      if (error) return error as unknown as Error;
    }
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err));
  }
  const { error } = await supabase.from("html_artifacts").delete().eq("id", id);
  return error ? (error as unknown as Error) : null;
}

export async function POST(req: Request) {
  // ── Server configuration ────────────────────────────────────────────────
  const expectedToken = process.env.PUBLISH_API_TOKEN;
  const ownerId = process.env.PUBLISH_OWNER_ID;
  if (!expectedToken || !ownerId) {
    return json({ ok: false, error: "Publishing is not configured on the server" }, 503);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !tokenMatches(token, expectedToken)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  // ── Parse + validate body ──────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ ok: false, error: "Body must be { slug, files: { path: base64 }, overwrite? }" }, 400);
  }
  const { slug, files, overwrite } = parsed.data;

  const slugCheck = validateSlug(slug);
  if (!slugCheck.ok) {
    return json({ ok: false, error: `Invalid slug (${slugCheck.reason})` }, 400);
  }

  const paths = Object.keys(files);
  if (paths.length === 0) return json({ ok: false, error: "No files provided" }, 400);
  if (paths.length > MAX_FILES) return json({ ok: false, error: `Too many files (max ${MAX_FILES})` }, 400);
  if (!Object.prototype.hasOwnProperty.call(files, "index.html")) {
    return json({ ok: false, error: "Must include an index.html at the root" }, 400);
  }

  // Decode + validate + size-check up front. Empty files are allowed.
  const decoded: { path: string; data: Buffer; contentType: string }[] = [];
  let totalBytes = 0;
  for (const p of paths) {
    if (!isSafePath(p)) return json({ ok: false, error: `Unsafe path: ${p}` }, 400);
    const buf = decodeBase64(files[p]);
    if (buf === null) return json({ ok: false, error: `Invalid base64 for ${p}` }, 400);
    totalBytes += buf.length;
    if (totalBytes > MAX_TOTAL_BYTES) return json({ ok: false, error: "Bundle exceeds 8 MB" }, 413);
    decoded.push({ path: p, data: buf, contentType: mime.lookup(p) || "application/octet-stream" });
  }

  const isBundle = !(paths.length === 1 && paths[0] === "index.html");
  const supabase = createServiceClient();

  // ── Slug collision / overwrite (owner-scoped: never touch another owner's slug) ──
  const { data: existing } = await supabase
    .from("html_artifacts")
    .select("id, owner_id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    if (existing.owner_id !== ownerId) {
      // Slug belongs to a different owner (e.g. a web-UI user). Never clobber it.
      return json({ ok: false, error: "Slug is in use by another owner" }, 409);
    }
    if (!overwrite) {
      return json({ ok: false, error: "Slug already taken — pass overwrite:true to replace" }, 409);
    }
    const removeError = await removeArtifact(supabase, existing.id);
    if (removeError) {
      console.error("[publish] failed to remove existing artifact for overwrite:", removeError);
      return json({ ok: false, error: "Failed to replace the existing artifact" }, 500);
    }
  }

  // ── Create row ──────────────────────────────────────────────────────────────
  const { data: row, error: insertError } = await supabase
    .from("html_artifacts")
    .insert({
      slug,
      owner_id: ownerId,
      is_bundle: isBundle,
      entry_path: "index.html",
      size_bytes: totalBytes,
      mime_type: "text/html",
      original_name: slug,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    if (insertError?.code === "23505") {
      return json({ ok: false, error: "Slug already taken" }, 409);
    }
    console.error("[publish] insert failed:", insertError);
    return json({ ok: false, error: "Failed to create artifact record" }, 500);
  }

  // ── Upload files (bounded concurrency, like uploadBundleEntries in actions.ts) ──
  // Sequential uploads of up to MAX_FILES would risk the serverless execution
  // timeout on large bundles; a small worker pool keeps it well within limits.
  const rowId = row.id;
  const UPLOAD_CONCURRENCY = 5;
  const uploadFailures: { path: string; error: unknown }[] = [];
  let nextIndex = 0;
  async function uploadWorker() {
    while (uploadFailures.length === 0) {
      const i = nextIndex++;
      if (i >= decoded.length) return;
      const file = decoded[i];
      const key = isBundle ? `${rowId}/${file.path}` : `${rowId}/index.html`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(key, file.data, { contentType: file.contentType, upsert: true });
      if (error) {
        uploadFailures.push({ path: file.path, error });
        return;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(UPLOAD_CONCURRENCY, decoded.length) }, uploadWorker)
  );
  if (uploadFailures.length > 0) {
    const f = uploadFailures[0];
    console.error("[publish] upload failed:", f.path, f.error);
    await removeArtifact(supabase, rowId);
    return json({ ok: false, error: `Upload failed for ${f.path}` }, 500);
  }

  const path = isBundle ? `/${slug}/` : `/${slug}.html`;
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host");
  const origin = host ? `${proto}://${host}` : new URL(req.url).origin;
  return json({ ok: true, slug, isBundle, files: paths.length, url: path, fullUrl: `${origin}${path}` }, 200);
}
