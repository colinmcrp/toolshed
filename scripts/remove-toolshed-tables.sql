-- Migration: Remove Toolshed features from database
-- Run this in the Supabase SQL Editor (Database > SQL Editor)
-- This drops all Toolshed-specific tables, functions, and policies,
-- leaving only profiles and teams as the base schema.

-- ============================================
-- DROP RPC FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS global_search(text, uuid[]);
DROP FUNCTION IF EXISTS get_postcards_by_themes(text[]);
DROP FUNCTION IF EXISTS get_three_two_ones_by_themes(text[]);
DROP FUNCTION IF EXISTS get_takeovers_by_themes(text[]);

-- ============================================
-- DROP JUNCTION TABLES (depends on parent tables, drop first)
-- ============================================

DROP TABLE IF EXISTS public.postcard_themes CASCADE;
DROP TABLE IF EXISTS public.three_two_one_themes CASCADE;
DROP TABLE IF EXISTS public.takeover_themes CASCADE;

-- ============================================
-- DROP FEATURE TABLES
-- ============================================

DROP TABLE IF EXISTS public.postcards CASCADE;
DROP TABLE IF EXISTS public.three_two_one CASCADE;
DROP TABLE IF EXISTS public.takeovers CASCADE;
DROP TABLE IF EXISTS public.themes CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================

-- Confirm only profiles and teams remain
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
