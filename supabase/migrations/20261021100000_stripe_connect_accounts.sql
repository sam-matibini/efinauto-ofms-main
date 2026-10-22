-- Stripe Connect accounts for click-to-pay invoicing (direct charges).
-- Each tenant company connects its OWN Stripe Standard account; customer
-- payments go directly to that dealership's bank. eFinAuto never holds
-- tenant funds.
--
-- NOTE: this project keeps its schema out-of-band (no migrations applied
-- automatically). Run this file's SQL manually in the Supabase SQL editor
-- and keep it here for documentation.

create table if not exists public.stripe_connect_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique,          -- one connected account per company
  stripe_account_id text unique,            -- acct_...
  account_type text not null default 'standard',
  business_type text,                       -- individual | company
  business_name text,
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  requirements_status text,                 -- e.g. account.requirements.disabled_reason
  default_currency text not null default 'CAD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: company members can read their own connection row. All writes go
-- through the service role (onboarding edge function + webhook), which
-- bypasses RLS, so no insert/update policies are defined here.
alter table public.stripe_connect_accounts enable row level security;

create policy "stripe_connect_accounts_select_company"
  on public.stripe_connect_accounts for select
  using (
    company_id in (
      select company_id from core.users where id = auth.uid()
    )
  );
