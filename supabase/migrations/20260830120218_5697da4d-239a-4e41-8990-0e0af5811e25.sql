CREATE TABLE public.staff_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  title text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  permissions text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_members TO authenticated;
GRANT ALL ON public.staff_members TO service_role;

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read own record" ON public.staff_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage staff" ON public.staff_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER staff_members_updated
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE user_id = _user_id AND is_active AND _permission = ANY(permissions)
  )
$$;

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
    ARRAY['properties','leads','content','agents','blog','staff','analytics']
  FROM public.profiles p WHERE p.id = uid
  ON CONFLICT (user_id) DO UPDATE
    SET permissions = ARRAY['properties','leads','content','agents','blog','staff','analytics'],
        is_active = true;

  RETURN true;
END;
$$;

INSERT INTO public.staff_members (user_id, full_name, email, title, permissions)
SELECT ur.user_id,
       COALESCE(p.full_name, ''),
       p.email,
       CASE WHEN ur.role = 'admin' THEN 'Administrator' ELSE 'Editor' END,
       CASE WHEN ur.role = 'admin'
            THEN ARRAY['properties','leads','content','agents','blog','staff','analytics']
            ELSE ARRAY['properties','leads','content','blog'] END
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
ON CONFLICT (user_id) DO NOTHING;