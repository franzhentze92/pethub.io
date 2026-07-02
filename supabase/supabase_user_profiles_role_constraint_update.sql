-- Update user_profiles role constraint to include 'delivery' and 'admin'
-- This script removes the existing check constraint and creates a new one with all valid roles

-- Step 1: Drop the existing constraint (this will fail silently if it doesn't exist)
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Step 2: Find and drop any other check constraints on the role column
DO $$ 
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Find check constraints that reference the role column
    FOR constraint_name_var IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
        AND tc.table_name = 'user_profiles'
        AND tc.constraint_type = 'CHECK'
        AND ccu.column_name = 'role'
    LOOP
        EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name_var);
        RAISE NOTICE 'Dropped constraint: %', constraint_name_var;
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in constraint cleanup: %', SQLERRM;
END $$;

-- Step 3: Now create the new constraint with all valid roles
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('client', 'provider', 'shelter', 'admin', 'delivery') OR role IS NULL);

-- Verify the constraint was created
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass
AND conname = 'user_profiles_role_check';

-- Test: Try to insert/update with delivery role (this should work now)
-- Uncomment the following to test:
-- UPDATE public.user_profiles 
-- SET role = 'delivery' 
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'delivery@pethubgt.com' LIMIT 1);

