CREATE POLICY "members read conversation media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-media'
  AND public.is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "members upload conversation media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-media'
  AND owner = auth.uid()
  AND public.is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "owners delete conversation media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'message-media'
  AND owner = auth.uid()
);