-- PetHub Admin (hentzefranz92@gmail.com) read access across platform data

CREATE OR REPLACE FUNCTION is_pethub_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();

  RETURN LOWER(COALESCE(user_email, '')) = LOWER('hentzefranz92@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_pethub_admin_user() TO authenticated;

-- Helper macro pattern: admin SELECT policy per table
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'orders',
    'order_items',
    'order_item_pets',
    'pets',
    'adoption_pets',
    'breeding_matches',
    'lost_pets',
    'client_addresses',
    'user_profiles',
    'service_appointments'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "PetHub admin can view all %I" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "PetHub admin can view all %1$I"
       ON public.%1$I
       FOR SELECT
       TO authenticated
       USING (is_pethub_admin_user() IS TRUE)',
      tbl
    );
  END LOOP;
END $$;
