CREATE POLICY "rentals staff read lease docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lease-documents' AND public.has_permission(auth.uid(), 'rentals'));
CREATE POLICY "rentals staff upload lease docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lease-documents' AND public.has_permission(auth.uid(), 'rentals'));
CREATE POLICY "rentals staff update lease docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lease-documents' AND public.has_permission(auth.uid(), 'rentals'))
  WITH CHECK (bucket_id = 'lease-documents' AND public.has_permission(auth.uid(), 'rentals'));
CREATE POLICY "rentals staff delete lease docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lease-documents' AND public.has_permission(auth.uid(), 'rentals'));