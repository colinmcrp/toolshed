-- Private storage bucket for MCR signatures used by the DSA builder.
-- No RLS read policy is added — only the service-role client can read,
-- which is what src/lib/dsa-builder/signatures.ts uses.
insert into storage.buckets (id, name, public)
values ('dsa-signatures', 'dsa-signatures', false)
on conflict (id) do nothing;
