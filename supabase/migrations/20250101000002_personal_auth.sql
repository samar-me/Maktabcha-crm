-- Migration: Personal Auth Table for PIN Authentication
-- Stores salted scrypt hash of the single CRM owner's PIN.
-- RLS is enabled with NO policies, ensuring only the server-side service_role client has access.

CREATE TABLE IF NOT EXISTS public.personal_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_auth ENABLE ROW LEVEL SECURITY;

-- No public or authenticated policies are created.
-- Access is strictly restricted to SUPABASE_SERVICE_ROLE_KEY on the server.
