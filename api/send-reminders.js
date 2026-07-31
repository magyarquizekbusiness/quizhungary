import { createClient } from '@supabase/supabase-js';
import { buildEmail, sendEmail } from '../lib/email.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Biztonság: csak a Vercel Cron hívhatja
  // A Vercel Cron automatikusan küldi az Authorization: Bearer <CRON_SECRET> headert
  const authHeader = req.headers.authorization;
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const hasValidSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  // Ha NINCS beállítva CRON_SECRET, az hiba - ne engedjük
  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ error: 'CRON_SECRET nincs beállítva' });
  }
  // Csak a Vercel Cron VAGY a helyes secret engedélyezett
  if (!isVercelCron && !hasValidSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    // Lejárt referral jutalmak kitakarítása
    try { await supabase.rpc('cleanup_expired_referral_rewards'); } catch(e) { console.warn('Cleanup failed:', e.message); }

    // Felhasználók akik: beleegyeztek + ma még nem játszottak + ma még nem kaptak emlékeztetőt
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, email_reminders, last_played_date, reminder_sent_date, unsubscribe_token')
      .eq('email_reminders', true);

    if (!profiles || profiles.length === 0) {
      return res.status(200).json({ sent: 0, message: 'Nincs feliratkozott felhasználó' });
    }

    // Email címek lekérése az auth táblából
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = {};
    (authData?.users || []).forEach(u => { emailMap[u.id] = u.email; });

    let sentCount = 0;
    const errors = [];

    for (const p of profiles) {
      // Kihagyjuk ha ma már játszott
      if (p.last_played_date === today) continue;
      // Kihagyjuk ha ma már kapott emlékeztetőt
      if (p.reminder_sent_date === today) continue;

      const email = emailMap[p.id];
      if (!email) continue;

      const unsubUrl = `${process.env.SITE_URL}/api/unsubscribe?token=${p.unsubscribe_token}`;
      const playUrl = process.env.SITE_URL;
      const name = p.username || 'Játékos';

      const { html, text } = buildEmail({
        greeting: `Szia ${name}!`,
        paragraphs: [
          'Ma még nem játszottál a QuizHungary-n, és nem szeretném, ha megszakadna a sorozatod. Egy gyors kvíz mindössze pár perc.',
          'Ha most beugrasz egy körre, megmarad a sorozatod és gyűlnek a pontjaid.'
        ],
        ctaLabel: 'Folytatom a sorozatom',
        ctaUrl: playUrl,
        signoff: 'Üdv,<br>a QuizHungary csapata',
        footerNote: 'Ezt az emlékeztetőt azért kapod, mert feliratkoztál a QuizHungary értesítéseire.',
        unsubUrl,
        unsubLabel: 'Leiratkozás'
      });

      try {
        const resp = await sendEmail({
          to: email,
          subject: `${name}, ma még nem játszottál – tartsd meg a sorozatod`,
          html,
          text,
          unsubUrl
        });

        if (resp.ok) {
          sentCount++;
          // Jelöljük hogy ma kapott emlékeztetőt
          await supabase.from('profiles').update({ reminder_sent_date: today }).eq('id', p.id);
        } else {
          const errText = await resp.text();
          errors.push({ email, error: errText });
        }
      } catch (e) {
        errors.push({ email, error: e.message });
      }
    }

    return res.status(200).json({ sent: sentCount, errors: errors.length ? errors : undefined });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}