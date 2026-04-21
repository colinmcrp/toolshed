-- Migration: html_artifacts table
-- Creates the html_artifacts table with RLS policies for owner-only access.
-- Artifacts are immutable: no update policy (replace = delete + re-upload).

create table public.html_artifacts (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique
                              -- 3-64 chars: [a-z0-9] bookends + 1-62 interior chars (letters/digits/hyphen)
                              constraint html_artifacts_slug_format
                              check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  owner_id      uuid        not null references auth.users(id) on delete cascade,
  is_bundle     boolean     not null default false,
  entry_path    text        not null default 'index.html',
  size_bytes    bigint      not null,
  mime_type     text        not null,
  original_name text,
  created_at    timestamptz not null default now()
);

create index html_artifacts_owner_idx
  on public.html_artifacts(owner_id, created_at desc);

alter table public.html_artifacts enable row level security;

create policy "owner read own"
  on public.html_artifacts
  for select
  using (auth.uid() = owner_id);

create policy "owner insert own"
  on public.html_artifacts
  for insert
  with check (auth.uid() = owner_id);

create policy "owner delete own"
  on public.html_artifacts
  for delete
  using (auth.uid() = owner_id);
