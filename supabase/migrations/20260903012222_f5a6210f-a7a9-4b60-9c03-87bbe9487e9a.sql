DROP TRIGGER IF EXISTS leases_sync_unit_status ON public.leases;
CREATE TRIGGER leases_sync_unit_status
AFTER INSERT OR UPDATE OR DELETE ON public.leases
FOR EACH ROW EXECUTE FUNCTION public.sync_unit_status();

CREATE OR REPLACE FUNCTION public.property_unit_counts()
 RETURNS TABLE(property_id uuid, total_units bigint, vacant_units bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.property_id,
         count(*) AS total_units,
         count(*) FILTER (WHERE u.status = 'available') AS vacant_units
  FROM public.property_units u
  JOIN public.properties p ON p.id = u.property_id
  WHERE p.is_published = true AND p.is_archived = false AND u.is_published = true
  GROUP BY u.property_id
$function$;

UPDATE public.property_units u
SET status = CASE WHEN EXISTS (
      SELECT 1 FROM public.leases l WHERE l.unit_id = u.id AND l.status = 'active'
    ) THEN 'occupied' ELSE 'available' END
WHERE u.status IN ('available','occupied');