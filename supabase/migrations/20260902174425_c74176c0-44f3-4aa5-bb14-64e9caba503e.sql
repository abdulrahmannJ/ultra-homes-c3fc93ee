ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS grace_days integer NOT NULL DEFAULT 5;

UPDATE public.properties
SET listing_purpose = 'sale'
WHERE listing_purpose IS NULL
   OR listing_purpose NOT IN ('sale','rent','sale_and_rent','rental_management','commercial','mixed');

ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_listing_purpose_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_listing_purpose_check
  CHECK (listing_purpose IN ('sale','rent','sale_and_rent','rental_management','commercial','mixed'));