CREATE POLICY "status media owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'status-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "status media owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'status-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "status media queue read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'status-media'
    AND public.shares_conversation(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );