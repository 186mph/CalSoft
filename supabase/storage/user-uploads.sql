-- Create a storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create a folder structure for profile images
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES ('user-uploads', 'profile-images/', auth.uid(), '{"isFolder": true}')
ON CONFLICT (bucket_id, name) DO NOTHING;

-- Set up security policies for the user-uploads bucket
CREATE POLICY "Public profiles are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-uploads' AND LOWER(name) LIKE 'profile-images/%');

CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-uploads' 
  AND LOWER(name) LIKE 'profile-images/%'
  AND (SPLIT_PART(name, '_', 1) = auth.uid()::text)
);

CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-uploads' 
  AND LOWER(name) LIKE 'profile-images/%'
  AND (SPLIT_PART(name, '_', 1) = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'user-uploads' 
  AND LOWER(name) LIKE 'profile-images/%'
  AND (SPLIT_PART(name, '_', 1) = auth.uid()::text)
);

CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-uploads' 
  AND LOWER(name) LIKE 'profile-images/%'
  AND (SPLIT_PART(name, '_', 1) = auth.uid()::text)
); 