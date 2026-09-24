-- Profiles: jogosultsági mezők védelme
-- Az "Own profile ALL" RLS szabály miatt a felhasználó a saját sorát bármely
-- oszlopban módosíthatta volna (pl. is_admin, is_premium). Ez a trigger
-- kliensről (anon / authenticated) visszaállítja ezeket a mezőket.
-- A service role (Stripe webhook, API) és a SECURITY DEFINER függvények
-- (check_and_grant_referral_reward, cleanup_expired_referral_rewards) továbbra is írhatják.
--
-- Adminok: az is_admin mezőt csak SQL-ből / service role-lal lehet állítani.

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
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
    else
      new.is_admin := old.is_admin;
      new.is_premium := old.is_premium;
      new.subscription_status := old.subscription_status;
      new.subscription_end := old.subscription_end;
      new.stripe_customer_id := old.stripe_customer_id;
      new.referral_reward_claimed := old.referral_reward_claimed;
      new.referral_period_start := old.referral_period_start;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
before insert or update on public.profiles
for each row execute function public.protect_profile_privileged_columns();
