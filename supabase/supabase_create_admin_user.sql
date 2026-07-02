-- Script para crear el usuario administrador
-- Ejecuta este script en el SQL Editor de Supabase

-- Nota: Este script crea el usuario admin directamente en auth.users
-- La contraseña será: Pethub123!!

-- Primero, necesitas crear el usuario usando la función de Supabase
-- Esto se hace mejor desde el Dashboard de Supabase > Authentication > Users > Add User
-- O usando la API de Supabase

-- Alternativamente, puedes usar este script para crear el usuario si tienes permisos de superusuario:

-- Insertar usuario en auth.users (requiere permisos de superusuario)
-- IMPORTANTE: Esto solo funciona si tienes acceso directo a la base de datos
-- La forma recomendada es crear el usuario desde el Dashboard de Supabase

-- Opción 1: Crear usuario desde el Dashboard de Supabase
-- 1. Ve a Authentication > Users
-- 2. Click en "Add User" o "Invite User"
-- 3. Email: admin@pethubgt.com
-- 4. Password: Pethub123!!
-- 5. Auto Confirm: Sí (para que no necesite confirmar email)
-- 6. Click en "Create User"

-- Opción 2: Usar este script SQL (solo si tienes permisos de superusuario)
-- NOTA: Esto puede no funcionar dependiendo de la configuración de RLS y permisos

-- Crear el usuario admin (esto requiere permisos especiales)
-- INSERT INTO auth.users (
--   instance_id,
--   id,
--   aud,
--   role,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   confirmation_token,
--   email_change,
--   email_change_token_new,
--   recovery_token
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'admin@pethubgt.com',
--   crypt('Pethub123!!', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW(),
--   '',
--   '',
--   '',
--   ''
-- );

-- La forma más fácil es usar el Dashboard de Supabase o la API REST
-- Aquí está el comando curl que puedes usar:

/*
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/auth/v1/admin/users' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pethubgt.com",
    "password": "Pethub123!!",
    "email_confirm": true,
    "user_metadata": {
      "role": "admin"
    }
  }'
*/

-- Después de crear el usuario, crear el perfil en user_profiles
-- Esto se ejecutará automáticamente cuando el usuario inicie sesión por primera vez
-- Pero puedes crearlo manualmente:

-- Primero necesitas obtener el user_id del usuario creado
-- SELECT id FROM auth.users WHERE email = 'admin@pethubgt.com';

-- Luego crear el perfil (reemplaza USER_ID con el ID obtenido arriba)
/*
INSERT INTO public.user_profiles (
  user_id,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  'USER_ID_AQUI', -- Reemplaza con el ID del usuario
  'Administrador',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO NOTHING;
*/

-- ============================================
-- INSTRUCCIONES PARA CREAR EL USUARIO ADMIN
-- ============================================
-- 
-- OPCIÓN 1: Crear desde el Dashboard de Supabase (RECOMENDADO)
-- -------------------------------------------------------------
-- 1. Ve al Dashboard de Supabase: https://app.supabase.com
-- 2. Selecciona tu proyecto
-- 3. Ve a Authentication > Users
-- 4. Click en "Add User" o el botón "+"
-- 5. Completa el formulario:
--    - Email: admin@pethubgt.com
--    - Password: Pethub123!!
--    - Auto Confirm Email: ✅ (marca esta casilla)
-- 6. Click en "Create User"
-- 7. El usuario estará listo para usar
--
-- OPCIÓN 2: Registrarse desde la aplicación
-- -------------------------------------------
-- 1. Ve a la página de registro: /register
-- 2. Completa el formulario:
--    - Nombre: Administrador
--    - Apellido: PetHub
--    - Email: admin@pethubgt.com
--    - Contraseña: Pethub123!!
--    - Confirmar Contraseña: Pethub123!!
--    - Tipo de Cuenta: Puedes seleccionar cualquiera (se asignará admin automáticamente)
-- 3. Acepta los términos y condiciones
-- 4. Click en "Crear Cuenta"
-- 5. El sistema automáticamente detectará el email admin y asignará el rol de administrador
-- 6. Si tu proyecto tiene confirmación de email habilitada, revisa tu correo y confirma
-- 7. Si tienes auto-confirmación habilitada, podrás iniciar sesión inmediatamente
--
-- NOTA: Después de crear el usuario, el perfil se creará automáticamente cuando inicies sesión
-- por primera vez. El rol 'admin' se asignará automáticamente si el email es admin@pethubgt.com

