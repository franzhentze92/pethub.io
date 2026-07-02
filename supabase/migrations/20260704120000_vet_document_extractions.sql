-- Veterinary document extractions (PDF / image parsing for lab results and invoices)

CREATE TABLE IF NOT EXISTS public.vet_document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.veterinary_sessions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_url text NOT NULL,
  document_type text NOT NULL DEFAULT 'lab_results',
  raw_text text,
  structured_data jsonb,
  summary text,
  parse_status text NOT NULL DEFAULT 'pending',
  parse_error text,
  parsed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vet_document_extractions_document_type_check
    CHECK (document_type IN ('lab_results', 'invoice')),
  CONSTRAINT vet_document_extractions_parse_status_check
    CHECK (parse_status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT vet_document_extractions_session_document_unique
    UNIQUE (session_id, document_url)
);

CREATE INDEX IF NOT EXISTS idx_vet_document_extractions_session
  ON public.vet_document_extractions (session_id);

CREATE INDEX IF NOT EXISTS idx_vet_document_extractions_owner
  ON public.vet_document_extractions (owner_id, created_at DESC);

ALTER TABLE public.vet_document_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own vet document extractions" ON public.vet_document_extractions;
CREATE POLICY "Users manage own vet document extractions"
  ON public.vet_document_extractions
  FOR ALL
  USING (owner_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_user());
