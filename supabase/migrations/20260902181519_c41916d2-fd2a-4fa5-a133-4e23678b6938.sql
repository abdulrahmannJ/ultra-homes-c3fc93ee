ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS grace_days integer NOT NULL DEFAULT 5;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.leases'::regclass AND conname = 'leases_grace_days_range'
  ) THEN
    ALTER TABLE public.leases
      ADD CONSTRAINT leases_grace_days_range CHECK (grace_days >= 0 AND grace_days <= 15);
  END IF;
END $$;