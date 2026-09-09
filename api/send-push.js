// Napi kvíz böngésző-push értesítés — OneSignal REST API-n keresztül.
// A Vercel cron 14:00 UTC-kor hívja, a tényleges kézbesítést viszont a mai nap
// 17:00 (Europe/Budapest) időpontjára ütemezzük a OneSignal `send_after` mezőjével.
// Így DST-től függetlenül (nyári/téli időszámítás) pontosan 17:00-kor érkezik.

export default async function handler(req, res) {
  // Biztonság: csak a Vercel Cron hívhatja (ugyanaz a minta, mint a send-reminders.js-ben)
  const authHeader = req.headers.authorization;
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const hasValidSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ error: 'CRON_SECRET nincs beállítva' });
  }
  if (!isVercelCron && !hasValidSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const APP_ID = process.env.ONESIGNAL_APP_ID;
  const API_KEY = process.env.ONESIGNAL_REST_API_KEY;
  if (!APP_ID || !API_KEY) {
    return res.status(500).json({ error: 'ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY nincs beállítva' });
  }

  // "Ma 17:00 Europe/Budapest" abszolút időpont kiszámítása — tz-könyvtár nélkül, DST-biztosan.
  const now = new Date();
  const offsetMin = budapestOffsetMinutes(now); // hány perccel jár Budapest az UTC előtt (60 tél / 120 nyár)
  const [Y, M, D] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now).split('-').map(Number);
  const sendAt = new Date(Date.UTC(Y, M - 1, D, 17, 0, 0) - offsetMin * 60000);

  const payload = {
    app_id: APP_ID,
    // Csak azok kapják, akik a profiljukban bekapcsolták a napi kvíz értesítést.
    filters: [{ field: 'tag', key: 'daily_quiz', relation: '=', value: 'on' }],
    headings: { en: 'Itt a napi kvíz! 🧠', hu: 'Itt a napi kvíz! 🧠' },
    contents: {
      en: 'Friss kérdések várnak — tartsd meg a sorozatod! 🔥',
      hu: 'Friss kérdések várnak — tartsd meg a sorozatod! 🔥'
    },
    url: process.env.SITE_URL || 'https://quizhungary.com/',
    // Ha a mai 17:00 budapesti időpont még a jövőben van, akkorra ütemezzük; különben azonnal megy.
    ...(sendAt.getTime() > Date.now() ? { send_after: sendAt.toISOString() } : {})
  };

  try {
    const resp = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (!resp.ok) {
      return res.status(502).json({ error: 'OneSignal hiba', detail: data });
    }
    return res.status(200).json({
      ok: true,
      scheduled_for: sendAt.toISOString(),
      recipients: data.recipients,
      id: data.id
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Europe/Budapest UTC-eltolása percben, adott időpontra (60 = tél/CET, 120 = nyár/CEST).
function budapestOffsetMinutes(date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Budapest', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p = dtf.formatToParts(date).reduce((a, x) => (a[x.type] = x.value, a), {});
  const hour = p.hour === '24' ? 0 : Number(p.hour);
  const asUTC = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second));
  return Math.round((asUTC - date.getTime()) / 60000);
}
