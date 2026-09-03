-- Run this once in the Supabase dashboard → SQL editor.
-- It is idempotent and does not touch existing property/unit/rental data.

-- 1. Audit trail -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read activity logs" ON public.activity_logs;
CREATE POLICY "Admins read activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff write own activity logs" ON public.activity_logs;
CREATE POLICY "Staff write own activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx
  ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_entity_idx
  ON public.activity_logs (entity, entity_id);

-- 2. Listing images -----------------------------------------------------------
-- The public website renders listing photos for anonymous visitors. With no
-- service-role key configured the app cannot mint signed URLs, so the bucket is
-- served publicly (read-only); writes stay restricted to authenticated staff.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('property-images', 'property-images', true, 10485760)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 10485760;

DROP POLICY IF EXISTS "Public read property images" ON storage.objects;
CREATE POLICY "Public read property images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "Staff upload property images" ON storage.objects;
CREATE POLICY "Staff upload property images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff update property images" ON storage.objects;
CREATE POLICY "Staff update property images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'property-images' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff delete property images" ON storage.objects;
CREATE POLICY "Staff delete property images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-images' AND public.is_staff(auth.uid()));
