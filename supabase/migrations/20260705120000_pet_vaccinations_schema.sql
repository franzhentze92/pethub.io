-- Structured pet vaccinations + reference catalog (idempotent)

CREATE TABLE IF NOT EXISTS public.vaccine_catalog (
  slug text PRIMARY KEY,
  name text NOT NULL,
  species text[] NOT NULL,
  interval_months integer NOT NULL DEFAULT 12,
  description text,
  is_core boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.vaccine_catalog (slug, name, species, interval_months, description, is_core, sort_order)
VALUES
  ('rabies', 'Antirrábica', ARRAY['dog', 'cat'], 12, 'Vacuna antirrábica obligatoria anual.', true, 10),
  ('dhpp', 'Quintuple (DHPP)', ARRAY['dog'], 12, 'Distemper, hepatitis, parvovirus y parainfluenza.', true, 20),
  ('bordetella', 'Bordetella', ARRAY['dog'], 12, 'Tos de las perreras.', false, 30),
  ('leptospirosis', 'Leptospirosis', ARRAY['dog'], 12, 'Protección contra leptospira.', false, 40),
  ('fvrcp', 'Triple Felina (FVRCP)', ARRAY['cat'], 12, 'Rinotraqueítis, calicivirus y panleucopenia.', true, 20),
  ('felv', 'Leucemia Felina (FeLV)', ARRAY['cat'], 12, 'Vacuna contra virus de leucemia felina.', false, 30),
  ('deworming', 'Desparasitación', ARRAY['dog', 'cat'], 3, 'Control antiparasitario interno.', false, 50),
  ('other', 'Otra vacuna', ARRAY['dog', 'cat', 'bird', 'other'], 12, 'Vacuna personalizada.', false, 99)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  species = EXCLUDED.species,
  interval_months = EXCLUDED.interval_months,
  description = EXCLUDED.description,
  is_core = EXCLUDED.is_core,
  sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS public.pet_vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vaccine_slug text REFERENCES public.vaccine_catalog(slug),
  vaccine_name text NOT NULL,
  administered_at date NOT NULL,
  next_due_date date,
  batch_number text,
  veterinarian_name text,
  veterinary_clinic text,
  session_id uuid REFERENCES public.veterinary_sessions(id) ON DELETE SET NULL,
  notes text,
  reminder_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_pet_date
  ON public.pet_vaccinations (pet_id, administered_at DESC);

CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_owner
  ON public.pet_vaccinations (owner_id);

CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_next_due
  ON public.pet_vaccinations (owner_id, next_due_date)
  WHERE next_due_date IS NOT NULL AND reminder_completed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pet_vaccinations_session_unique
  ON public.pet_vaccinations (session_id)
  WHERE session_id IS NOT NULL;

-- Backfill from legacy vaccination visits (one row per session)
INSERT INTO public.pet_vaccinations (
  pet_id,
  owner_id,
  vaccine_slug,
  vaccine_name,
  administered_at,
  next_due_date,
  veterinarian_name,
  veterinary_clinic,
  session_id,
  notes,
  reminder_completed_at
)
SELECT
  vs.pet_id,
  vs.owner_id,
  CASE
    WHEN lower(coalesce(vs.diagnosis, '')) ~ '(antirr[aá]bica|rabia|rabies)' THEN 'rabies'
    WHEN lower(coalesce(vs.diagnosis, '')) ~ '(dhpp|quintuple|pentavalente|polivalente)' THEN 'dhpp'
    WHEN lower(coalesce(vs.diagnosis, '')) ~ 'bordetella' THEN 'bordetella'
    WHEN lower(coalesce(vs.diagnosis, '')) ~ 'leptospir' THEN 'leptospirosis'
    WHEN lower(coalesce(vs.diagnosis, '')) ~ '(fvrcp|triple felina|triple)' THEN 'fvrcp'
    WHEN lower(coalesce(vs.diagnosis, '')) ~ '(felv|leucemia)' THEN 'felv'
    WHEN lower(coalesce(vs.diagnosis, '')) ~ 'desparasit' THEN 'deworming'
    ELSE NULL
  END,
  COALESCE(NULLIF(trim(vs.diagnosis), ''), 'Vacunación'),
  vs.date,
  COALESCE(vs.follow_up_date, (vs.date + interval '12 months')::date),
  vs.veterinarian_name,
  vs.veterinary_clinic,
  vs.id,
  vs.notes,
  vs.follow_up_completed_at
FROM public.veterinary_sessions vs
WHERE (lower(trim(vs.appointment_type)) IN ('vacunacion')
   OR lower(trim(vs.appointment_type)) LIKE '%vacun%')
  AND NOT EXISTS (
    SELECT 1 FROM public.pet_vaccinations pv WHERE pv.session_id = vs.id
  );

ALTER TABLE public.vaccine_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_vaccinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read vaccine catalog" ON public.vaccine_catalog;
CREATE POLICY "Authenticated users can read vaccine catalog"
  ON public.vaccine_catalog
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users manage own pet vaccinations" ON public.pet_vaccinations;
CREATE POLICY "Users manage own pet vaccinations"
  ON public.pet_vaccinations
  FOR ALL
  USING (owner_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin_user());
