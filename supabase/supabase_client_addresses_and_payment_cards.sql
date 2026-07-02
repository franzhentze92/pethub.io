-- Create table for client addresses
-- This allows clients to save multiple delivery addresses

CREATE TABLE IF NOT EXISTS public.client_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL, -- e.g., "Casa", "Trabajo", "Oficina"
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  delivery_instructions TEXT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false, -- Default address for quick checkout
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own addresses
CREATE POLICY "Users can view their own addresses"
ON public.client_addresses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own addresses
CREATE POLICY "Users can insert their own addresses"
ON public.client_addresses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own addresses
CREATE POLICY "Users can update their own addresses"
ON public.client_addresses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own addresses
CREATE POLICY "Users can delete their own addresses"
ON public.client_addresses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_addresses_user_id ON public.client_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_client_addresses_is_default ON public.client_addresses(user_id, is_default) WHERE is_default = true;

-- Create table for payment cards
-- This allows clients to save payment card information

CREATE TABLE IF NOT EXISTS public.payment_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL, -- e.g., "Tarjeta Principal", "Tarjeta de Trabajo"
  card_holder_name VARCHAR(255) NOT NULL,
  card_number_last_four VARCHAR(4) NOT NULL, -- Only store last 4 digits for security
  card_type VARCHAR(50) NOT NULL, -- e.g., "Visa", "Mastercard", "Amex"
  expiry_month INTEGER NOT NULL CHECK (expiry_month >= 1 AND expiry_month <= 12),
  expiry_year INTEGER NOT NULL CHECK (expiry_year >= 2024), -- Ensure not expired
  is_default BOOLEAN NOT NULL DEFAULT false, -- Default card for quick checkout
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.payment_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payment cards
CREATE POLICY "Users can view their own payment cards"
ON public.payment_cards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own payment cards
CREATE POLICY "Users can insert their own payment cards"
ON public.payment_cards FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own payment cards
CREATE POLICY "Users can update their own payment cards"
ON public.payment_cards FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own payment cards
CREATE POLICY "Users can delete their own payment cards"
ON public.payment_cards FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_cards_user_id ON public.payment_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_cards_is_default ON public.payment_cards(user_id, is_default) WHERE is_default = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at for client_addresses
CREATE TRIGGER update_client_addresses_updated_at 
  BEFORE UPDATE ON public.client_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for payment_cards
CREATE TRIGGER update_payment_cards_updated_at 
  BEFORE UPDATE ON public.payment_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

