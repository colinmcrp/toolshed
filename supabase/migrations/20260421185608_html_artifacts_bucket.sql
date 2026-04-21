-- Migration: html-artifacts storage bucket
-- Creates a private storage bucket for HTML artifact files with a 5 MB per-file limit.
-- Storage RLS policies allow owners to upload/delete under their own artifact prefixes.
-- No authenticated read policy: the public viewer route uses the service role.

insert into storage.buckets (id, name, public, file_size_limit)
values ('html-artifacts', 'html-artifacts', false, 5242880)
on conflict (id) do nothing;

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
