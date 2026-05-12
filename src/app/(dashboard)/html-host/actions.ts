"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateSlug, suggestSlug } from "@/lib/html-host/slug";
import {
  extractArtifactBundle,
  ZipExtractionError,
  type ExtractedEntry,
} from "@/lib/html-host/zip";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HtmlArtifact } from "@/types/database";

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB (matches bucket + plan)
const BUCKET = "html-artifacts";
const ALLOWED_SINGLE_MIME = new Set(["text/html"]);
const ZIP_MIMES = new Set([
  "application/zip",
  "application/x-zip-compressed",
]);

// ─── Private helper: list all storage objects recursively ────────────────────
//
// Supabase Storage's `list()` only returns immediate children. For bundles
// with nested directories (e.g. `assets/logo.svg`) we must recurse into
// "folder" entries. Supabase marks folders by returning items with `id === null`.
//
// DONE_WITH_CONCERNS: We use `limit: 1000` and do not paginate. In practice
// artifact bundles are <<1000 files, but this would silently miss files in
// pathological cases. Acceptable for now.

async function listAllObjectsRecursive(
  supabase: SupabaseClient,
  prefix: string
): Promise<string[]> {
  const { data: items, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 });

  if (error) {
    throw new Error(`Failed to list ${prefix}: ${error.message}`, { cause: error });
  }

  const paths: string[] = [];

  for (const item of (items ?? [])) {
    const fullPath = `${prefix}/${item.name}`;
    if (item.id === null) {
      // Folder entry — recurse deeper
      const nested = await listAllObjectsRecursive(supabase, fullPath);
      paths.push(...nested);
    } else {
      // File entry
      paths.push(fullPath);
    }
  }

  return paths;
}

// ─── Action 1: checkSlug ──────────────────────────────────────────────────────

export async function checkSlug(
  slug: string
): Promise<{ available: boolean; reason?: string; suggestion?: string }> {
  const user = await getUser();
  if (!user) {
    return { available: false, reason: "Not signed in" };
  }

  const validation = validateSlug(slug);
  if (!validation.ok) {
    const reasonMap: Record<typeof validation.reason, string> = {
      empty: "Slug is required",
      "too-short": "Must be at least 3 characters",
      "too-long": "Must be at most 64 characters",
      "bad-format":
        "Only lowercase letters, numbers, and dashes. Must start and end with a letter or number.",
      reserved: "That name is reserved",
    };
    return { available: false, reason: reasonMap[validation.reason] };
  }

  // Use service client to detect cross-user slug collisions (RLS would hide other users' rows).
  const serviceClient = createServiceClient();

  try {
    const { data: existing } = await serviceClient
      .from("html_artifacts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      // Fetch nearby candidates in one query to build isTaken callback without N+1 calls.
      const { data: nearby } = await serviceClient
        .from("html_artifacts")
        .select("slug")
        .like("slug", `${slug}-%`)
        .limit(100);

      const takenSet = new Set((nearby ?? []).map((r) => r.slug));
      const suggestion = suggestSlug(slug, (s) => takenSet.has(s) || s === slug);

      return { available: false, reason: "That slug is taken", suggestion };
    }

    return { available: true };
  } catch (err) {
    console.error("[checkSlug] Unexpected error:", err);
    return { available: false, reason: "Could not check slug availability" };
  }
}

// ─── Action 2: createArtifact ─────────────────────────────────────────────────

export async function createArtifact(
  formData: FormData
): Promise<
  | { ok: true; slug: string; url: string }
  | { ok: false; error: string; field?: "slug" | "file" }
> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const slugValue = formData.get("slug");
  const fileValue = formData.get("file");

  if (!slugValue || typeof slugValue !== "string") {
    return { ok: false, error: "Slug is required", field: "slug" };
  }
  if (!fileValue || !(fileValue instanceof File)) {
    return { ok: false, error: "File is required", field: "file" };
  }

  const slug = slugValue.trim();
  const file = fileValue;

  // Validate slug.
  const slugValidation = validateSlug(slug);
  if (!slugValidation.ok) {
    const reasonMap: Record<typeof slugValidation.reason, string> = {
      empty: "Slug is required",
      "too-short": "Must be at least 3 characters",
      "too-long": "Must be at most 64 characters",
      "bad-format":
        "Only lowercase letters, numbers, and dashes. Must start and end with a letter or number.",
      reserved: "That name is reserved",
    };
    return { ok: false, error: reasonMap[slugValidation.reason], field: "slug" };
  }

  // Validate file size (early check before any extraction).
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File must be 5 MB or smaller", field: "file" };
  }

  // Detect whether this is a zip upload.
  const effectiveMime = file.type || "";
  const isZipByMime = ZIP_MIMES.has(effectiveMime);
  const isZipByExtension = file.name.toLowerCase().endsWith(".zip");
  const isZip = isZipByMime || (effectiveMime === "" && isZipByExtension);

  if (isZip) {
    return createBundleArtifact({ user, slug, file });
  }

  // ── Single-file HTML path ─────────────────────────────────────────────────

  // Validate MIME type. Browsers sometimes report "" for file.type;
  // treat that as OK only if the filename ends in ".html".
  const isHtmlByExtension = file.name.toLowerCase().endsWith(".html");
  if (effectiveMime === "") {
    if (!isHtmlByExtension) {
      return {
        ok: false,
        error: "Only .html files are accepted",
        field: "file",
      };
    }
  } else if (!ALLOWED_SINGLE_MIME.has(effectiveMime)) {
    return {
      ok: false,
      error: "Only HTML files are accepted (text/html)",
      field: "file",
    };
  }

  const mimeType = effectiveMime || "text/html";

  // Cross-user slug uniqueness check via service client (bypasses RLS).
  const serviceClient = createServiceClient();
  try {
    const { data: existing } = await serviceClient
      .from("html_artifacts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return { ok: false, error: "That slug is taken", field: "slug" };
    }
  } catch (err) {
    console.error("[createArtifact] Slug uniqueness check failed:", err);
    return { ok: false, error: "Could not verify slug availability" };
  }

  // Insert the DB row with the user-scoped client (RLS: owner_id = auth.uid()).
  const supabase = await createClient();

  const { data: inserted, error: insertError } = await supabase
    .from("html_artifacts")
    .insert({
      slug,
      owner_id: user.id,
      is_bundle: false,
      entry_path: "index.html",
      size_bytes: file.size,
      mime_type: mimeType,
      original_name: file.name,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[createArtifact] DB insert failed:", insertError);
    return { ok: false, error: "Failed to create artifact record" };
  }

  const { id } = inserted;

  // Upload file to storage as `<id>/index.html`.
  const storagePath = `${id}/index.html`;
  const fileArrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileArrayBuffer, {
      contentType: "text/html",
      upsert: false,
    });

  if (uploadError) {
    console.error("[createArtifact] Storage upload failed:", uploadError);
    // Rollback: delete the inserted DB row.
    const { error: rollbackError } = await supabase
      .from("html_artifacts")
      .delete()
      .eq("id", id);
    if (rollbackError) {
      console.error(
        "[createArtifact] Rollback failed — orphaned DB row:",
        id,
        rollbackError
      );
    }
    return { ok: false, error: "Upload failed" };
  }

  revalidatePath("/html-host");
  return { ok: true, slug, url: `/${slug}.html` };
}

// ─── Private: bounded-concurrency bundle uploader ────────────────────────────

const CONCURRENCY = 5;

