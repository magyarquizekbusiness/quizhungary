-- Biztonsági keményítés (2. fázis): a profiles táblából kliensről (anon /
-- authenticated) csak a nyilvános oszlopok olvashatók. Rejtve marad pl. az
-- unsubscribe_token, stripe_customer_id, is_admin, referral_code, referred_by.
-- A saját profil minden mezőjét a get_my_profile() függvény adja vissza.
--
-- FONTOS: csak azután futtasd, hogy az új frontend (get_my_profile /
-- apply_referral hívásokkal) élesben van — a régi frontend select('*')-a e
-- nélkül hibára futna.

revoke select on public.profiles from anon, authenticated;
grant select (id, username, avatar_color, is_premium) on public.profiles to anon, authenticated;
