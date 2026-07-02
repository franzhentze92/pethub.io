-- Auto-verify providers and shelters when user confirms their email
-- This trigger automatically sets is_verified to true when email_confirmed_at is set

-- Function to update provider is_verified when email is confirmed
CREATE OR REPLACE FUNCTION auto_verify_provider_on_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email was just confirmed (email_confirmed_at changed from NULL to NOT NULL)
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    -- Update providers table to set is_verified = true for this user
    UPDATE public.providers
    SET is_verified = true,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = NEW.id
      AND is_verified = false; -- Only update if currently not verified
    
    -- Log the update (optional, for debugging)
    RAISE NOTICE 'Auto-verified provider for user % after email confirmation', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_verify_provider_on_email_confirmation ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER trigger_auto_verify_provider_on_email_confirmation
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at))
  EXECUTE FUNCTION auto_verify_provider_on_email_confirmation();

-- Note: If shelters table also needs is_verified, add similar trigger
-- For now, only providers table has is_verified field
-- If shelters table has is_verified, uncomment and adjust the following:
/*
-- Function to update shelter is_verified when email is confirmed
CREATE OR REPLACE FUNCTION auto_verify_shelter_on_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    UPDATE public.shelters
    SET is_verified = true,
        updated_at = timezone('utc'::text, now())
    WHERE owner_id = NEW.id
      AND (is_verified = false OR is_verified IS NULL);
    
    RAISE NOTICE 'Auto-verified shelter for user % after email confirmation', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_verify_shelter_on_email_confirmation
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at))
  EXECUTE FUNCTION auto_verify_shelter_on_email_confirmation();
*/

-- Alternative: Handle initial email confirmation (INSERT case)
-- This handles the case when a user signs up and immediately confirms
CREATE OR REPLACE FUNCTION auto_verify_on_initial_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- If email is confirmed from the start
  IF NEW.email_confirmed_at IS NOT NULL THEN
    -- Update providers
    UPDATE public.providers
    SET is_verified = true,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = NEW.id
      AND (is_verified = false OR is_verified IS NULL);
    
    -- Note: If shelters table has is_verified, add update here
    -- UPDATE public.shelters
    -- SET is_verified = true,
    --     updated_at = timezone('utc'::text, now())
    -- WHERE owner_id = NEW.id
    --   AND (is_verified = false OR is_verified IS NULL);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_verify_on_initial_email_confirmation ON auth.users;

-- Create trigger for initial email confirmation
CREATE TRIGGER trigger_auto_verify_on_initial_email_confirmation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION auto_verify_on_initial_email_confirmation();

-- Grant necessary permissions
-- The functions use SECURITY DEFINER so they run with the privileges of the function owner
-- Make sure the function owner (usually postgres or the database owner) has UPDATE privileges
-- on providers and shelters tables

-- Test query to verify the triggers are working (run manually after testing):
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_name LIKE '%auto_verify%';

