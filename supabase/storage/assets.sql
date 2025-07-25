-- Create a storage bucket for assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the assets bucket
CREATE POLICY "Assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

CREATE POLICY "Users can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets' AND auth.uid() = owner);

CREATE POLICY "Users can update their own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'assets' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'assets' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assets' AND auth.uid() = owner); 