ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS municipality text,
  ADD COLUMN IF NOT EXISTS department text;

COMMENT ON COLUMN public.providers.municipality IS 'Municipio del negocio (Guatemala)';
COMMENT ON COLUMN public.providers.department IS 'Departamento del negocio (Guatemala)';
