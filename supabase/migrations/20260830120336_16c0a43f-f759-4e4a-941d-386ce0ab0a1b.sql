CREATE POLICY "staff upload property images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND public.is_staff(auth.uid()));

CREATE POLICY "staff read property images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'property-images' AND public.is_staff(auth.uid()));

CREATE POLICY "staff update property images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'property-images' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'property-images' AND public.is_staff(auth.uid()));

CREATE POLICY "staff delete property images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'property-images' AND public.is_staff(auth.uid()));