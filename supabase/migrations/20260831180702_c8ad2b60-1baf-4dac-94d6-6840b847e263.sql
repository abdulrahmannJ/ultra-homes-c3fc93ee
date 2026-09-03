-- 1. Property units
CREATE TABLE public.property_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  label text NOT NULL,
  floor text,
  bedrooms integer NOT NULL DEFAULT 0,
  bathrooms integer NOT NULL DEFAULT 0,
  size_sqft integer,
  monthly_rent numeric NOT NULL DEFAULT 0,
  deposit numeric NOT NULL DEFAULT 0,
  rent_due_day integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'vacant',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_units TO authenticated;
GRANT ALL ON public.property_units TO service_role;
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rentals staff manage units" ON public.property_units FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'rentals')) WITH CHECK (public.has_permission(auth.uid(), 'rentals'));
CREATE TRIGGER property_units_updated BEFORE UPDATE ON public.property_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX property_units_property_idx ON public.property_units(property_id);

-- 2. Tenants
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text,
  id_number text,
  emergency_name text,
  emergency_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rentals staff manage tenants" ON public.tenants FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'rentals')) WITH CHECK (public.has_permission(auth.uid(), 'rentals'));
CREATE TRIGGER tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Leases
CREATE TABLE public.leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.property_units(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  monthly_rent numeric NOT NULL DEFAULT 0,
  deposit numeric NOT NULL DEFAULT 0,
  rent_due_day integer NOT NULL DEFAULT 1,
  contract_url text,
  document_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  move_out_date date,
  move_out_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leases TO authenticated;
GRANT ALL ON public.leases TO service_role;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rentals staff manage leases" ON public.leases FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'rentals')) WITH CHECK (public.has_permission(auth.uid(), 'rentals'));
CREATE TRIGGER leases_updated BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX leases_unit_idx ON public.leases(unit_id);
CREATE UNIQUE INDEX leases_one_active_per_unit ON public.leases(unit_id) WHERE status = 'active';

-- 4. Rent charges
CREATE TABLE public.rent_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.property_units(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lease_id, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rent_charges TO authenticated;
GRANT ALL ON public.rent_charges TO service_role;
ALTER TABLE public.rent_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rentals staff manage charges" ON public.rent_charges FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'rentals')) WITH CHECK (public.has_permission(auth.uid(), 'rentals'));
CREATE INDEX rent_charges_lease_idx ON public.rent_charges(lease_id);

-- 5. Payments
CREATE TABLE public.rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.property_units(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  method text NOT NULL DEFAULT 'mpesa',
  reference text,
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rent_payments TO authenticated;
GRANT ALL ON public.rent_payments TO service_role;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rentals staff manage payments" ON public.rent_payments FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'rentals')) WITH CHECK (public.has_permission(auth.uid(), 'rentals'));
CREATE TRIGGER rent_payments_updated BEFORE UPDATE ON public.rent_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX rent_payments_lease_idx ON public.rent_payments(lease_id);

-- 6. Public vacancy counts (safe aggregate, no unit details)
CREATE OR REPLACE FUNCTION public.property_unit_counts()
RETURNS TABLE (property_id uuid, total_units bigint, vacant_units bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.property_id,
         count(*) AS total_units,
         count(*) FILTER (WHERE u.status = 'vacant') AS vacant_units
  FROM public.property_units u
  JOIN public.properties p ON p.id = u.property_id
  WHERE p.is_published = true AND p.is_archived = false
  GROUP BY u.property_id
$$;
GRANT EXECUTE ON FUNCTION public.property_unit_counts() TO anon, authenticated, service_role;

-- 7. Rent charge generation
CREATE OR REPLACE FUNCTION public.generate_rent_charges()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l record;
  period date;
  due date;
  inserted integer := 0;
BEGIN
  FOR l IN SELECT * FROM public.leases WHERE status = 'active' LOOP
    period := date_trunc('month', greatest(l.start_date, CURRENT_DATE - interval '6 months'))::date;
    WHILE period <= date_trunc('month', CURRENT_DATE)::date LOOP
      IF period >= date_trunc('month', l.start_date)::date THEN
        due := period + (least(l.rent_due_day, 28) - 1);
        INSERT INTO public.rent_charges (lease_id, unit_id, period_start, due_date, amount)
        VALUES (l.id, l.unit_id, period, due, l.monthly_rent)
        ON CONFLICT (lease_id, period_start) DO NOTHING;
        IF FOUND THEN inserted := inserted + 1; END IF;
      END IF;
      period := (period + interval '1 month')::date;
    END LOOP;
  END LOOP;
  RETURN inserted;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_rent_charges() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.generate_rent_charges() TO authenticated, service_role;

-- 8. Rentals permission for existing admins
UPDATE public.staff_members
SET permissions = array_append(permissions, 'rentals')
WHERE NOT ('rentals' = ANY(permissions));

-- 9. Lease document storage policies
CREATE POLICY "rentals staff read lease docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lease-documents' AND public.has_permission(auth.uid(), 'rentals'));
CREATE POLICY "rentals staff upload lease docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lease-documents' AND public.has_permission(auth.uid(), 'rentals'));
CREATE POLICY "rentals staff update lease docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lease-documents' AND public.has_permission(auth.uid(), 'rentals'));
CREATE POLICY "rentals staff delete lease docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lease-documents' AND public.has_permission(auth.uid(), 'rentals'));