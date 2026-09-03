ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_listing_purpose_check;

UPDATE public.properties SET listing_purpose = 'for_sale' WHERE listing_purpose = 'sale';
UPDATE public.properties SET listing_purpose = 'for_rent' WHERE listing_purpose = 'rent';

ALTER TABLE public.properties
  ADD CONSTRAINT properties_listing_purpose_check
  CHECK (listing_purpose = ANY (ARRAY['for_sale','for_rent','sale_and_rent','rental_management','commercial','mixed']));

ALTER TABLE public.properties ALTER COLUMN listing_purpose SET DEFAULT 'for_sale';