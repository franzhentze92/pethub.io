-- Simple script to update user_profiles role constraint
-- Run this if the previous script gave you an error about constraint already existing

-- Step 1: Drop the constraint (ignore error if it doesn't exist)
DO $$ 
BEGIN
    ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_role_check;
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'Constraint does not exist, continuing...';
END $$;

-- Step 2: Create the new constraint with all valid roles
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('client', 'provider', 'shelter', 'admin', 'delivery') OR role IS NULL);

-- Verify the constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass
AND conname = 'user_profiles_role_check';

