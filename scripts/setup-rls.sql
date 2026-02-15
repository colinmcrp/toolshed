-- Row Level Security (RLS) Setup
-- Run this in the Supabase SQL Editor (Database > SQL Editor)

-- ============================================
-- PROFILES TABLE
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- SELECT: All authenticated users can view all profiles
CREATE POLICY "Anyone can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: INSERT is handled by the trigger function (SECURITY DEFINER)
-- Note: DELETE is not allowed for profiles

-- ============================================
-- VERIFICATION
-- ============================================

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'teams');

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
