import { createClient } from '@supabase/supabase-js';
import { getAuthedUser } from '../lib/auth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── BIZTONSÁG: a kérőt a hitelesített tokenből azonosítjuk (nem a törzsből),
  // majd ellenőrizzük, hogy tényleg admin-e. Így egy admin UUID ismerete nem
  // elég a felhasználói adatok (pl. e-mailek) lekéréséhez. ──
  const authUser = await getAuthedUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
  const userId = authUser.id;

  const { data: requester } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (!requester?.is_admin) {
    return res.status(403).json({ error: 'Hozzáférés megtagadva' });
  }

  try {
    // Összes profil
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, is_premium, subscription_status, subscription_end, stripe_customer_id, created_at')
      .order('created_at', { ascending: false });

    // Auth users (email-ekért) — admin API
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = {};
    (authData?.users || []).forEach(u => { emailMap[u.id] = u.email; });

    // Scores összesítés
    const { data: scores } = await supabase
      .from('scores')
      .select('user_id, topic, points, created_at');

    // Statisztikák számítása
    const totalUsers = profiles?.length || 0;
    const premiumUsers = profiles?.filter(p => p.is_premium).length || 0;
    const totalGames = scores?.length || 0;
    const totalPoints = scores?.reduce((s, r) => s + (r.points || 0), 0) || 0;

    // Heti új felhasználók
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const newThisWeek = profiles?.filter(p => p.created_at >= weekAgo).length || 0;

    // Per-user játékstatisztika
    const userGames = {};
    const userPoints = {};
    (scores || []).forEach(s => {
      userGames[s.user_id] = (userGames[s.user_id] || 0) + 1;
      userPoints[s.user_id] = (userPoints[s.user_id] || 0) + (s.points || 0);
    });

    // Téma népszerűség
    const topicCount = {};
    (scores || []).forEach(s => { topicCount[s.topic] = (topicCount[s.topic] || 0) + 1; });
    const topTopics = Object.entries(topicCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Felhasználók részletes listája
    const users = (profiles || []).map(p => ({
      username: p.username,
      email: emailMap[p.id] || '—',
      is_premium: p.is_premium,
      subscription_status: p.subscription_status,
      subscription_end: p.subscription_end,
      games: userGames[p.id] || 0,
      points: userPoints[p.id] || 0,
      created_at: p.created_at
    }));

    // Becsült havi bevétel (aktív előfizetők × 2499 Ft)
    const activeSubzz = profiles?.filter(p => p.is_premium && p.subscription_status === 'active').length || 0;
    const monthlyRevenue = activeSubzz * 2499;

    return res.status(200).json({
      stats: {
        totalUsers,
        premiumUsers,
        totalGames,
        totalPoints,
        newThisWeek,
        monthlyRevenue,
        activeSubscriptions: activeSubzz
      },
      topTopics,
      users
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}