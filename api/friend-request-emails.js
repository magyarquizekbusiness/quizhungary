import { createClient } from '@supabase/supabase-js';

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

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#fff;padding:0;border-radius:8px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#e8192c,#a01020);padding:2rem 1.5rem;text-align:center;">
            <h1 style="margin:0;font-size:1.8rem;letter-spacing:1px;">QUIZ<span style="color:#fff;">HUNGARY</span></h1>
          </div>
          <div style="padding:2rem 1.5rem;">
            <h2 style="color:#fff;margin-top:0;">Szia ${addressee.username || 'Játékos'}! 👋</h2>
            <p style="color:#ccc;font-size:1rem;line-height:1.6;"><strong style="color:#fff;">${requester.username}</strong> barátnak jelölt a QuizHungary-n! 🤝</p>
            <p style="color:#ccc;font-size:1rem;line-height:1.6;">Fogadd el a kérelmet, és máris cseveghettek, vagy kihívhatjátok egymást egy párbajra!</p>
            <div style="text-align:center;margin:2rem 0;">
              <a href="${playUrl}" style="background:#e8192c;color:#fff;text-decoration:none;padding:0.9rem 2.5rem;border-radius:4px;font-weight:bold;font-size:1rem;display:inline-block;">Kérelem megtekintése →</a>
            </div>
          </div>
          <div style="padding:1.5rem;text-align:center;border-top:1px solid #222;">
            <p style="color:#666;font-size:0.75rem;margin:0;">QuizHungary – Magyarország #1 kvíz oldala</p>
            <p style="color:#666;font-size:0.75rem;margin:0.5rem 0 0;">
              <a href="${unsubUrl}" style="color:#888;text-decoration:underline;">Leiratkozás az értesítésekről</a>
            </p>
          </div>
        </div>
      `;

      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'QuizHungary <info@quizhungary.com>',
            to: email,
            subject: `🤝 ${requester.username} barátnak jelölt!`,
            html
          })
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
