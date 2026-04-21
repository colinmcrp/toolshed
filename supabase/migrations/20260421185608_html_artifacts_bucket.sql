-- Migration: html-artifacts storage bucket
-- Depends on: 20260421185607_html_artifacts.sql (requires public.html_artifacts)
-- Creates a private storage bucket for HTML artifact files with a 5 MB per-file limit.
-- Storage RLS policies allow owners to upload/delete under their own artifact prefixes.
-- No authenticated read policy: the public viewer route uses the service role.

-- Note: on conflict (id) do nothing means an existing bucket's allowed_mime_types will NOT be
-- updated by re-running this migration. If the MIME allowlist changes in the future, add a
-- separate migration to update the bucket row directly (e.g. UPDATE storage.buckets SET ...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('html-artifacts', 'html-artifacts', false, 5242880, array['text/html', 'application/zip'])
on conflict (id) do nothing;

-- Overwrites of existing paths under an owned prefix are permitted here because all uploads go
-- through a single auth-gated server action that controls what is written. If direct storage API
-- access is ever opened up to clients, revisit this policy and add an UPDATE guard to prevent
-- one owner overwriting another's objects via a crafted path.
create policy "owner upload own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'html-artifacts'
    and exists (
      select 1
      from public.html_artifacts a
      where a.id::text = (storage.foldername(name))[1]
        and a.owner_id = auth.uid()
    )
  );

create policy "owner delete own"
  on storage.objects
  for delete
  using (
    bucket_id = 'html-artifacts'
    and exists (
      select 1
      from public.html_artifacts a
      where a.id::text = (storage.foldername(name))[1]
        and a.owner_id = auth.uid()
    )
  );
