-- Allow payment links on bills of sale (public.sales) as well as invoices.

alter table public.payment_links
  drop constraint if exists payment_links_source_type_check;
alter table public.payment_links
  add constraint payment_links_source_type_check
  check (source_type in ('sales_invoice', 'repair_invoice', 'sale'));
