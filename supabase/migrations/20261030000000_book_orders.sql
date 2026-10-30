-- Könyvrendelések (Stripe fizetés -> Lulu nyomtatás). Csak a szerver (service role) éri el.
create table if not exists public.book_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending','paid','submitted','lulu_error','cancelled')),
  quantity int not null check (quantity between 1 and 10),
  country text not null,
  unit_cents int not null,
  shipping_cents int not null default 0,
  total_cents int not null,
  email text,
  shipping_address jsonb,
  stripe_session_id text unique,
  stripe_payment_intent text,
  lulu_print_job_id text,
  lulu_env text,
  error text,
  consent_at timestamptz
);
alter table public.book_orders enable row level security;
-- Szándékosan nincs policy: anon/authenticated nem láthatja, a service role megkerüli az RLS-t.

-- Privát tároló a nyomdai PDF-eknek (interior.pdf, cover.pdf).
insert into storage.buckets (id, name, public) values ('book-files', 'book-files', false)
on conflict (id) do nothing;
