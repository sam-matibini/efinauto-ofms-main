-- Sales (bills of sale) carry their own currency so eFinMoney payment links
-- can charge in it. Existing sales default to CAD.
alter table public.sales
  add column if not exists currency text not null default 'CAD';
