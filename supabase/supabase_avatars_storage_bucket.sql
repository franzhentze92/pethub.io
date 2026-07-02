-- Create storage bucket for user avatars if it doesn't exist
-- This bucket will store profile pictures for all users (clients, providers, shelters, delivery, admin)

-- Create the bucket (this will fail silently if it already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;

-- Create RLS policy to allow authenticated users to upload avatars
-- The filename must start with the user's ID to ensure users can only upload files with their own ID
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (name LIKE auth.uid()::text || '-%' OR name LIKE auth.uid()::text || '.%')
);

-- Create RLS policy to allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (name LIKE auth.uid()::text || '-%' OR name LIKE auth.uid()::text || '.%')
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (name LIKE auth.uid()::text || '-%' OR name LIKE auth.uid()::text || '.%')
);

-- Create RLS policy to allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (name LIKE auth.uid()::text || '-%' OR name LIKE auth.uid()::text || '.%')
);

-- Create RLS policy to allow all authenticated users to view avatars (public bucket)
CREATE POLICY "Authenticated users can view avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%avatar%'
ORDER BY policyname;

