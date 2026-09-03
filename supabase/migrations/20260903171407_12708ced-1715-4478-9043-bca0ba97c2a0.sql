ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS grace_days integer NOT NULL DEFAULT 5;
ALTER TABLE public.leases ADD CONSTRAINT leases_grace_days_range CHECK (grace_days >= 0 AND grace_days <= 60);