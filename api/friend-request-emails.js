import { createClient } from '@supabase/supabase-js';
import { buildEmail, sendEmail } from '../lib/email.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Biztonság: csak a Vercel Cron hívhatja
  const authHeader = req.headers.authorization;
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const hasValidSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ error: 'CRON_SECRET nincs beállítva' });
  }
  if (!isVercelCron && !hasValidSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Csak a 3 óránál régebbi kérelmekről küldünk (a frissen elfogadottakat kihagyja)
  // A cron naponta egyszer fut (Vercel Hobby limit), tehát ez napi összegző értesítő
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

  try {
    // Függő barátkérelmek amik 3 óránál régebbiek és még nem küldtünk róluk emailt
    const { data: requests } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, created_at, email_sent')
      .eq('status', 'pending')
      .eq('email_sent', false)
      .lt('created_at', threeHoursAgo);

    if (!requests || requests.length === 0) {
      return res.status(200).json({ sent: 0, message: 'Nincs értesítendő kérelem' });
    }

    // Profilok és email címek
    const allUserIds = [...new Set([
      ...requests.map(r => r.addressee_id),
      ...requests.map(r => r.requester_id)
    ])];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, email_reminders, unsubscribe_token')
      .in('id', allUserIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = {};
    (authData?.users || []).forEach(u => { emailMap[u.id] = u.email; });

    let sentCount = 0;
    const errors = [];

    for (const reqRow of requests) {
      const addressee = profileMap[reqRow.addressee_id];
      const requester = profileMap[reqRow.requester_id];
      if (!addressee || !requester) continue;

      // Csak ha a címzett beleegyezett az emailekbe
      if (addressee.email_reminders !== true) {
        // Jelöljük elküldöttnek hogy ne nézzük újra (nem kér emailt)
        await supabase.from('friendships').update({ email_sent: true }).eq('id', reqRow.id);
        continue;
      }

      const email = emailMap[reqRow.addressee_id];
      if (!email) continue;

      const unsubUrl = `${process.env.SITE_URL}/api/unsubscribe?token=${addressee.unsubscribe_token}`;
      const playUrl = process.env.SITE_URL;
      const name = addressee.username || 'Játékos';

      const { html, text } = buildEmail({
        greeting: `Szia ${name}!`,
        paragraphs: [
          `<strong>${requester.username}</strong> barátnak jelölt téged a QuizHungary-n.`,
          'Ha elfogadod a kérelmet, cseveghettek egymással, és kihívhatjátok egymást egy párbajra.'
        ],
        ctaLabel: 'Kérelem megtekintése',
        ctaUrl: playUrl,
        signoff: 'Üdv,<br>a QuizHungary csapata',
        footerNote: 'Ezt az értesítést azért kapod, mert feliratkoztál a QuizHungary értesítéseire.',
        unsubUrl,
        unsubLabel: 'Leiratkozás'
      });

      try {
        const resp = await sendEmail({
          to: email,
          subject: `${requester.username} barátnak jelölt téged`,
          html,
          text,
          unsubUrl
        });

        if (resp.ok) {
          sentCount++;
          await supabase.from('friendships').update({ email_sent: true }).eq('id', reqRow.id);
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