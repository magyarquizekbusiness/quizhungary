// Prémium kérdések kiszolgálása — csak prémium (vagy admin) felhasználónak.
//
// A prémium kérdések SZÁNDÉKOSAN nincsenek a public/ mappában: ami ott van, azt
// bárki letöltheti a böngészőből. Itt a szerver ellenőrzi a bejelentkezett
// felhasználó tokenjét és a profilját, és csak akkor adja ki a kért szintet.
// Az 1. szint ingyenes kóstoló: az nyilvános (public/data/questions/premium-preview.js).
//
// GET /api/premium-questions?sub=<alkategória-id>&level=<szint>
// Fejléc: Authorization: Bearer <a bejelentkezett munkamenet access tokenje>

import { createClient } from '@supabase/supabase-js';
import { getAuthedUser } from '../lib/auth.js';
import nyelv from '../data/premium/nyelv.js';
import retro from '../data/premium/retro.js';
import mitologia from '../data/premium/mitologia.js';
import muveszet from '../data/premium/muveszet.js';
import extra from '../data/premium/extra.js';

const BANK = { ...nyelv, ...retro, ...mitologia, ...muveszet, ...extra };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Ugyanaz a szabály, mint a kliens isPremium()-ja: a meghívásért kapott prémium lejárhat.
// Az admin mindig hozzáfér (teszteléshez).
function hasPremiumAccess(p) {
  if (!p) return false;
  if (p.is_admin === true) return true;
  if (p.is_premium !== true) return false;
  if (p.subscription_status === 'referral_reward' && p.subscription_end &&
      new Date(p.subscription_end) < new Date()) return false;
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sub = String(req.query.sub || '');
  const level = parseInt(req.query.level, 10);
  const bank = Object.prototype.hasOwnProperty.call(BANK, sub) ? BANK[sub] : null;
  if (!bank || !Number.isInteger(level) || level < 1 || level > bank.length) {
    return res.status(404).json({ error: 'Nincs ilyen szint' });
  }

  // Az 1. szint mindenkinek jár (ugyanaz, mint a nyilvános előnézetben).
  if (level === 1) return res.status(200).json({ questions: bank[0] });

  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_premium, is_admin, subscription_status, subscription_end')
    .eq('id', user.id)
    .single();
  if (error || !hasPremiumAccess(profile)) {
    return res.status(403).json({ error: 'Prémium előfizetés szükséges' });
  }

  return res.status(200).json({ questions: bank[level - 1] });
}
