-- Tulajdonos jelvény + elfogadható prémium ajándék.
--
-- 1) profiles.is_owner: nyilvános jelző (👑 Tulajdonos jelvény a ranglistán,
--    profilon, barátlistán). Kliensről nem írható.
-- 2) premium_gifts: a tulajdonosok által adott prémium ajándékok. A prémium
--    csak akkor indul, amikor a címzett az oldalon elfogadja
--    (claim_premium_gift), és subscription_status = 'gift' lesz, lejárattal.

-- ── 1. Tulajdonos jelző ──────────────────────────────────────────────────────
alter table public.profiles add column if not exists is_owner boolean not null default false;
grant select (is_owner) on public.profiles to anon, authenticated;

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
      new.is_owner := false;
      new.is_premium := false;
      new.subscription_status := null;
      new.subscription_end := null;
      new.stripe_customer_id := null;
      new.referral_reward_claimed := false;
      new.referral_period_start := now();
      new.referred_by := null;
      new.created_at := now();
      new.reminder_sent_date := null;
    else
      new.id := old.id;
      new.is_admin := old.is_admin;
      new.is_owner := old.is_owner;
      new.is_premium := old.is_premium;
      new.subscription_status := old.subscription_status;
      new.subscription_end := old.subscription_end;
      new.stripe_customer_id := old.stripe_customer_id;
      new.referral_reward_claimed := old.referral_reward_claimed;
      new.referral_period_start := old.referral_period_start;
      new.created_at := old.created_at;
      new.unsubscribe_token := old.unsubscribe_token;
      new.referral_code := old.referral_code;
      new.reminder_sent_date := old.reminder_sent_date;
      new.avatar_color := old.avatar_color;
      new.username := old.username;
      -- Meghívó: csak egyszer, csak friss fióknál, és nem saját magára állítható.
      if not (old.referred_by is null
              and new.referred_by is not null
              and new.referred_by <> old.id
              and old.created_at > now() - interval '1 day') then
        new.referred_by := old.referred_by;
      end if;
    end if;
  end if;
  return new;
end;
$function$;

-- Ranglista nézetek: is_owner a végére (create or replace csak a végére enged új oszlopot).
create or replace view public.leaderboard as
  select p.id, p.username, p.avatar_color, p.is_premium,
         coalesce(sum(s.points), 0::bigint) as total_points,
         count(s.id) as games_played,
         p.is_owner
  from public.profiles p
  left join public.scores s on s.user_id = p.id
  group by p.id, p.username, p.avatar_color, p.is_premium, p.is_owner
  order by coalesce(sum(s.points), 0::bigint) desc;

create or replace view public.leaderboard_weekly as
  select p.id, p.username, p.avatar_color, p.is_premium,
         coalesce(sum(s.points), 0::bigint) as total_points,
         count(s.id) as games_played,
         p.is_owner
  from public.profiles p
  left join public.scores s on s.user_id = p.id and s.created_at >= date_trunc('week', now())
  group by p.id, p.username, p.avatar_color, p.is_premium, p.is_owner
  order by coalesce(sum(s.points), 0::bigint) desc;

alter view public.leaderboard set (security_invoker = true);
alter view public.leaderboard_weekly set (security_invoker = true);
revoke insert, update, delete, truncate, references, trigger on public.leaderboard, public.leaderboard_weekly from anon, authenticated;

-- ── 2. Prémium ajándékok ─────────────────────────────────────────────────────
create table if not exists public.premium_gifts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  sender_id   uuid references public.profiles(id) on delete set null,
  days        integer not null check (days between 1 and 90),
  message     text check (message is null or char_length(message) <= 1000),
  created_at  timestamptz not null default now(),
  claimed_at  timestamptz
);
create index if not exists premium_gifts_pending_idx on public.premium_gifts (user_id) where claimed_at is null;

alter table public.premium_gifts enable row level security;
-- Mindenki csak a saját ajándékait látja; létrehozni csak szerverről (SQL / service role) lehet.
drop policy if exists premium_gifts_select_own on public.premium_gifts;
create policy premium_gifts_select_own on public.premium_gifts
  for select using (auth.uid() = user_id);
revoke all on public.premium_gifts from anon, authenticated;
grant select on public.premium_gifts to authenticated;

-- Ajándék elfogadása: innentől indul a prémium, `days` napig.
create or replace function public.claim_premium_gift(gift_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  g record;
  prof record;
  base timestamptz;
  new_end timestamptz;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  select * into g from public.premium_gifts where id = gift_id for update;
  if not found or g.user_id <> auth.uid() then
    return jsonb_build_object('error', 'not_found');
  end if;
  if g.claimed_at is not null then
    return jsonb_build_object('error', 'already_claimed');
  end if;

  select * into prof from public.profiles where id = g.user_id for update;

  -- Fizetős (Stripe) előfizetést nem írunk felül.
  if prof.subscription_status = 'active' and prof.is_premium then
    return jsonb_build_object('granted', false, 'reason', 'has_active_subscription');
  end if;

  -- Ha már fut egy lejáró (ajándék / meghívós) prémium, ahhoz adjuk hozzá a napokat.
  base := now();
  if prof.is_premium and prof.subscription_status in ('gift', 'referral_reward')
     and prof.subscription_end > now() then
    base := prof.subscription_end;
  end if;
  new_end := base + make_interval(days => g.days);

  update public.profiles
    set is_premium = true,
        subscription_status = 'gift',
        subscription_end = new_end
    where id = g.user_id;

  update public.premium_gifts set claimed_at = now() where id = g.id;

  return jsonb_build_object('granted', true, 'days', g.days, 'subscription_end', new_end);
end;
$function$;

revoke all on function public.claim_premium_gift(bigint) from public, anon;
grant execute on function public.claim_premium_gift(bigint) to authenticated;

-- Lejárt ajándék prémium visszavonása (a send-reminders cron hívja).
create or replace function public.cleanup_expired_referral_rewards()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  cleaned integer;
begin
  update public.profiles
    set is_premium = false,
        subscription_status = 'expired'
    where subscription_status in ('referral_reward', 'gift')
      and subscription_end < now();
  get diagnostics cleaned = row_count;
  return cleaned;
end;
$function$;
