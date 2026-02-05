-- Fix for: ERROR: type "user_type" does not exist (SQLSTATE 42704)
-- Run this in the Supabase SQL Editor

-- Step 1: Create the user_type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
        CREATE TYPE user_type AS ENUM ('staff', 'manager', 'admin');
        RAISE NOTICE 'Created user_type enum';
    ELSE
        RAISE NOTICE 'user_type enum already exists';
    END IF;
END
$$;

-- Step 2: Check if profiles table exists and update role column if needed
DO $$
DECLARE
    col_type TEXT;
BEGIN
    -- Get current type of role column
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role';

    IF col_type IS NULL THEN
        RAISE NOTICE 'profiles table or role column does not exist yet';
    ELSIF col_type = 'USER-DEFINED' THEN
        RAISE NOTICE 'role column already uses user_type enum';
    ELSIF col_type = 'text' OR col_type = 'character varying' THEN
        -- Convert text column to enum
        ALTER TABLE profiles
            ALTER COLUMN role TYPE user_type
            USING role::user_type;
        RAISE NOTICE 'Converted role column from % to user_type enum', col_type;
    ELSE
        RAISE NOTICE 'role column has unexpected type: %', col_type;
    END IF;
END
$$;

-- Step 3: Set default value for role column
ALTER TABLE profiles
    ALTER COLUMN role SET DEFAULT 'staff'::user_type;

-- Step 4: Recreate the profile trigger function with proper type casting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, created_at)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            INITCAP(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', ' '))
        ),
        'staff'::user_type,
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify the fix
SELECT
    'user_type enum values:' as check_type,
    string_agg(enumlabel, ', ') as result
FROM pg_enum
WHERE enumtypid = 'user_type'::regtype

UNION ALL

SELECT
    'profiles.role column type:',
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'role';
