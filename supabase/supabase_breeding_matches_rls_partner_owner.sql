-- Fix: recipients (partner_owner_id) must see received breeding requests

DROP POLICY IF EXISTS "Users manage own breeding matches" ON public.breeding_matches;
DROP POLICY IF EXISTS "Admin can view all breeding matches" ON public.breeding_matches;
DROP POLICY IF EXISTS "Users can view their own breeding matches" ON public.breeding_matches;
DROP POLICY IF EXISTS "breeding_matches_select_parties" ON public.breeding_matches;
DROP POLICY IF EXISTS "breeding_matches_insert_requester" ON public.breeding_matches;
DROP POLICY IF EXISTS "breeding_matches_update_parties" ON public.breeding_matches;
DROP POLICY IF EXISTS "breeding_matches_delete_parties" ON public.breeding_matches;

ALTER TABLE public.breeding_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "breeding_matches_select_parties"
ON public.breeding_matches FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR partner_owner_id = auth.uid()
  OR (SELECT is_admin_user()) IS TRUE
);

CREATE POLICY "breeding_matches_insert_requester"
ON public.breeding_matches FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "breeding_matches_update_parties"
ON public.breeding_matches FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR partner_owner_id = auth.uid()
  OR (SELECT is_admin_user()) IS TRUE
)
WITH CHECK (
  owner_id = auth.uid()
  OR partner_owner_id = auth.uid()
  OR (SELECT is_admin_user()) IS TRUE
);

CREATE POLICY "breeding_matches_delete_parties"
ON public.breeding_matches FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
  OR partner_owner_id = auth.uid()
  OR (SELECT is_admin_user()) IS TRUE
);
