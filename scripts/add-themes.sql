-- Migration: Add Themes Support for Postcards, 3-2-1s, and Takeovers
-- Run this in the Supabase SQL Editor (Database > SQL Editor)

-- ============================================
-- THEMES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on themes
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view themes
CREATE POLICY "Anyone can view themes"
  ON public.themes
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can create themes
CREATE POLICY "Authenticated users can create themes"
  ON public.themes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- POSTCARD THEMES JOIN TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.postcard_themes (
  postcard_id UUID REFERENCES public.postcards(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES public.themes(id) ON DELETE CASCADE,
  PRIMARY KEY (postcard_id, theme_id)
);

-- Enable RLS
ALTER TABLE public.postcard_themes ENABLE ROW LEVEL SECURITY;

-- Anyone can view postcard themes
CREATE POLICY "Anyone can view postcard themes"
  ON public.postcard_themes
  FOR SELECT
  TO authenticated
  USING (true);

-- Postcard owners can manage themes
CREATE POLICY "Postcard owners can add themes"
  ON public.postcard_themes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.postcards
      WHERE id = postcard_id AND author_id = auth.uid()
    )
  );

CREATE POLICY "Postcard owners can remove themes"
  ON public.postcard_themes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.postcards
      WHERE id = postcard_id AND author_id = auth.uid()
    )
  );

-- ============================================
-- THREE TWO ONE THEMES JOIN TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.three_two_one_themes (
  three_two_one_id UUID REFERENCES public.three_two_one(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES public.themes(id) ON DELETE CASCADE,
  PRIMARY KEY (three_two_one_id, theme_id)
);

-- Enable RLS
ALTER TABLE public.three_two_one_themes ENABLE ROW LEVEL SECURITY;

-- Anyone can view 3-2-1 themes
CREATE POLICY "Anyone can view three_two_one themes"
  ON public.three_two_one_themes
  FOR SELECT
  TO authenticated
  USING (true);

-- 3-2-1 owners can manage themes
CREATE POLICY "Three_two_one owners can add themes"
  ON public.three_two_one_themes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.three_two_one
      WHERE id = three_two_one_id AND author_id = auth.uid()
    )
  );

CREATE POLICY "Three_two_one owners can remove themes"
  ON public.three_two_one_themes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.three_two_one
      WHERE id = three_two_one_id AND author_id = auth.uid()
    )
  );

-- ============================================
-- TAKEOVER THEMES JOIN TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.takeover_themes (
  takeover_id UUID REFERENCES public.takeovers(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES public.themes(id) ON DELETE CASCADE,
  PRIMARY KEY (takeover_id, theme_id)
);

-- Enable RLS
ALTER TABLE public.takeover_themes ENABLE ROW LEVEL SECURITY;

-- Anyone can view takeover themes
CREATE POLICY "Anyone can view takeover themes"
  ON public.takeover_themes
  FOR SELECT
  TO authenticated
  USING (true);

-- Takeover owners can manage themes
CREATE POLICY "Takeover owners can add themes"
  ON public.takeover_themes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.takeovers
      WHERE id = takeover_id AND presenter_id = auth.uid()
    )
  );

CREATE POLICY "Takeover owners can remove themes"
  ON public.takeover_themes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.takeovers
      WHERE id = takeover_id AND presenter_id = auth.uid()
    )
  );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_themes_name ON public.themes(name);
CREATE INDEX IF NOT EXISTS idx_themes_slug ON public.themes(slug);
CREATE INDEX IF NOT EXISTS idx_postcard_themes_postcard ON public.postcard_themes(postcard_id);
CREATE INDEX IF NOT EXISTS idx_postcard_themes_theme ON public.postcard_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_three_two_one_themes_item ON public.three_two_one_themes(three_two_one_id);
CREATE INDEX IF NOT EXISTS idx_three_two_one_themes_theme ON public.three_two_one_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_takeover_themes_takeover ON public.takeover_themes(takeover_id);
CREATE INDEX IF NOT EXISTS idx_takeover_themes_theme ON public.takeover_themes(theme_id);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check themes table exists
SELECT 'themes table' as check_item,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') as exists;

-- Check join tables exist
SELECT 'postcard_themes table' as check_item,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'postcard_themes') as exists;

SELECT 'three_two_one_themes table' as check_item,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'three_two_one_themes') as exists;

SELECT 'takeover_themes table' as check_item,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'takeover_themes') as exists;
