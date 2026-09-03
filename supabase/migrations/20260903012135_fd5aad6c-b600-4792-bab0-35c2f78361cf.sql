GRANT EXECUTE ON FUNCTION public.generate_rent_charges() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_rent_charges() FROM anon, PUBLIC;