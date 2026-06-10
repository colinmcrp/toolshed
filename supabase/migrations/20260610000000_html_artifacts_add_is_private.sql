-- Migration: html_artifacts privacy flag
-- Adds is_private: private artifacts are only served to signed-in
-- @mcrpathways.org users (enforced in the app's serving route).
-- Artifacts stay otherwise immutable: update is allowed for owners but only
-- on the is_private column (column-level grant).

alter table public.html_artifacts
  add column is_private boolean not null default false;

revoke update on table public.html_artifacts from anon, authenticated;
grant update (is_private) on table public.html_artifacts to authenticated;

create policy "owner update own privacy"
  on public.html_artifacts
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
