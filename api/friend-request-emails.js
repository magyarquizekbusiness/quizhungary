import { createClient } from '@supabase/supabase-js';
import { buildEmail, sendEmail, escapeHtml, plainLine } from '../lib/email.js';
import { checkCronAuth } from '../lib/auth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Biztonság: csak a Vercel Cron hívhatja (CRON_SECRET)
  if (!checkCronAuth(req, res)) return;

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
      const name = escapeHtml(addressee.username || 'Játékos');

      const { html, text } = buildEmail({
        greeting: `Szia ${name}!`,
        paragraphs: [
          `<strong>${escapeHtml(requester.username)}</strong> barátnak jelölt téged a QuizHungary-n.`,
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
          subject: `${plainLine(requester.username)} barátnak jelölt téged`,
          html,
          text,
          unsubUrl
        });

        if (resp.ok) {
          sentCount++;
          await supabase.from('friendships').update({ email_sent: true }).eq('id', reqRow.id);
        } else {
          // Az e-mail címet csak a szerver logba írjuk, a válaszba nem.
          const errText = await resp.text();
          console.error('Friend request email failed:', email, errText);
          errors.push({ friendship: reqRow.id, status: resp.status });
        }
      } catch (e) {
        console.error('Friend request email failed:', email, e.message);
        errors.push({ friendship: reqRow.id, error: 'send_failed' });
      }
    }

    return res.status(200).json({ sent: sentCount, errors: errors.length ? errors : undefined });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}