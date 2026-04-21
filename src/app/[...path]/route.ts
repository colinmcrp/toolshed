import { NextResponse } from "next/server";
import mime from "mime-types";
import { createServiceClient } from "@/lib/supabase/service";

const NOT_FOUND = new NextResponse("Not found", { status: 404 });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  // Defensive: reject empty segments or path traversal attempts
  if (!path || path.length === 0) return NOT_FOUND;
  for (const segment of path) {
    if (segment === "" || segment.includes("..")) return NOT_FOUND;
  }

  // ── URL shape resolution ────────────────────────────────────────────────────
  const isSingleFile = path.length === 1 && path[0].endsWith(".html");

  let slug: string;
  let assetPath: string | null;

  if (isSingleFile) {
    // /foo.html → slug = "foo", no asset
    slug = path[0].slice(0, -5); // strip ".html"
    assetPath = null;
  } else {
    // /foo/bar/baz → slug = "foo", assetPath = "bar/baz" (or null if just /foo)
    slug = path[0];
    assetPath = path.slice(1).join("/") || null;
  }

  // ── DB lookup ───────────────────────────────────────────────────────────────
  const supabase = createServiceClient();
  const { data: artifact, error } = await supabase
    .from("html_artifacts")
    .select("id, is_bundle, entry_path")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !artifact) return NOT_FOUND;

  // ── Shape enforcement ───────────────────────────────────────────────────────
  // Single-file URL shape requires a non-bundle artifact
  if (isSingleFile && artifact.is_bundle) return NOT_FOUND;
  // Bundle URL shape requires a bundle artifact
  if (!isSingleFile && !artifact.is_bundle) return NOT_FOUND;

  // ── Storage key resolution ──────────────────────────────────────────────────
  let storageKey: string;
  if (!artifact.is_bundle) {
    // Single-file: always stored as index.html regardless of entry_path
    storageKey = `${artifact.id}/index.html`;
  } else if (assetPath) {
    // Bundle with explicit asset path
    storageKey = `${artifact.id}/${assetPath}`;
  } else {
    // Bundle entry point
    storageKey = `${artifact.id}/${artifact.entry_path}`;
  }

  // ── Storage download ────────────────────────────────────────────────────────
  const { data: blob, error: storageError } = await supabase.storage
    .from("html-artifacts")
    .download(storageKey);

  if (storageError || !blob) return NOT_FOUND;

  // ── Determine MIME type ─────────────────────────────────────────────────────
  // Use the resolved file path for MIME lookup (assetPath, entry_path, or index.html)
  const filePath = assetPath ?? artifact.entry_path;
  const contentType = mime.lookup(filePath) || "application/octet-stream";

  // ── Response ────────────────────────────────────────────────────────────────
  return new NextResponse(blob.stream(), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
      "Content-Security-Policy": "sandbox allow-scripts allow-forms",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
