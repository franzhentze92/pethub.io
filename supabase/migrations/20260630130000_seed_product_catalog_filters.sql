-- Backfill catalog filter fields for all active marketplace products
-- Run after 20260630120000_product_catalog_filters.sql

UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'arnes', life_stage = NULL WHERE id = '927f4d3c-7e1b-47ef-8bda-b9cc11af5b3f';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'collar', life_stage = NULL WHERE id = 'd5fcf82a-cda5-4127-9bf2-cc4a1100ee09';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'correa', life_stage = NULL WHERE id = '1d8ea66b-93e0-4401-9669-301906a28b46';
UPDATE provider_products SET target_species = ARRAY['todos']::text[], product_subtype = 'plato', life_stage = NULL WHERE id = 'b86c4aad-c3b2-430f-a090-5eabb2825cbb';

UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'seco', life_stage = 'adulto' WHERE id = '98ccfe3b-c877-42bc-a0a1-787f91bb8032';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'prescripcion', life_stage = 'adulto' WHERE id = '6111023f-27dd-40da-bbe7-27a7778304e5';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'seco', life_stage = 'adulto' WHERE id = '6be9b545-beff-4123-8fdf-8759580067be';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'seco', life_stage = 'adulto' WHERE id = '54e6793d-9439-4c44-9fbc-e673e9679e3b';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'premio', life_stage = 'adulto' WHERE id = '1131d60e-d25b-4d10-a272-bf589eb5b21d';

UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'colchon', life_stage = NULL WHERE id = 'bc1a66c0-04da-4319-a2eb-088a919836d5';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'colchon', life_stage = NULL WHERE id = '3c2f5e40-d7e3-4060-bf4b-b80525498954';
UPDATE provider_products SET target_species = ARRAY['gato']::text[], product_subtype = 'cucha', life_stage = NULL WHERE id = '2e97cd8e-c2fd-47e0-ba1f-a068bf9d5358';
UPDATE provider_products SET target_species = ARRAY['todos']::text[], product_subtype = 'funda', life_stage = NULL WHERE id = '57dbf26c-3727-4c48-8752-adfc5a677f4e';

UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'cepillo', life_stage = NULL WHERE id = '200ee9ae-c087-416d-a77a-27aaae2b423f';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'dental', life_stage = NULL WHERE id = '6ef3b224-633b-473f-90c0-d53a8f8b6e88';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'bano', life_stage = NULL WHERE id = '3e5c9338-5d8c-455d-920a-d4668152f941';
UPDATE provider_products SET target_species = ARRAY['todos']::text[], product_subtype = 'toallitas', life_stage = NULL WHERE id = '94a8667d-5c54-4184-93b4-f1b25018760e';

UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'mordedor', life_stage = NULL WHERE id = 'a02e4798-943f-493d-ad37-c7b5f3bbf739';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'pelota', life_stage = NULL WHERE id = 'abe006dd-fa83-4805-aeb4-94df1d109502';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'mordedor', life_stage = NULL WHERE id = '9d68012d-c3ab-4d88-a8e3-36daca60cd06';
UPDATE provider_products SET target_species = ARRAY['gato']::text[], product_subtype = 'peluche', life_stage = NULL WHERE id = 'fb694d48-823c-41cc-ad72-4767eeeb1cbd';

UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'antipulgas', life_stage = 'adulto' WHERE id = '3ecb17b8-ac9c-4373-91e4-ff3da1b131c2';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'prescripcion', life_stage = 'adulto' WHERE id = '0132f069-97ac-48be-8285-a971cb0c3b37';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'antipulgas', life_stage = 'adulto' WHERE id = '60da69fe-c27d-4548-a111-b1e43ea6d5f6';
UPDATE provider_products SET target_species = ARRAY['perro','gato']::text[], product_subtype = 'vitaminas', life_stage = 'adulto' WHERE id = '0d49bdb4-82be-4a98-8e0e-ff1e9e89783f';

UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = NULL, life_stage = 'cachorro' WHERE id = 'c5bb99d2-ba85-406f-a3b8-5f81f1b5a37b';
UPDATE provider_products SET target_species = ARRAY['todos']::text[], product_subtype = NULL, life_stage = NULL WHERE id = '49915e63-a16a-4c8b-ab57-b6cf58664bf9';
UPDATE provider_products SET target_species = ARRAY['todos']::text[], product_subtype = NULL, life_stage = NULL WHERE id = '0ec7d01a-fe16-4bd0-81b2-9bfad6afb8a4';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = NULL, life_stage = NULL WHERE id = '4631aeba-02fb-40f8-82dd-6daf2dace26e';

UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = NULL, life_stage = NULL WHERE id = '83844cf8-6bd6-417f-ab5c-533043cf9738';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = NULL, life_stage = NULL WHERE id = '68762c48-14a8-4d69-ac77-189ee570c1bc';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = NULL, life_stage = NULL WHERE id = '6d587111-ba29-4a88-adcf-386de2613c92';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = NULL, life_stage = NULL WHERE id = '21074840-008b-4717-98dd-c87707bcf14c';

UPDATE provider_products SET target_species = ARRAY['gato']::text[], product_subtype = 'bolsa', life_stage = NULL WHERE id = '27ed376f-ea45-4ead-8149-2a3eb62eb9ba';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'coche', life_stage = NULL WHERE id = 'e4138719-e8aa-4721-b819-91741c8a697c';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'carrier', life_stage = NULL WHERE id = '3b4c3d8b-69a8-4148-b6ad-83360bb27c69';
UPDATE provider_products SET target_species = ARRAY['perro']::text[], product_subtype = 'rampa', life_stage = NULL WHERE id = '47d04e09-896d-46d5-a8e3-7a3abd01a7fe';
