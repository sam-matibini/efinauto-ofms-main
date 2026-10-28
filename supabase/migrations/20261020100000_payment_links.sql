-- Payment links for click-to-pay invoicing (eFinMoney payment links).
-- NOTE: this project keeps its schema out-of-band (no migrations applied
-- automatically). Run this file's SQL manually in the Supabase SQL editor
-- and keep it here for documentation.

create table if not exists public.payment_links (
  id uuid primary key default gen_random_uuid(),    -- also sent as the eFinMoney `reference`
  company_id uuid not null,
  source_type text not null check (source_type in ('sales_invoice', 'repair_invoice')),
  source_id uuid not null,
  invoice_number text,
  efinmoney_link_id text unique,                    -- eFinMoney payment link id
  short_code text,                                  -- e.g. K7QZ2MX (pay URL suffix)
  reference text,
  url text,
  amount numeric not null,
  currency text not null default 'CAD',
  status text not null default 'created'
    check (status in ('created', 'pending', 'awaiting_payment', 'paid', 'failed', 'expired', 'cancelled')),
  payer_name text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_links_source
  on public.payment_links (source_type, source_id);

alter table public.payment_links enable row level security;

-- Mirror the RLS intent used by other tenant tables: company members can
-- read payment links of their company and create new ones. Webhook writes
-- go through the service role, which bypasses RLS.
-- NOTE: the users/profile table lives in the shared `core` schema (the same
-- place invite-user reads/writes it). If your deployment keeps users in
-- public instead, change core.users to public.users below.

create policy "payment_links_select_company"
  on public.payment_links for select
  using (
    company_id in (
      select company_id from core.users where id = auth.uid()
    )
  );

create policy "payment_links_insert_company"
  on public.payment_links for insert
  with check (
    company_id in (
      select company_id from core.users where id = auth.uid()
    )
  );

create policy "payment_links_update_company"
  on public.payment_links for update
  using (
    company_id in (
      select company_id from core.users where id = auth.uid()
    )
  );
