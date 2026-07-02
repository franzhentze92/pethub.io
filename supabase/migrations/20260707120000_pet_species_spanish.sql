-- Normaliza especies de mascotas de inglés a español en tablas de usuario
UPDATE public.pets
SET species = CASE lower(trim(species))
  WHEN 'dog' THEN 'Perro'
  WHEN 'cat' THEN 'Gato'
  WHEN 'bird' THEN 'Ave'
  WHEN 'fish' THEN 'Pez'
  WHEN 'rabbit' THEN 'Conejo'
  WHEN 'other' THEN 'Otro'
  ELSE species
END
WHERE species IS NOT NULL
  AND lower(trim(species)) IN ('dog', 'cat', 'bird', 'fish', 'rabbit', 'other');

UPDATE public.adoption_pets
SET species = CASE lower(trim(species))
  WHEN 'dog' THEN 'Perro'
  WHEN 'cat' THEN 'Gato'
  WHEN 'bird' THEN 'Ave'
  WHEN 'fish' THEN 'Pez'
  WHEN 'rabbit' THEN 'Conejo'
  WHEN 'other' THEN 'Otro'
  ELSE species
END
WHERE species IS NOT NULL
  AND lower(trim(species)) IN ('dog', 'cat', 'bird', 'fish', 'rabbit', 'other');

UPDATE public.lost_pets
SET species = CASE lower(trim(species))
  WHEN 'dog' THEN 'Perro'
  WHEN 'cat' THEN 'Gato'
  WHEN 'bird' THEN 'Ave'
  WHEN 'fish' THEN 'Pez'
  WHEN 'rabbit' THEN 'Conejo'
  WHEN 'other' THEN 'Otro'
  ELSE species
END
WHERE species IS NOT NULL
  AND lower(trim(species)) IN ('dog', 'cat', 'bird', 'fish', 'rabbit', 'other');

COMMENT ON COLUMN public.pets.species IS 'Especie en español: Perro, Gato, Ave, Pez, Conejo, Otro';
