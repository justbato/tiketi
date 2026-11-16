-- Migration: Add amount_charged, buyer_fee, and flat_fee to orders
alter table public.orders add column if not exists amount_charged numeric;
alter table public.orders add column if not exists buyer_fee numeric default 0;
alter table public.orders add column if not exists flat_fee numeric default 0;

