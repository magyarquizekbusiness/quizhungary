alter table public.book_orders add column if not exists billing jsonb;
alter table public.book_orders add column if not exists note text;
alter table public.book_orders add column if not exists privacy_consent_at timestamptz;
