-- Backfill profiles for existing auth users who don't have one
-- Run this in the Supabase SQL Editor (Database > SQL Editor)

INSERT INTO public.profiles (id, full_name, role, created_at)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    -- Convert email prefix "colin.adam" to "Colin Adam"
    INITCAP(REPLACE(SPLIT_PART(au.email, '@', 1), '.', ' '))
  ) as full_name,
  'staff' as role,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Show what was created
SELECT id, full_name, role, created_at
FROM public.profiles
ORDER BY created_at DESC;
