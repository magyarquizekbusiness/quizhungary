import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Hiányzó token.');
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ email_reminders: false })
      .eq('unsubscribe_token', token)
      .select('username');

    const html = `
      <!DOCTYPE html>
      <html lang="hu">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Leiratkozás – QuizHungary</title>
        <style>
          body{font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
          .box{text-align:center;padding:2rem;max-width:420px;}
          h1{color:#e8192c;}
          a{color:#e8192c;}
          .btn{background:#e8192c;color:#fff;text-decoration:none;padding:0.8rem 2rem;border-radius:4px;display:inline-block;margin-top:1.5rem;}
        </style>
      </head>
      <body>
        <div class="box">
          <h1>QuizHungary</h1>
          ${(error || !data || !data.length)
            ? '<p>Nem sikerült a leiratkozás. Lehet, hogy a link érvénytelen.</p>'
            : '<p>✅ Sikeresen leiratkoztál az emlékeztető e-mailekről.</p><p style="color:#999;font-size:0.9rem;">Bármikor újra bekapcsolhatod a profilodban.</p>'}
          <a class="btn" href="${process.env.SITE_URL}">Vissza az oldalra</a>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    return res.status(500).send('Hiba történt: ' + err.message);
  }
}