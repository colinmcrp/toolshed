-- Migration: add SELECT policy on html-artifacts storage objects
-- deleteArtifact uses the user-scoped client to list files under <artifact-id>/ before
-- removing them. Without this policy, the list returns empty and files are orphaned.

create policy "owner read own"
  on storage.objects
  for select
  using (
    bucket_id = 'html-artifacts'
    and exists (
      select 1
      from public.html_artifacts a
      where a.id::text = (storage.foldername(name))[1]
        and a.owner_id = auth.uid()
    )
  );
