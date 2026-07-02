-- Veterinary sessions: schema, legacy normalization, RLS and storage (idempotent)

CREATE TABLE IF NOT EXISTS public.veterinary_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_type text NOT NULL,
  date date NOT NULL,
  veterinarian_name text NOT NULL,
  veterinary_clinic text,
  diagnosis text NOT NULL DEFAULT '',
  treatment text,
  notes text,
  prescription text,
  follow_up_date date,
  follow_up_completed_at timestamptz,
  cost numeric,
  pdf_url text,
  invoice_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.veterinary_sessions
  ADD COLUMN IF NOT EXISTS veterinary_clinic text;

ALTER TABLE public.veterinary_sessions
  ADD COLUMN IF NOT EXISTS invoice_url text;

ALTER TABLE public.veterinary_sessions
  ADD COLUMN IF NOT EXISTS follow_up_completed_at timestamptz;

ALTER TABLE public.veterinary_sessions
  ADD COLUMN IF NOT EXISTS pdf_url text;

-- Normalize legacy appointment_type values to canonical Spanish slugs
UPDATE public.veterinary_sessions
SET appointment_type = CASE lower(trim(appointment_type))
  WHEN 'checkup' THEN 'consulta_general'
  WHEN 'consultation' THEN 'consulta_general'
  WHEN 'consulta' THEN 'consulta_general'
  WHEN 'general' THEN 'consulta_general'
  WHEN 'vaccination' THEN 'vacunacion'
  WHEN 'vaccine' THEN 'vacunacion'
  WHEN 'vacuna' THEN 'vacunacion'
  WHEN 'treatment' THEN 'otro'
  WHEN 'tratamiento' THEN 'otro'
  WHEN 'emergency' THEN 'emergencia'
  WHEN 'surgery' THEN 'cirugia'
  WHEN 'grooming' THEN 'aseo'
  WHEN 'dental' THEN 'cuidado_dental'
  WHEN 'follow-up' THEN 'revision_medica'
  WHEN 'followup' THEN 'revision_medica'
  WHEN 'revision' THEN 'revision_medica'
  WHEN 'other' THEN 'otro'
  ELSE appointment_type
END
WHERE lower(trim(appointment_type)) IN (
  'checkup', 'consultation', 'consulta', 'general',
  'vaccination', 'vaccine', 'vacuna',
  'treatment', 'tratamiento',
  'emergency', 'surgery', 'grooming', 'dental',
  'follow-up', 'followup', 'revision', 'other'
);

-- Coerce any remaining unknown values before adding CHECK constraint
UPDATE public.veterinary_sessions
SET appointment_type = 'otro'
WHERE lower(trim(appointment_type)) NOT IN (
  'consulta_general',
  'vacunacion',
  'revision_medica',
  'emergencia',
  'cirugia',
  'cuidado_dental',
  'aseo',
  'otro'
);

ALTER TABLE public.veterinary_sessions
  DROP CONSTRAINT IF EXISTS veterinary_sessions_appointment_type_check;

ALTER TABLE public.veterinary_sessions
  ADD CONSTRAINT veterinary_sessions_appointment_type_check
  CHECK (appointment_type IN (
    'consulta_general',
    'vacunacion',
    'revision_medica',
    'emergencia',
    'cirugia',
    'cuidado_dental',
    'aseo',
    'otro'
  ));

CREATE INDEX IF NOT EXISTS idx_veterinary_sessions_owner_date
  ON public.veterinary_sessions (owner_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_veterinary_sessions_pet_date
  ON public.veterinary_sessions (pet_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_veterinary_sessions_follow_up
  ON public.veterinary_sessions (owner_id, follow_up_date)
  WHERE follow_up_date IS NOT NULL AND follow_up_completed_at IS NULL;

ALTER TABLE public.veterinary_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own veterinary sessions" ON public.veterinary_sessions;
CREATE POLICY "Users manage own veterinary sessions"
  ON public.veterinary_sessions
  FOR ALL
  USING (owner_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS "Admin can view all veterinary sessions" ON public.veterinary_sessions;

-- Storage bucket for veterinary documents (PDFs, invoices, images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'veterinary-documents',
  'veterinary-documents',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own veterinary documents" ON storage.objects;
CREATE POLICY "Users can upload own veterinary documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'veterinary-documents'
    AND (name LIKE auth.uid()::text || '/%')
  );

DROP POLICY IF EXISTS "Users can update own veterinary documents" ON storage.objects;
CREATE POLICY "Users can update own veterinary documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'veterinary-documents'
    AND (name LIKE auth.uid()::text || '/%')
  )
  WITH CHECK (
    bucket_id = 'veterinary-documents'
    AND (name LIKE auth.uid()::text || '/%')
  );

DROP POLICY IF EXISTS "Users can delete own veterinary documents" ON storage.objects;
CREATE POLICY "Users can delete own veterinary documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'veterinary-documents'
    AND (name LIKE auth.uid()::text || '/%')
  );

DROP POLICY IF EXISTS "Authenticated users can view veterinary documents" ON storage.objects;
CREATE POLICY "Authenticated users can view veterinary documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'veterinary-documents');
