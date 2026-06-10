import { NextResponse } from "next/server";
import mime from "mime-types";
import { createServiceClient } from "@/lib/supabase/service";
import { getUser } from "@/lib/supabase/server";
import { gatePrivateArtifact } from "@/lib/html-host/private-gate";

const notFound = () => new NextResponse("Not found", { status: 404 });

const FORBIDDEN_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Restricted page</title></head>
<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;text-align:center">
<h1>Restricted page</h1>
<p>This page is only available to MCR Pathways staff. You are signed in with an account that does not have access.</p>
</body></html>`;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  // Defensive: reject empty segments or path traversal attempts
  if (!path || path.length === 0) return notFound();
  for (const segment of path) {
    if (segment === "" || segment.includes("..")) return notFound();
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
    .select("id, is_bundle, entry_path, is_private")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !artifact) return notFound();

  // ── Privacy gate ────────────────────────────────────────────────────────────
  // Private artifacts require a signed-in @mcrpathways.org viewer. Anonymous
  // viewers go to login and bounce back here via `next`.
  if (artifact.is_private) {
    const requestPath = `/${path.join("/")}`;
    const gate = gatePrivateArtifact(await getUser(), requestPath);
    if (gate.action === "redirect") {
      return NextResponse.redirect(new URL(gate.location, req.url), 302);
    }
    if (gate.action === "forbidden") {
      return new NextResponse(FORBIDDEN_HTML, {
        status: 403,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
        },
      });
    }
  }

  // ── Shape enforcement ───────────────────────────────────────────────────────
  // Single-file URL shape requires a non-bundle artifact
  if (isSingleFile && artifact.is_bundle) return notFound();
  // Bundle URL shape requires a bundle artifact
  if (!isSingleFile && !artifact.is_bundle) return notFound();

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

  if (storageError || !blob) return notFound();

  // ── Determine MIME type ─────────────────────────────────────────────────────
  // Use the resolved file path for MIME lookup (assetPath, entry_path, or index.html)
  const filePath = assetPath ?? artifact.entry_path;
  const contentType = mime.lookup(filePath) || "application/octet-stream";

  // ── Response ────────────────────────────────────────────────────────────────
  // For bundle HTML pages, inject <base href="/<slug>/"> so relative asset/link
  // paths resolve to the bundle root even when the entry is served at /<slug>
  // (the trailing slash gets 308-stripped). Idempotent: skips pages that already
  // declare a <base>. Single-file artifacts and non-HTML assets stream untouched.
  let body: ReadableStream<Uint8Array> | string = blob.stream();
  if (artifact.is_bundle && contentType.startsWith("text/html")) {
    const html = await blob.text();
    body = /<base\s/i.test(html)
      ? html
      : /<head[^>]*>/i.test(html)
        ? html.replace(/<head[^>]*>/i, (m) => `${m}<base href="/${slug}/">`)
        : `<base href="/${slug}/">${html}`;
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Private pages must never land in a shared/CDN cache.
      "Cache-Control": artifact.is_private
        ? "private, no-store"
        : "public, max-age=300",
      "Content-Security-Policy": "sandbox allow-scripts allow-forms",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
