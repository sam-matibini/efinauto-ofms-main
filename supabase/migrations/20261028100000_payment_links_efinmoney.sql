-- Upgrade for databases that already ran the earlier Stripe version of
-- 20261020100000_payment_links.sql / 20261021100000_stripe_connect_accounts.sql.
-- Payment links now go through eFinMoney (see create-payment-link and
-- efinmoney-webhook). Safe to run on a fresh install too: every step is
-- idempotent.
--
-- NOTE: run manually in the Supabase SQL editor (migrations are not applied
-- automatically in this project).

alter table public.payment_links
  add column if not exists efinmoney_link_id text,
  add column if not exists short_code text,
  add column if not exists reference text,
  add column if not exists payer_name text,
  add column if not exists expires_at timestamptz;

create unique index if not exists payment_links_efinmoney_link_id_key
  on public.payment_links (efinmoney_link_id);

-- Stripe Checkout links can no longer be paid or tracked.
update public.payment_links
  set status = 'expired', updated_at = now()
  where efinmoney_link_id is null and status in ('created', 'pending');

alter table public.payment_links
  drop column if exists stripe_session_id,
  drop column if exists stripe_payment_intent_id;

alter table public.payment_links
  drop constraint if exists payment_links_status_check;
alter table public.payment_links
  add constraint payment_links_status_check
  check (status in ('created', 'pending', 'awaiting_payment', 'paid', 'failed', 'expired', 'cancelled'));

drop table if exists public.stripe_connect_accounts;
