-- eFinMoney integration (partner API) - per-company link, read-only

create table if not exists public.efinmoney_links (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies(id) on delete cascade,
  user_id uuid,
  external_ref text,
  link_id text,
  access_token_enc text,
  scopes text[],
  account_type text,
  account_name text,
  account_legal_name text,
  account_country text,
  status text not null default 'disconnected' check (status in ('connected','disconnected')),
  connected_at timestamptz,
  last_synced_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id)
);

create table if not exists public.efinmoney_link_states (
  state text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  user_id uuid,
  redirect_uri text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_efinmoney_links_company_id on public.efinmoney_links(company_id);
create index if not exists idx_efinmoney_link_states_expires_at on public.efinmoney_link_states(expires_at);

alter table public.efinmoney_links enable row level security;
alter table public.efinmoney_link_states enable row level security;

revoke all on public.efinmoney_links from anon, authenticated;
revoke all on public.efinmoney_link_states from anon, authenticated;

create or replace function public.set_updated_at_efinmoney()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_efinmoney_links_updated_at on public.efinmoney_links;
create trigger trg_efinmoney_links_updated_at
  before update on public.efinmoney_links
  for each row
  execute function public.set_updated_at_efinmoney();