async function uploadBundleEntries(
  supabase: SupabaseClient,
  id: string,
  entries: ExtractedEntry[],
): Promise<Error | null> {
  let index = 0;
  let firstError: Error | null = null;

  async function worker() {
    while (firstError === null) {
      const i = index++;
      if (i >= entries.length) return;
      const entry = entries[i];
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${id}/${entry.path}`, entry.data, {
          contentType: entry.mimeType,
          upsert: false,
        });
      if (error) {
        firstError = firstError ?? error;
        return;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return firstError;
}

// ─── Private: bundle upload path ─────────────────────────────────────────────

async function createBundleArtifact({
  user,
  slug,
  file,
}: {
  user: { id: string };
  slug: string;
  file: File;
}): Promise<
  | { ok: true; slug: string; url: string }
  | { ok: false; error: string; field?: "slug" | "file" }
> {
  // Extract and validate the zip bundle.
  let bundle: Awaited<ReturnType<typeof extractArtifactBundle>>;
  try {
    bundle = await extractArtifactBundle(file, MAX_BYTES);
  } catch (err) {
    if (err instanceof ZipExtractionError) {
      const messageMap: Record<string, string> = {
        "empty-zip": "The zip archive is empty.",
        "missing-index-html": "The bundle must contain index.html at the root.",
        "path-traversal":
          "The zip contains an unsafe path (..) and cannot be accepted.",
        "absolute-path":
          "The zip contains an absolute path and cannot be accepted.",
        "size-exceeded": "Uncompressed bundle size exceeds 5 MB.",
        "invalid-zip": "Could not read the zip file.",
      };
      const message = messageMap[err.code] ?? "Could not extract the bundle.";
      return { ok: false, error: message, field: "file" };
    }
    console.error("[createBundleArtifact] Unexpected extraction error:", err);
    return { ok: false, error: "Could not extract the bundle.", field: "file" };
  }

  // Cross-user slug uniqueness check via service client (bypasses RLS).
  const serviceClient = createServiceClient();
  try {
    const { data: existing } = await serviceClient
      .from("html_artifacts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return { ok: false, error: "That slug is taken", field: "slug" };
    }
  } catch (err) {
    console.error("[createBundleArtifact] Slug uniqueness check failed:", err);
    return { ok: false, error: "Could not verify slug availability" };
  }

  // Insert the DB row.
  const supabase = await createClient();

  const { data: inserted, error: insertError } = await supabase
    .from("html_artifacts")
    .insert({
      slug,
      owner_id: user.id,
      is_bundle: true,
      entry_path: "index.html",
      size_bytes: bundle.totalBytes,
      mime_type: "application/zip",
      original_name: file.name,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[createBundleArtifact] DB insert failed:", insertError);
    return { ok: false, error: "Failed to create artifact record" };
  }

  const { id } = inserted;

  // Upload all bundle entries with bounded concurrency (up to CONCURRENCY at a time).
  const uploadError = await uploadBundleEntries(supabase, id, bundle.entries);

  if (uploadError) {
    console.error(
      "[createBundleArtifact] Upload failed:",
      uploadError
    );

    // Best-effort cleanup: remove any already-uploaded objects.
    try {
      const allPaths = await listAllObjectsRecursive(supabase, id);
      if (allPaths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(BUCKET)
          .remove(allPaths);
        if (removeError) {
          console.error(
            "[createBundleArtifact] Partial storage cleanup failed:",
            removeError
          );
        }
      }
    } catch (listErr) {
      console.error(
        "[createBundleArtifact] Partial storage cleanup list failed — files may be orphaned:",
        listErr
      );
    }

    // Rollback DB row.
    const { error: rollbackError } = await supabase
      .from("html_artifacts")
      .delete()
      .eq("id", id);
    if (rollbackError) {
      console.error(
        "[createBundleArtifact] DB rollback failed — orphaned row:",
        id,
        rollbackError
      );
    }

    return { ok: false, error: "Upload failed for one or more files" };
  }

  revalidatePath("/html-host");
  return { ok: true, slug, url: `/${slug}/` };
}

// ─── Action 3: listMyArtifacts ────────────────────────────────────────────────

export async function listMyArtifacts(): Promise<HtmlArtifact[]> {
  const user = await getUser();
  if (!user) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("html_artifacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listMyArtifacts] Query failed:", error);
    return [];
  }

  return data ?? [];
}

// ─── Action 4: deleteArtifact ─────────────────────────────────────────────────

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteArtifact(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  if (!UUID_REGEX.test(id)) {
    return { ok: false, error: "Invalid artifact id" };
  }

  const supabase = await createClient();

  // Confirm the row exists and belongs to the current user (RLS does the ownership check).
  const { data: row, error: fetchError } = await supabase
    .from("html_artifacts")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("[deleteArtifact] Fetch failed:", fetchError);
    return { ok: false, error: "Failed to look up artifact" };
  }

  if (!row) {
    return { ok: false, error: "Not found" };
  }

  // Recursively list all storage objects under `<id>/` before deleting the DB row.
  // Order matters: storage first so the better failure mode is an orphaned DB row
  // (user can retry) rather than an orphaned storage object (no UI path to clean up).
  let allPaths: string[];
  try {
    allPaths = await listAllObjectsRecursive(supabase, id);
  } catch (err) {
    console.error("[deleteArtifact] Failed to list artifact files:", err);
    return { ok: false, error: "Failed to list artifact files" };
  }

  if (allPaths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(allPaths);

    if (removeError) {
      console.error("[deleteArtifact] Storage remove failed:", removeError);
      return { ok: false, error: "Failed to delete artifact files" };
    }
  }

  // Delete the DB row (RLS ensures non-owners cannot delete).
  const { error: deleteError } = await supabase
    .from("html_artifacts")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[deleteArtifact] DB delete failed:", deleteError);
    return { ok: false, error: "Failed to delete artifact record" };
  }

  revalidatePath("/html-host");
  return { ok: true };
}
