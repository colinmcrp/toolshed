-- Row Level Security (RLS) Setup for ToolShed
-- Run this in the Supabase SQL Editor (Database > SQL Editor)
-- This ensures: all authenticated users can read, only owners can modify

-- ============================================
-- POSTCARDS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.postcards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view postcards" ON public.postcards;
DROP POLICY IF EXISTS "Users can create their own postcards" ON public.postcards;
DROP POLICY IF EXISTS "Users can update their own postcards" ON public.postcards;
DROP POLICY IF EXISTS "Users can delete their own postcards" ON public.postcards;

-- SELECT: All authenticated users can view all postcards
CREATE POLICY "Anyone can view postcards"
  ON public.postcards
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can only create postcards with their own author_id
CREATE POLICY "Users can create their own postcards"
  ON public.postcards
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- UPDATE: Users can only update their own postcards
CREATE POLICY "Users can update their own postcards"
  ON public.postcards
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- DELETE: Users can only delete their own postcards
CREATE POLICY "Users can delete their own postcards"
  ON public.postcards
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- ============================================
-- THREE_TWO_ONE TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.three_two_one ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view three_two_one" ON public.three_two_one;
DROP POLICY IF EXISTS "Users can create their own three_two_one" ON public.three_two_one;
DROP POLICY IF EXISTS "Users can update their own three_two_one" ON public.three_two_one;
DROP POLICY IF EXISTS "Users can delete their own three_two_one" ON public.three_two_one;

-- SELECT: All authenticated users can view all entries
CREATE POLICY "Anyone can view three_two_one"
  ON public.three_two_one
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can only create entries with their own author_id
CREATE POLICY "Users can create their own three_two_one"
  ON public.three_two_one
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- UPDATE: Users can only update their own entries
CREATE POLICY "Users can update their own three_two_one"
  ON public.three_two_one
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- DELETE: Users can only delete their own entries
CREATE POLICY "Users can delete their own three_two_one"
  ON public.three_two_one
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- ============================================
-- TAKEOVERS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.takeovers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view takeovers" ON public.takeovers;
DROP POLICY IF EXISTS "Users can create their own takeovers" ON public.takeovers;
DROP POLICY IF EXISTS "Users can update their own takeovers" ON public.takeovers;
DROP POLICY IF EXISTS "Users can delete their own takeovers" ON public.takeovers;

-- SELECT: All authenticated users can view all takeovers
CREATE POLICY "Anyone can view takeovers"
  ON public.takeovers
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can only create takeovers with their own presenter_id
CREATE POLICY "Users can create their own takeovers"
  ON public.takeovers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = presenter_id);

-- UPDATE: Users can only update their own takeovers
CREATE POLICY "Users can update their own takeovers"
  ON public.takeovers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = presenter_id)
  WITH CHECK (auth.uid() = presenter_id);

-- DELETE: Users can only delete their own takeovers
CREATE POLICY "Users can delete their own takeovers"
  ON public.takeovers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = presenter_id);

-- ============================================
-- PROFILES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- SELECT: All authenticated users can view all profiles (for displaying author names)
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

-- Check that RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('postcards', 'three_two_one', 'takeovers', 'profiles');

-- List all policies
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
