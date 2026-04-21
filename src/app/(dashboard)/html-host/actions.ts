"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateSlug, suggestSlug } from "@/lib/html-host/slug";
import type { HtmlArtifact } from "@/types/database";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (matches bucket + plan)
const BUCKET = "html-artifacts";
const ALLOWED_SINGLE_MIME = new Set(["text/html"]); // zip added in task 10

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

  // Validate file size.
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File must be 5 MB or smaller", field: "file" };
  }

  // Validate MIME type. Browsers sometimes report "" for file.type;
  // treat that as OK only if the filename ends in ".html".
  const effectiveMime = file.type || "";
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

  // List and remove all storage objects under `<id>/` before deleting the DB row.
  // Order matters: storage first so the better failure mode is an orphaned DB row
  // (user can retry) rather than an orphaned storage object (no UI path to clean up).
  const { data: objects, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(id);

  if (listError) {
    console.error("[deleteArtifact] Storage list failed:", listError);
    return { ok: false, error: "Failed to list artifact files" };
  }

  if (objects && objects.length > 0) {
    const objectPaths = objects.map((obj) => `${id}/${obj.name}`);
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(objectPaths);

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
