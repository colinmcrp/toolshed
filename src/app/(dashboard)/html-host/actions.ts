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

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (matches bucket + plan)
const BUCKET = "html-artifacts";
// Staging filename used while a zip bundle is uploaded directly from the browser.
// Removed before extracted entries are written so a zip entry can legitimately be
// named `_upload.zip` at the bundle root without colliding.
const STAGING_OBJECT_NAME = "_upload.zip";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// ─── Action 2: prepareArtifactUpload ──────────────────────────────────────────
//
// Step 1 of the direct-upload flow. Claims the slug by inserting the DB row,
// then returns a signed upload URL so the browser can PUT the file straight to
// Supabase Storage — bypassing Vercel's 4.5 MB request body limit on Server
// Actions.

export type ArtifactKind = "html" | "zip";

export async function prepareArtifactUpload(input: {
  slug: string;
  kind: ArtifactKind;
  originalName: string;
  declaredSize: number;
  isPrivate?: boolean;
}): Promise<
  | {
      ok: true;
      id: string;
      slug: string;
      kind: ArtifactKind;
      bucket: string;
      uploadPath: string;
      uploadToken: string;
    }
  | { ok: false; error: string; field?: "slug" | "file" }
> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const slug = input.slug.trim();

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

  // Validate kind.
  if (input.kind !== "html" && input.kind !== "zip") {
    return { ok: false, error: "Only .html or .zip files are accepted", field: "file" };
  }

  // Validate declared size.
  if (!Number.isFinite(input.declaredSize) || input.declaredSize <= 0) {
    return { ok: false, error: "File is empty or has an invalid size", field: "file" };
  }
  if (input.declaredSize > MAX_BYTES) {
    return { ok: false, error: "File must be 10 MB or smaller", field: "file" };
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
    console.error("[prepareArtifactUpload] Slug uniqueness check failed:", err);
    return { ok: false, error: "Could not verify slug availability" };
  }

  // Insert the DB row with the user-scoped client (RLS: owner_id = auth.uid()).
  // The UNIQUE constraint on `slug` atomically claims it, even if a concurrent
  // request slipped past the check above.
  const supabase = await createClient();
  const isBundle = input.kind === "zip";

  const { data: inserted, error: insertError } = await supabase
    .from("html_artifacts")
    .insert({
      slug,
      owner_id: user.id,
      is_bundle: isBundle,
      is_private: input.isPrivate ?? false,
      entry_path: "index.html",
      size_bytes: input.declaredSize,
      mime_type: isBundle ? "application/zip" : "text/html",
      original_name: input.originalName,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    // 23505 = Postgres unique_violation
    if (insertError && insertError.code === "23505") {
      return { ok: false, error: "That slug is taken", field: "slug" };
    }
    console.error("[prepareArtifactUpload] DB insert failed:", insertError);
    return { ok: false, error: "Failed to create artifact record" };
  }

  const { id } = inserted;
  const uploadPath = isBundle
    ? `${id}/${STAGING_OBJECT_NAME}`
    : `${id}/index.html`;

  // Generate a signed upload URL. We use the service client so the token is
  // not bound to the user's session (signed upload URLs use their own token
  // auth and bypass storage RLS for the specific path they're issued for).
  const { data: signed, error: signError } = await serviceClient.storage
    .from(BUCKET)
    .createSignedUploadUrl(uploadPath);

  if (signError || !signed) {
    console.error(
      "[prepareArtifactUpload] Signed upload URL creation failed:",
      signError
    );
    // Roll back the DB row so the slug isn't permanently stuck.
    const { error: rollbackError } = await serviceClient
      .from("html_artifacts")
      .delete()
      .eq("id", id);
    if (rollbackError) {
      console.error(
        "[prepareArtifactUpload] Rollback failed — orphaned row:",
        id,
        rollbackError
      );
    }
    return { ok: false, error: "Could not create upload URL" };
  }

  return {
    ok: true,
    id,
    slug,
    kind: input.kind,
    bucket: BUCKET,
    uploadPath: signed.path,
    uploadToken: signed.token,
  };
}

// ─── Action 3: finalizeArtifactUpload ─────────────────────────────────────────
//
// Step 2 of the direct-upload flow. For single HTML files this is effectively
// a confirmation — the browser already PUT the file to its final path. For
// zip bundles, this is where extraction and per-entry storage uploads happen,
// using the service client because the zip can be far larger than the entries
// and we already paid for the user's browser → storage hop.

export async function finalizeArtifactUpload(input: {
  id: string;
}): Promise<
  | { ok: true; slug: string; url: string }
  | { ok: false; error: string }
> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  if (!UUID_REGEX.test(input.id)) {
    return { ok: false, error: "Invalid artifact id" };
  }

  // RLS-enforced lookup confirms ownership.
  const supabase = await createClient();
  const { data: row, error: rowError } = await supabase
    .from("html_artifacts")
    .select("id, slug, is_bundle")
    .eq("id", input.id)
    .maybeSingle();

  if (rowError) {
    console.error("[finalizeArtifactUpload] Row lookup failed:", rowError);
    return { ok: false, error: "Failed to look up artifact" };
  }
  if (!row) {
    return { ok: false, error: "Not found" };
  }

  // Single-file HTML: the browser already uploaded to `<id>/index.html`. Done.
  if (!row.is_bundle) {
    revalidatePath("/html-host");
    return { ok: true, slug: row.slug, url: `/${row.slug}.html` };
  }

  // Bundle path: download the staging zip, extract, upload entries.
  const serviceClient = createServiceClient();
  const stagingPath = `${row.id}/${STAGING_OBJECT_NAME}`;

  let zipBlob: Blob;
  try {
    const { data, error } = await serviceClient.storage
      .from(BUCKET)
      .download(stagingPath);
    if (error || !data) {
      console.error("[finalizeArtifactUpload] Zip download failed:", error);
      await cleanupArtifact(serviceClient, row.id);
      return { ok: false, error: "Upload not found — please retry" };
    }
    zipBlob = data;
  } catch (err) {
    console.error("[finalizeArtifactUpload] Unexpected download error:", err);
    await cleanupArtifact(serviceClient, row.id);
    return { ok: false, error: "Failed to read uploaded zip" };
  }

  // Extract and validate.
  let bundle: Awaited<ReturnType<typeof extractArtifactBundle>>;
  try {
    bundle = await extractArtifactBundle(zipBlob, MAX_BYTES);
  } catch (err) {
    let message = "Could not extract the bundle.";
    if (err instanceof ZipExtractionError) {
      const messageMap: Record<string, string> = {
        "empty-zip": "The zip archive is empty.",
        "missing-index-html": "The bundle must contain index.html at the root.",
        "path-traversal":
          "The zip contains an unsafe path (..) and cannot be accepted.",
        "absolute-path":
          "The zip contains an absolute path and cannot be accepted.",
        "size-exceeded": "Uncompressed bundle size exceeds 10 MB.",
        "invalid-zip": "Could not read the zip file.",
      };
      message = messageMap[err.code] ?? message;
    } else {
      console.error("[finalizeArtifactUpload] Extraction error:", err);
    }
    await cleanupArtifact(serviceClient, row.id);
    return { ok: false, error: message };
  }

  // Remove the staging zip before uploading entries: a zip entry can legitimately
  // be named `_upload.zip`, which would collide with the staging object.
  const { error: removeStagingError } = await serviceClient.storage
    .from(BUCKET)
    .remove([stagingPath]);
  if (removeStagingError) {
    console.error(
      "[finalizeArtifactUpload] Failed to remove staging zip:",
      removeStagingError
    );
    // Continue: cleanup at end will catch lingering objects on hard failure.
  }

  // Upload entries via service client so we don't depend on the user's session
  // being alive for what can be many small requests.
  const uploadError = await uploadBundleEntries(serviceClient, row.id, bundle.entries);
  if (uploadError) {
    console.error("[finalizeArtifactUpload] Entry upload failed:", uploadError);
    await cleanupArtifact(serviceClient, row.id);
    return { ok: false, error: "Upload failed for one or more files" };
  }

  // Backfill the true uncompressed total. Best-effort: the artifact is still
  // viewable if this fails, the displayed size will just be the zip size.
  const { error: updateError } = await serviceClient
    .from("html_artifacts")
    .update({ size_bytes: bundle.totalBytes })
    .eq("id", row.id);
  if (updateError) {
    console.error(
      "[finalizeArtifactUpload] size_bytes update failed:",
      updateError
    );
  }

  revalidatePath("/html-host");
  return { ok: true, slug: row.slug, url: `/${row.slug}/` };
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

// ─── Private: full artifact cleanup (used on finalize failure) ───────────────

async function cleanupArtifact(
  serviceClient: SupabaseClient,
  id: string,
): Promise<void> {
  try {
    const paths = await listAllObjectsRecursive(serviceClient, id);
    if (paths.length > 0) {
      const { error } = await serviceClient.storage.from(BUCKET).remove(paths);
      if (error) {
        console.error("[cleanupArtifact] Storage remove failed:", error);
      }
    }
  } catch (err) {
    console.error("[cleanupArtifact] List failed:", err);
  }

  const { error } = await serviceClient
    .from("html_artifacts")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[cleanupArtifact] DB delete failed — orphaned row:", id, error);
  }
}

// ─── Action 4: listMyArtifacts ────────────────────────────────────────────────

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

// ─── Action 5: setArtifactPrivacy ─────────────────────────────────────────────
//
// The only mutation allowed on a published artifact (column-level grant: RLS
// owners may update is_private and nothing else). Private artifacts are only
// served to signed-in @mcrpathways.org viewers.

export async function setArtifactPrivacy(
  id: string,
  isPrivate: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  if (!UUID_REGEX.test(id)) {
    return { ok: false, error: "Invalid artifact id" };
  }

  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("html_artifacts")
    .update({ is_private: isPrivate })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[setArtifactPrivacy] Update failed:", error);
    return { ok: false, error: "Failed to update visibility" };
  }
  if (!updated) {
    // RLS filtered the row: not found or not owned by this user.
    return { ok: false, error: "Not found" };
  }

  revalidatePath("/html-host");
  return { ok: true };
}

// ─── Action 6: deleteArtifact ─────────────────────────────────────────────────

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
