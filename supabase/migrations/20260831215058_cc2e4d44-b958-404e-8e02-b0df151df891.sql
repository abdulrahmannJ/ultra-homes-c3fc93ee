-- units
CREATE TABLE public.property_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  label text NOT NULL,
  bedrooms integer NOT NULL DEFAULT 0,
  floor text,
  monthly_rent numeric NOT NULL DEFAULT 0,
  rent_due_day integer NOT NULL DEFAULT 5,
  notes text,
  status text NOT NULL DEFAULT 'vacant',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_units TO authenticated;
GRANT ALL ON public.property_units TO service_role;
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rentals staff manage units" ON public.property_units FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'rentals')) WITH CHECK (public.has_permission(auth.uid(), 'rentals'));

-- tenants
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text,
  id_number text,
  emergency_contact text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rentals staff manage tenants" ON public.tenants FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'rentals')) WITH CHECK (public.has_permission(auth.uid(), 'rentals'));

-- leases
CREATE TABLE public.leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.property_units(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  monthly_rent numeric NOT NULL DEFAULT 0,
  deposit numeric NOT NULL DEFAULT 0,
  rent_due_day integer NOT NULL DEFAULT 5,
  contract_path text,
  id_document_path text,
  move_out_date date,
  move_out_notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX leases_one_active_per_unit ON public.leases (unit_id) WHERE status = 'active';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leases TO authenticated;
GRANT ALL ON public.leases TO service_role;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rentals staff manage leases" ON public.leases FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'rentals')) WITH CHECK (public.has_permission(auth.uid(), 'rentals'));

-- charges
CREATE TABLE public.rent_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
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

-- payments
CREATE TABLE public.rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
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

-- updated_at triggers
CREATE TRIGGER property_units_updated BEFORE UPDATE ON public.property_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER leases_updated BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER rent_payments_updated BEFORE UPDATE ON public.rent_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- keep unit occupancy in sync with leases
CREATE OR REPLACE FUNCTION public.sync_unit_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.property_units u
  SET status = CASE WHEN EXISTS (
      SELECT 1 FROM public.leases l WHERE l.unit_id = u.id AND l.status = 'active'
    ) THEN 'occupied' ELSE 'vacant' END
  WHERE u.id = COALESCE(NEW.unit_id, OLD.unit_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER leases_sync_unit_status
  AFTER INSERT OR UPDATE OR DELETE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.sync_unit_status();

-- generate missing monthly rent charges for active leases
CREATE OR REPLACE FUNCTION public.generate_rent_charges()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted integer := 0;
  period_start date := date_trunc('month', CURRENT_DATE)::date;
  period_end date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'rentals') THEN
    RETURN 0;
  END IF;

  INSERT INTO public.rent_charges (lease_id, period_start, period_end, due_date, amount)
  SELECT l.id,
         period_start,
         period_end,
         LEAST(period_start + (GREATEST(l.rent_due_day, 1) - 1), period_end),
         l.monthly_rent
  FROM public.leases l
  WHERE l.status = 'active'
    AND l.start_date <= period_end
    AND (l.end_date IS NULL OR l.end_date >= period_start)
  ON CONFLICT (lease_id, period_start) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_rent_charges() TO authenticated;