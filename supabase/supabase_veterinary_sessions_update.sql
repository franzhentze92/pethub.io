-- Add new columns to veterinary_sessions table
-- Run this script in Supabase SQL Editor

-- Add veterinary_clinic column (name of the veterinary clinic)
-- This column allows users to specify which veterinary clinic they visited
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'veterinary_sessions' 
    AND column_name = 'veterinary_clinic'
  ) THEN
    ALTER TABLE veterinary_sessions 
    ADD COLUMN veterinary_clinic TEXT;
    
    COMMENT ON COLUMN veterinary_sessions.veterinary_clinic IS 'Nombre de la veterinaria o clínica donde se realizó la visita';
  END IF;
END $$;

-- Add invoice_url column (URL to the invoice/bill document)
-- This column stores the URL of the uploaded invoice/bill
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'veterinary_sessions' 
    AND column_name = 'invoice_url'
  ) THEN
    ALTER TABLE veterinary_sessions 
    ADD COLUMN invoice_url TEXT;
    
    COMMENT ON COLUMN veterinary_sessions.invoice_url IS 'URL del archivo de factura subido (PDF o imagen)';
  END IF;
END $$;

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'veterinary_sessions'
  AND column_name IN ('veterinary_clinic', 'invoice_url')
ORDER BY column_name;

