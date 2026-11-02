// Regisztrációs email ellenőrzés: GET /api/check-email?email=valaki@gmail.com
// Megnézi, hogy az email domainjének van-e levelezőszervere (MX rekord).
//   gmail.con, gmial.com, freemial.hu ... -> nincs MX -> { ok:false, reason:'no_mx' }
//   mailinator, yopmail ... (eldobható)   -> { ok:false, reason:'disposable' }
// Ha maga a DNS lekérdezés hibázik vagy lassú, ENGEDÜNK (valódi usert ne zárjunk ki).

import { promises as dns } from 'dns';

const DISPOSABLE = new Set([
  'mailinator.com', 'yopmail.com', 'guerrillamail.com', 'guerrillamail.net',
  'sharklasers.com', '10minutemail.com', 'temp-mail.org', 'tempmail.com',
  'trashmail.com', 'getnada.com', 'maildrop.cc', 'dispostable.com',
  'throwawaymail.com', 'fakeinbox.com', 'mintemail.com', 'mohmal.com',
  'emailondeck.com', 'tempail.com', 'example.com', 'example.org', 'test.com'
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const cache = new Map(); // domain -> { ok, reason, t }  (meleg függvénypéldányon belül)
const TTL = 6 * 60 * 60 * 1000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms))
  ]);
}

async function checkDomain(domain) {
  const hit = cache.get(domain);
  if (hit && Date.now() - hit.t < TTL) return hit;

  let result;
  if (DISPOSABLE.has(domain)) {
    result = { ok: false, reason: 'disposable' };
  } else {
    try {
      const mx = await withTimeout(dns.resolveMx(domain), 3000);
      // "Null MX" (RFC 7505): a domain kifejezetten nem fogad levelet
      const usable = mx.filter(r => r.exchange && r.exchange !== '.');
      result = usable.length ? { ok: true } : { ok: false, reason: 'no_mx' };
    } catch (err) {
      if (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'NXDOMAIN') {
        result = { ok: false, reason: 'no_mx' };
      } else {
        result = { ok: true, reason: 'dns_unavailable' }; // SERVFAIL, timeout stb.
      }
    }
  }
  result.t = Date.now();
  cache.set(domain, result);
  return result;
}

export default async function handler(req, res) {
  const email = String(req.query?.email || '').trim().toLowerCase();
  res.setHeader('Cache-Control', 'no-store');

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(200).json({ ok: false, reason: 'format' });
  }
  const { ok, reason } = await checkDomain(email.split('@').pop());
  return res.status(200).json({ ok, reason: reason || null });
}
