-- Biztonsági keményítés (1. fázis) — visszafelé kompatibilis a korábbi frontenddel.
--
-- Javított hibák:
--  * profiles: a kliens bármely oszlopot írhatta (avatar_color → tárolt XSS,
--    referred_by / created_at → ingyen prémium a meghívási rendszerrel)
--  * scores: tetszőleges pontszám / topic (ranglista-csalás, XSS az admin panelen)
--  * friendships: a kérelmező maga is elfogadhatta a kérelmet / eleve 'accepted' sort szúrhatott be
--  * messages: bárki írhatott bárkinek, a címzett átírhatta a kapott üzenetet
--  * app_subscriptions: a kliens maga állíthatott be aktív előfizetést
--  * SECURITY DEFINER függvények: nincs search_path, anon is futtathatta őket
--  * ranglista view-k: SECURITY DEFINER + fölösleges írási jogok

-- ── profiles ────────────────────────────────────────────────────────────────

alter table public.profiles
  add constraint profiles_avatar_color_hex
  check (avatar_color is null or avatar_color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.profiles
  add constraint profiles_username_safe
  check (char_length(username) between 2 and 30
         and username !~ '[<>"''`&\\/[:cntrl:]]');

-- Új felhasználó: a (metaadatból vagy e-mailből jövő) becenévből kiszűrjük a
-- tiltott karaktereket, hogy a regisztráció ne akadjon el a fenti szabályon.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uname text;
begin
  uname := left(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    '[<>"''`&\\/[:cntrl:]]', '', 'g'), 30);
  if char_length(uname) < 2 then
    uname := 'Jatekos' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  insert into public.profiles (id, username) values (new.id, uname);
  return new;
end;
$$;

-- A kliensről írható mezők köre: csak ami a frontendnek kell. A trigger ezen
-- felül is visszaállítja a jogosultsági és belső mezőket.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
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
$$;

-- Írás: csak a saját sor, csak UPDATE, csak a szükséges oszlopok.
drop policy if exists "Own profile" on public.profiles;
drop policy if exists "Own profile update" on public.profiles;
create policy "Own profile update" on public.profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Duplikált SELECT szabály törlése (a profiles_select_all marad).
drop policy if exists "Profiles visible" on public.profiles;

revoke insert, update, delete, truncate, references, trigger on public.profiles from anon, authenticated;
grant update (email_reminders, last_played_date, referred_by) on public.profiles to authenticated;

-- Saját profil (privát mezőkkel együtt) — a 2. fázisban a profiles táblából
-- kliensről már csak a nyilvános oszlopok olvashatók.
create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;
revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- Meghívó beállítása kód alapján (a referral_code a 2. fázistól nem olvasható kliensről).
create or replace function public.apply_referral(code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  ref_id uuid;
begin
  if me is null or code is null then
    return false;
  end if;
  select id into ref_id from public.profiles where referral_code = code;
  if ref_id is null or ref_id = me then
    return false;
  end if;
  update public.profiles
    set referred_by = ref_id
    where id = me
      and referred_by is null
      and created_at > now() - interval '1 day';
  return found;
end;
$$;
revoke all on function public.apply_referral(text) from public, anon;
grant execute on function public.apply_referral(text) to authenticated;

-- ── Meghívási jutalom ───────────────────────────────────────────────────────

-- Csak megerősített e-mail című meghívottak számítanak.
create or replace function public.count_successful_referrals(user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  period_start timestamptz;
  ref_count integer;
begin
  select referral_period_start into period_start from public.profiles where id = user_id;

  select count(*) into ref_count
  from public.profiles p
  where p.referred_by = user_id
    and p.created_at >= period_start
    and exists (select 1 from auth.users u where u.id = p.id and u.email_confirmed_at is not null)
    and (select count(*) from public.scores s where s.user_id = p.id) >= 10;

  return coalesce(ref_count, 0);
end;
$$;

alter function public.check_and_grant_referral_reward(uuid) set search_path = public;
alter function public.cleanup_expired_referral_rewards() set search_path = public;
alter function public.touch_level_progress() set search_path = public;

revoke all on function public.check_and_grant_referral_reward(uuid) from public, anon;
grant execute on function public.check_and_grant_referral_reward(uuid) to authenticated, service_role;
revoke all on function public.count_successful_referrals(uuid) from public, anon, authenticated;
grant execute on function public.count_successful_referrals(uuid) to service_role;
revoke all on function public.cleanup_expired_referral_rewards() from public, anon, authenticated;
grant execute on function public.cleanup_expired_referral_rewards() to service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ── scores ──────────────────────────────────────────────────────────────────

alter table public.scores
  add constraint scores_points_range check (points between 0 and 5000);

alter table public.scores
  add constraint scores_topic_safe
  check (char_length(topic) between 1 and 80 and topic !~ '[<>"''`&\\[:cntrl:]]');

-- Mentési korlát: 3 mp-en belüli ismételt mentést csendben eldobunk (duplikált
-- hívások), naponta legfeljebb 300 mentés és 100 000 pont. A created_at-et a
-- szerver állítja (ne lehessen visszadátumozni a heti ranglistán).
create or replace function public.scores_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  day_count integer;
  day_points bigint;
begin
  if current_user in ('anon', 'authenticated') then
    new.created_at := now();
    if exists (select 1 from public.scores
               where user_id = new.user_id and created_at > now() - interval '3 seconds') then
      return null;
    end if;
    select count(*), coalesce(sum(points), 0) into day_count, day_points
      from public.scores
      where user_id = new.user_id and created_at > now() - interval '1 day';
    if day_count >= 300 or day_points + new.points > 100000 then
      raise exception 'Napi pontmentési limit elérve' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists scores_guard on public.scores;
create trigger scores_guard
before insert on public.scores
for each row execute function public.scores_guard();

revoke insert, update, delete, truncate, references, trigger on public.scores from anon, authenticated;
grant insert (user_id, topic, points) on public.scores to authenticated;

-- ── friendships ─────────────────────────────────────────────────────────────

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert to authenticated
  with check (auth.uid() = requester_id
              and requester_id <> addressee_id
              and status = 'pending');

-- Elfogadni csak a címzett tud (elutasítás = törlés, az marad mindkét félnek).
drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships
  for update to authenticated
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id and status = 'accepted');

revoke insert, update, truncate, references, trigger on public.friendships from anon, authenticated;
revoke delete on public.friendships from anon;
grant insert (requester_id, addressee_id, status) on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;

-- ── messages ────────────────────────────────────────────────────────────────

-- Üzenet csak elfogadott barátnak küldhető, észszerű hosszal.
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and char_length(content) between 1 and 2000
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = receiver_id)
          or (f.addressee_id = auth.uid() and f.requester_id = receiver_id))
    )
  );

-- A kliens nem módosít üzenetet (az olvasottságot localStorage követi).
drop policy if exists messages_update on public.messages;

revoke insert, update, delete, truncate, references, trigger on public.messages from anon, authenticated;
grant insert (sender_id, receiver_id, content) on public.messages to authenticated;

-- ── app_subscriptions ───────────────────────────────────────────────────────

-- Előfizetést csak a szerver (service role, vásárlás-ellenőrzés után) írhat.
drop policy if exists app_subscriptions_insert_own on public.app_subscriptions;
drop policy if exists app_subscriptions_update_own on public.app_subscriptions;
revoke insert, update, delete, truncate, references, trigger on public.app_subscriptions from anon, authenticated;

-- ── level_progress ──────────────────────────────────────────────────────────

revoke all on public.level_progress from anon;
revoke truncate, references, trigger on public.level_progress from authenticated;

-- ── Ranglista view-k ────────────────────────────────────────────────────────

alter view public.leaderboard set (security_invoker = true);
alter view public.leaderboard_weekly set (security_invoker = true);
revoke insert, update, delete, truncate, references, trigger on public.leaderboard, public.leaderboard_weekly from anon, authenticated;
