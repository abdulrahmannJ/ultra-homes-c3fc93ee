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

CREATE TABLE public.leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.property_units(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  monthly_rent numeric NOT NULL DEFAULT 0,
  deposit numeric NOT NULL DEFAULT 0,
  rent_due_day integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'active',
  contract_path text,
  id_document_path text,
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

CREATE INDEX idx_units_property ON public.property_units(property_id);
CREATE INDEX idx_leases_unit ON public.leases(unit_id);
CREATE INDEX idx_charges_lease ON public.rent_charges(lease_id);
CREATE INDEX idx_payments_lease ON public.rent_payments(lease_id);

CREATE TRIGGER units_updated BEFORE UPDATE ON public.property_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER leases_updated BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.rent_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keep unit status in sync with lease state
CREATE OR REPLACE FUNCTION public.sync_unit_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid := COALESCE(NEW.unit_id, OLD.unit_id);
BEGIN
  UPDATE public.property_units u
  SET status = CASE WHEN EXISTS (
        SELECT 1 FROM public.leases l WHERE l.unit_id = target AND l.status = 'active'
      ) THEN 'occupied' ELSE 'vacant' END
  WHERE u.id = target;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sync_unit_status() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER leases_sync_unit AFTER INSERT OR UPDATE OR DELETE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.sync_unit_status();

-- Generate missing rent charges for active leases up to the current month
CREATE OR REPLACE FUNCTION public.generate_rent_charges()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created integer := 0;
  l record;
  p date;
  last_period date := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  FOR l IN SELECT * FROM public.leases WHERE status = 'active' LOOP
    p := date_trunc('month', l.start_date)::date;
    WHILE p <= last_period AND (l.end_date IS NULL OR p <= l.end_date) LOOP
      INSERT INTO public.rent_charges (lease_id, period_start, period_end, due_date, amount)
      VALUES (
        l.id,
        p,
        (p + interval '1 month - 1 day')::date,
        LEAST(p + ((GREATEST(l.rent_due_day, 1) - 1) * interval '1 day'), (p + interval '1 month - 1 day'))::date,
        l.monthly_rent
      )
      ON CONFLICT (lease_id, period_start) DO NOTHING;
      IF FOUND THEN created := created + 1; END IF;
      p := (p + interval '1 month')::date;
    END LOOP;
  END LOOP;
  RETURN created;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_rent_charges() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_rent_charges() TO authenticated;

-- Public, non-sensitive vacancy counts
CREATE OR REPLACE FUNCTION public.property_vacancy(_property_id uuid)
RETURNS TABLE (total_units integer, vacant_units integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int,
         COUNT(*) FILTER (WHERE u.status <> 'occupied')::int
  FROM public.property_units u
  JOIN public.properties p ON p.id = u.property_id
  WHERE u.property_id = _property_id AND p.is_published AND NOT p.is_archived
$$;
REVOKE EXECUTE ON FUNCTION public.property_vacancy(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.property_vacancy(uuid) TO anon, authenticated;

-- Grant the new permission to existing administrators
UPDATE public.staff_members s
SET permissions = array_append(s.permissions, 'rentals')
WHERE NOT ('rentals' = ANY(s.permissions))
  AND public.has_role(s.user_id, 'admin');

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.staff_members (user_id, full_name, email, title, permissions)
  SELECT uid, COALESCE(p.full_name, ''), p.email, 'Administrator',
    ARRAY['properties','leads','content','agents','blog','staff','analytics','rentals']
  FROM public.profiles p WHERE p.id = uid
  ON CONFLICT (user_id) DO UPDATE
    SET permissions = ARRAY['properties','leads','content','agents','blog','staff','analytics','rentals'],
        is_active = true;

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;