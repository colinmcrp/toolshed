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
  created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid()
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

-- ============================================
-- RPC FUNCTIONS FOR EFFICIENT FILTERING
-- ============================================

-- Function to get postcards filtered by theme slugs
CREATE OR REPLACE FUNCTION get_postcards_by_themes(theme_slugs text[] DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  training_title text,
  elevator_pitch text,
  lightbulb_moment text,
  programme_impact text,
  golden_nugget text,
  visibility text,
  team_id uuid,
  author_id uuid,
  created_at timestamptz,
  team_name text,
  theme_data jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.training_title,
    p.elevator_pitch,
    p.lightbulb_moment,
    p.programme_impact,
    p.golden_nugget,
    p.visibility,
    p.team_id,
    p.author_id,
    p.created_at,
    t.name as team_name,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', th.id, 'name', th.name, 'slug', th.slug))
      FROM postcard_themes pt
      JOIN themes th ON th.id = pt.theme_id
      WHERE pt.postcard_id = p.id
    ), '[]'::jsonb) as theme_data
  FROM postcards p
  LEFT JOIN teams t ON t.id = p.team_id
  WHERE (
    theme_slugs IS NULL
    OR array_length(theme_slugs, 1) IS NULL
    OR EXISTS (
      SELECT 1 FROM postcard_themes pt
      JOIN themes th ON th.id = pt.theme_id
      WHERE pt.postcard_id = p.id AND th.slug = ANY(theme_slugs)
    )
  )
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get 3-2-1s filtered by theme slugs
CREATE OR REPLACE FUNCTION get_three_two_ones_by_themes(theme_slugs text[] DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  training_title text,
  learnings text[],
  changes text[],
  question text,
  visibility text,
  team_id uuid,
  author_id uuid,
  created_at timestamptz,
  team_name text,
  theme_data jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tto.id,
    tto.training_title,
    tto.learnings,
    tto.changes,
    tto.question,
    tto.visibility,
    tto.team_id,
    tto.author_id,
    tto.created_at,
    t.name as team_name,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', th.id, 'name', th.name, 'slug', th.slug))
      FROM three_two_one_themes ttt
      JOIN themes th ON th.id = ttt.theme_id
      WHERE ttt.three_two_one_id = tto.id
    ), '[]'::jsonb) as theme_data
  FROM three_two_one tto
  LEFT JOIN teams t ON t.id = tto.team_id
  WHERE (
    theme_slugs IS NULL
    OR array_length(theme_slugs, 1) IS NULL
    OR EXISTS (
      SELECT 1 FROM three_two_one_themes ttt
      JOIN themes th ON th.id = ttt.theme_id
      WHERE ttt.three_two_one_id = tto.id AND th.slug = ANY(theme_slugs)
    )
  )
  ORDER BY tto.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get takeovers filtered by theme slugs
CREATE OR REPLACE FUNCTION get_takeovers_by_themes(theme_slugs text[] DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  meeting_date date,
  top_learnings text[],
  visibility text,
  team_id uuid,
  presenter_id uuid,
  created_at timestamptz,
  team_name text,
  theme_data jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tk.id,
    tk.meeting_date,
    tk.top_learnings,
    tk.visibility,
    tk.team_id,
    tk.presenter_id,
    tk.created_at,
    t.name as team_name,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', th.id, 'name', th.name, 'slug', th.slug))
      FROM takeover_themes tt
      JOIN themes th ON th.id = tt.theme_id
      WHERE tt.takeover_id = tk.id
    ), '[]'::jsonb) as theme_data
  FROM takeovers tk
  LEFT JOIN teams t ON t.id = tk.team_id
  WHERE (
    theme_slugs IS NULL
    OR array_length(theme_slugs, 1) IS NULL
    OR EXISTS (
      SELECT 1 FROM takeover_themes tt
      JOIN themes th ON th.id = tt.theme_id
      WHERE tt.takeover_id = tk.id AND th.slug = ANY(theme_slugs)
    )
  )
  ORDER BY tk.meeting_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for global search across all content types
CREATE OR REPLACE FUNCTION global_search(
  search_term text DEFAULT '',
  theme_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  preview text,
  theme_data jsonb
) AS $$
BEGIN
  RETURN QUERY
  -- Postcards
  SELECT
    p.id,
    'postcard'::text as type,
    p.training_title as title,
    p.elevator_pitch as preview,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
      FROM postcard_themes pt
      JOIN themes t ON t.id = pt.theme_id
      WHERE pt.postcard_id = p.id
    ), '[]'::jsonb) as theme_data
  FROM postcards p
  WHERE (
    search_term = ''
    OR p.training_title ILIKE '%' || search_term || '%'
    OR p.elevator_pitch ILIKE '%' || search_term || '%'
  )
  AND (
    theme_ids IS NULL
    OR EXISTS (
      SELECT 1 FROM postcard_themes pt
      WHERE pt.postcard_id = p.id AND pt.theme_id = ANY(theme_ids)
    )
  )

  UNION ALL

  -- 3-2-1s
  SELECT
    tto.id,
    'three_two_one'::text,
    tto.training_title,
    tto.learnings[1],
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', th.id, 'name', th.name, 'slug', th.slug))
      FROM three_two_one_themes ttt
      JOIN themes th ON th.id = ttt.theme_id
      WHERE ttt.three_two_one_id = tto.id
    ), '[]'::jsonb)
  FROM three_two_one tto
  WHERE (
    search_term = ''
    OR tto.training_title ILIKE '%' || search_term || '%'
    OR EXISTS (SELECT 1 FROM unnest(tto.learnings) l WHERE l ILIKE '%' || search_term || '%')
  )
  AND (
    theme_ids IS NULL
    OR EXISTS (
      SELECT 1 FROM three_two_one_themes ttt
      WHERE ttt.three_two_one_id = tto.id AND ttt.theme_id = ANY(theme_ids)
    )
  )

  UNION ALL

  -- Takeovers
  SELECT
    tk.id,
    'takeover'::text,
    'Takeover: ' || to_char(tk.meeting_date, 'Mon DD, YYYY'),
    tk.top_learnings[1],
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
      FROM takeover_themes tt
      JOIN themes t ON t.id = tt.theme_id
      WHERE tt.takeover_id = tk.id
    ), '[]'::jsonb)
  FROM takeovers tk
  WHERE (
    search_term = ''
    OR EXISTS (SELECT 1 FROM unnest(tk.top_learnings) l WHERE l ILIKE '%' || search_term || '%')
  )
  AND (
    theme_ids IS NULL
    OR EXISTS (
      SELECT 1 FROM takeover_themes tt
      WHERE tt.takeover_id = tk.id AND tt.theme_id = ANY(theme_ids)
    )
  )

  LIMIT 30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
