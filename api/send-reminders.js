import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Biztonság: csak a Vercel Cron hívhatja (a CRON_SECRET-tel)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
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

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#fff;padding:0;border-radius:8px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#e8192c,#a01020);padding:2rem 1.5rem;text-align:center;">
            <h1 style="margin:0;font-size:1.8rem;letter-spacing:1px;">QUIZ<span style="color:#fff;">HUNGARY</span></h1>
          </div>
          <div style="padding:2rem 1.5rem;">
            <h2 style="color:#fff;margin-top:0;">Szia ${p.username || 'Játékos'}! 👋</h2>
            <p style="color:#ccc;font-size:1rem;line-height:1.6;">Ma még nem játszottál a QuizHungary-n! Ne hagyd elveszni a streakedet 🔥 — egy gyors kvíz csak pár percet vesz igénybe.</p>
            <p style="color:#ccc;font-size:1rem;line-height:1.6;">Teszteld a tudásod, szerezz pontokat és kerülj feljebb a ranglistán!</p>
            <div style="text-align:center;margin:2rem 0;">
              <a href="${playUrl}" style="background:#e8192c;color:#fff;text-decoration:none;padding:0.9rem 2.5rem;border-radius:4px;font-weight:bold;font-size:1rem;display:inline-block;">Játszom most →</a>
            </div>
          </div>
          <div style="padding:1.5rem;text-align:center;border-top:1px solid #222;">
            <p style="color:#666;font-size:0.75rem;margin:0;">QuizHungary – Magyarország #1 kvíz oldala</p>
            <p style="color:#666;font-size:0.75rem;margin:0.5rem 0 0;">
              <a href="${unsubUrl}" style="color:#888;text-decoration:underline;">Leiratkozás az emlékeztetőkről</a>
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
            subject: '🔥 Ne felejtsd el a napi kvízed!',
            html
          })
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
