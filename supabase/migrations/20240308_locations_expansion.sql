-- Add location tracking to org_members and payments
-- This allows us to track which 'Sede' registered a payment based on the user's assigned location.

-- 1. Add location to org_members
ALTER TABLE public.org_members
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- 2. Add location to payments
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- 3. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_org_members_location ON public.org_members(location);
CREATE INDEX IF NOT EXISTS idx_payments_location ON public.payments(location);
