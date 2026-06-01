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
 *         html_artifacts.owner_id is NOT NULL → auth.users(id).
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
 */

import { NextResponse } from "next/server";
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

const BodySchema = z.object({
  slug: z.string(),
  files: z.record(z.string(), z.string()), // relative path → base64 contents
  overwrite: z.boolean().optional(),
});

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

/** Constant-time string comparison to avoid token timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Reject path traversal, absolute paths, and odd segments. */
function isSafePath(p: string): boolean {
  if (!p || p.length > 255) return false;
  if (p.startsWith("/") || p.includes("\\") || p.includes("..")) return false;
  return p.split("/").every((seg) => seg !== "" && seg !== ".");
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

async function removeArtifact(supabase: SupabaseClient, id: string): Promise<void> {
  try {
    const paths = await listAllObjects(supabase, id);
    if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
  } catch (err) {
    console.error("[publish] storage cleanup failed:", err);
  }
  await supabase.from("html_artifacts").delete().eq("id", id);
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
  if (!token || !safeEqual(token, expectedToken)) {
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
  if (!files["index.html"]) return json({ ok: false, error: "Must include an index.html at the root" }, 400);

  // Decode + size-check up front.
  const decoded: { path: string; data: Buffer; contentType: string }[] = [];
  let totalBytes = 0;
  for (const p of paths) {
    if (!isSafePath(p)) return json({ ok: false, error: `Unsafe path: ${p}` }, 400);
    const buf = Buffer.from(files[p], "base64");
    if (buf.length === 0) return json({ ok: false, error: `Empty or invalid base64 for ${p}` }, 400);
    totalBytes += buf.length;
    if (totalBytes > MAX_TOTAL_BYTES) return json({ ok: false, error: "Bundle exceeds 8 MB" }, 413);
    decoded.push({ path: p, data: buf, contentType: mime.lookup(p) || "application/octet-stream" });
  }

  const isBundle = !(paths.length === 1 && paths[0] === "index.html");
  const supabase = createServiceClient();

  // ── Slug collision / overwrite ──────────────────────────────────────────────
  const { data: existing } = await supabase
    .from("html_artifacts")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    if (!overwrite) {
      return json({ ok: false, error: "Slug already taken — pass overwrite:true to replace" }, 409);
    }
    await removeArtifact(supabase, existing.id);
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

  // ── Upload files ──────────────────────────────────────────────────────────────
  for (const file of decoded) {
    const key = isBundle ? `${row.id}/${file.path}` : `${row.id}/index.html`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, file.data, { contentType: file.contentType, upsert: true });
    if (error) {
      console.error("[publish] upload failed:", file.path, error);
      await removeArtifact(supabase, row.id);
      return json({ ok: false, error: `Upload failed for ${file.path}` }, 500);
    }
  }

  const path = isBundle ? `/${slug}/` : `/${slug}.html`;
  const origin = new URL(req.url).origin;
  return json({ ok: true, slug, isBundle, files: paths.length, url: path, fullUrl: `${origin}${path}` }, 200);
}
