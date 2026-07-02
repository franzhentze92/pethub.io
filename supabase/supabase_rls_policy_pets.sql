-- RLS Policy for Pets Table
-- This policy allows users to read pets from other users when available_for_breeding is true

-- First, ensure RLS is enabled on the pets table
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (optional, for updates)
DROP POLICY IF EXISTS "Users can read pets available for breeding" ON pets;

-- Create policy to allow reading pets from other users when available_for_breeding is true
CREATE POLICY "Users can read pets available for breeding"
ON pets
FOR SELECT
USING (
  -- Users can always see their own pets
  owner_id = auth.uid()
  OR
  -- Users can see pets from other users if available_for_breeding is true
  (available_for_breeding = true AND owner_id != auth.uid())
);

-- Also ensure users can read their own pets (this might already exist)
DROP POLICY IF EXISTS "Users can read their own pets" ON pets;

CREATE POLICY "Users can read their own pets"
ON pets
FOR SELECT
USING (owner_id = auth.uid());

