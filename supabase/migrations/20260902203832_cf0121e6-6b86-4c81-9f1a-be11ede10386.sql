ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS grace_days integer NOT NULL DEFAULT 5;

ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS leases_grace_days_check;
ALTER TABLE public.leases
  ADD CONSTRAINT leases_grace_days_check CHECK (grace_days >= 0 AND grace_days <= 31);

UPDATE public.properties SET listing_purpose = 'for_sale' WHERE listing_purpose IN ('sale');
UPDATE public.properties SET listing_purpose = 'for_rent' WHERE listing_purpose IN ('rent');
UPDATE public.properties SET listing_purpose = 'for_sale'
  WHERE listing_purpose IS NULL
     OR listing_purpose NOT IN ('for_sale','for_rent','sale_and_rent','rental_management','commercial','mixed');

ALTER TABLE public.properties ALTER COLUMN listing_purpose SET DEFAULT 'for_sale';
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_listing_purpose_check;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_listing_purpose_check
  CHECK (listing_purpose IN ('for_sale','for_rent','sale_and_rent','rental_management','commercial','mixed'));

UPDATE public.leases SET status = 'active' WHERE status NOT IN ('pending','active','ended','terminated');
ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS leases_status_check;
ALTER TABLE public.leases
  ADD CONSTRAINT leases_status_check CHECK (status IN ('pending','active','ended','terminated'));