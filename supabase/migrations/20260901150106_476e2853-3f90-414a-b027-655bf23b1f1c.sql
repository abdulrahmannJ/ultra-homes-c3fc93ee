-- ============ PROPERTIES: structure + listing purpose ============
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS structure text NOT NULL DEFAULT 'standalone',
  ADD COLUMN IF NOT EXISTS listing_purpose text NOT NULL DEFAULT 'for_sale';

UPDATE public.properties SET listing_purpose = CASE
  WHEN listing_type = 'rent' THEN 'for_rent'
  WHEN listing_type = 'lease' THEN 'for_lease'
  ELSE 'for_sale' END;

UPDATE public.properties p SET structure = 'multi_unit'
WHERE EXISTS (SELECT 1 FROM public.property_units u WHERE u.property_id = p.id);

ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_structure_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_structure_check
  CHECK (structure IN ('standalone','multi_unit'));
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_listing_purpose_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_listing_purpose_check
  CHECK (listing_purpose IN ('for_sale','for_rent','for_lease','rental_management','sale_and_rent','other'));

-- ============ PROPERTY_UNITS: full unit model ============
ALTER TABLE public.property_units
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS block text,
  ADD COLUMN IF NOT EXISTS bathrooms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS toilets integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS size_sqm numeric,
  ADD COLUMN IF NOT EXISTS sale_price numeric,
  ADD COLUMN IF NOT EXISTS deposit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS furnished boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parking_spaces integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

UPDATE public.property_units SET status = 'available' WHERE status = 'vacant';

ALTER TABLE public.property_units DROP CONSTRAINT IF EXISTS property_units_status_check;
ALTER TABLE public.property_units ADD CONSTRAINT property_units_status_check
  CHECK (status IN ('available','reserved','occupied','sold','maintenance','off_market'));

CREATE OR REPLACE FUNCTION public.sync_unit_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.property_units u
  SET status = CASE WHEN EXISTS (
      SELECT 1 FROM public.leases l WHERE l.unit_id = u.id AND l.status = 'active'
    ) THEN 'occupied'
    WHEN u.status IN ('sold','reserved','maintenance','off_market') THEN u.status
    ELSE 'available' END
  WHERE u.id = COALESCE(NEW.unit_id, OLD.unit_id);
  RETURN NULL;
END;
$$;

-- ============ IMAGE TABLES ============
CREATE TABLE IF NOT EXISTS public.property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  path text NOT NULL,
  alt text,
  sort_order integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.unit_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.property_units(id) ON DELETE CASCADE,
  path text NOT NULL,
  alt text,
  sort_order integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.property_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_images TO authenticated;
GRANT ALL ON public.property_images TO service_role;
GRANT SELECT ON public.unit_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_images TO authenticated;
GRANT ALL ON public.unit_images TO service_role;
GRANT SELECT ON public.property_units TO anon;

ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read property images" ON public.property_images
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p
                 WHERE p.id = property_id AND p.is_published AND NOT p.is_archived));

CREATE POLICY "staff manage property images" ON public.property_images
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "public read unit images" ON public.unit_images
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.property_units u
                 JOIN public.properties p ON p.id = u.property_id
                 WHERE u.id = unit_id AND u.is_published AND p.is_published AND NOT p.is_archived));

CREATE POLICY "staff manage unit images" ON public.unit_images
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "public read published units" ON public.property_units
  FOR SELECT TO anon, authenticated
  USING (is_published AND EXISTS (SELECT 1 FROM public.properties p
         WHERE p.id = property_id AND p.is_published AND NOT p.is_archived));

CREATE POLICY "properties staff manage units" ON public.property_units
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'properties'))
  WITH CHECK (public.has_permission(auth.uid(), 'properties'));

-- ============ BACKFILL PROPERTY GALLERY (non-destructive) ============
INSERT INTO public.property_images (property_id, path, sort_order, is_cover)
SELECT p.id, img.path, img.ord - 1,
       (p.featured_image IS NOT NULL AND p.featured_image = img.path)
FROM public.properties p
CROSS JOIN LATERAL unnest(p.images) WITH ORDINALITY AS img(path, ord)
WHERE NOT EXISTS (SELECT 1 FROM public.property_images pi WHERE pi.property_id = p.id);

UPDATE public.property_images pi SET is_cover = true
WHERE pi.sort_order = 0
  AND NOT EXISTS (SELECT 1 FROM public.property_images x
                  WHERE x.property_id = pi.property_id AND x.is_cover);

-- ============ INTEGRITY + INDEXES ============
CREATE UNIQUE INDEX IF NOT EXISTS leases_one_active_per_unit
  ON public.leases (unit_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_property_units_property ON public.property_units (property_id);
CREATE INDEX IF NOT EXISTS idx_property_units_status ON public.property_units (status);
CREATE INDEX IF NOT EXISTS idx_property_units_published ON public.property_units (is_published);
CREATE INDEX IF NOT EXISTS idx_property_images_property ON public.property_images (property_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_unit_images_unit ON public.unit_images (unit_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_leases_unit ON public.leases (unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON public.leases (tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases (status);
CREATE INDEX IF NOT EXISTS idx_rent_charges_lease ON public.rent_charges (lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_lease ON public.rent_payments (lease_id);
CREATE INDEX IF NOT EXISTS idx_properties_structure ON public.properties (structure);
CREATE INDEX IF NOT EXISTS idx_properties_published ON public.properties (is_published, is_archived);