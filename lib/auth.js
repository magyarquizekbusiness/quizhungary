// Közös hitelesítő segédmodul az API-végpontokhoz.
//
// FONTOS: a végpontok NEM bízhatnak a kérés törzsében küldött userId-ban –
// azt bárki hamisíthatja. Helyette a kliens az `Authorization: Bearer <token>`
// fejlécben elküldi a bejelentkezett munkamenet access tokenjét, a szerver pedig
// a Supabase-szel ellenőrzi és abból veszi ki a valódi felhasználót.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cron végpontok hitelesítése: csak a helyes CRON_SECRET fogadható el. Az
// `x-vercel-cron` fejlécet bárki elküldheti, ezért arra nem hagyatkozunk — a
// Vercel Cron a CRON_SECRET-et automatikusan `Authorization: Bearer` fejlécben küldi.
// Hamis esetén már el is küldte a hibaválaszt.
export function checkCronAuth(req, res) {
  if (!process.env.CRON_SECRET) {
    res.status(500).json({ error: 'CRON_SECRET nincs beállítva' });
    return false;
  }
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// Visszaadja a kéréshez tartozó hitelesített felhasználót, vagy null-t.
export async function getAuthedUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return null;
    return data?.user || null;
  } catch (e) {
    return null;
  }
}
