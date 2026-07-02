-- Auto-confirm email on signup
-- This trigger automatically confirms the email when a user signs up
-- Useful for development/testing environments

-- Function to auto-confirm email on user creation
CREATE OR REPLACE FUNCTION auto_confirm_email_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- If email is not confirmed, confirm it immediately
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
    NEW.updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_confirm_email_on_signup ON auth.users;

-- Create trigger on auth.users table BEFORE INSERT
-- This ensures the email is confirmed before the user record is created
CREATE TRIGGER trigger_auto_confirm_email_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_email_on_signup();

-- Alternative approach: Auto-confirm on UPDATE if email_confirmed_at is NULL
-- This handles cases where the user is created but email is not confirmed
CREATE OR REPLACE FUNCTION auto_confirm_email_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If email_confirmed_at is NULL, set it to now
  IF NEW.email_confirmed_at IS NULL AND OLD.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
    NEW.updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_confirm_email_on_update ON auth.users;

-- Create trigger on auth.users table BEFORE UPDATE
CREATE TRIGGER trigger_auto_confirm_email_on_update
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NULL)
  EXECUTE FUNCTION auto_confirm_email_on_update();

-- Note: This will auto-confirm all new user signups
-- For production, you may want to:
-- 1. Remove these triggers
-- 2. Or add a condition to only auto-confirm in development
-- 3. Or configure Supabase project settings to disable email confirmation requirement

-- To disable email confirmation requirement in Supabase Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Under "Email Auth", disable "Enable email confirmations"
-- 3. Save changes

