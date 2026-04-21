-- Migration: drop MIME allowlist on html-artifacts bucket
-- The original allowlist was ['text/html', 'application/zip'] to gate user-facing uploads,
-- but bundle entries (CSS, JS, images, fonts) are uploaded server-side after zip extraction
-- and must pass through storage unchanged. Application-level MIME validation in
-- createArtifact still restricts the top-level upload to .html or .zip; the CSP sandbox
-- on the viewer route prevents any malicious content from escaping its opaque origin.

update storage.buckets
set allowed_mime_types = null
where id = 'html-artifacts';
