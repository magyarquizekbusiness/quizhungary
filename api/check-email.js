// Regisztrációs email ellenőrzés: GET /api/check-email?email=valaki@gmail.com
// Megnézi, hogy az email domainjének van-e levelezőszervere (MX rekord, DNS-over-HTTPS-en).
//   gmail.con, gmial.com, freemial.hu ... -> nincs MX -> { ok:false, reason:'no_mx' }
//   mailinator, yopmail ... (eldobható)   -> { ok:false, reason:'disposable' }
// Ha maga a DNS lekérdezés hibázik vagy lassú, ENGEDÜNK (valódi usert ne zárjunk ki).

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

// Ismert, biztosan létező szolgáltatók: ezeknél nem kérdezünk DNS-t.
const KNOWN_OK = new Set([
  'gmail.com', 'googlemail.com', 'freemail.hu', 'citromail.hu', 'hotmail.com', 'hotmail.hu',
  'outlook.com', 'outlook.hu', 'live.com', 'live.hu', 'msn.com', 'yahoo.com', 'icloud.com',
  'me.com', 't-online.hu', 'vipmail.hu', 'indamail.hu', 'protonmail.com', 'proton.me',
  'gmx.com', 'gmx.net', 'gmx.de', 'aol.com', 'upcmail.hu', 'invitel.hu', 'telenor.hu'
]);

// DNS-over-HTTPS lekérdezés (a Vercel futtatókörnyezet saját resolvere nem megbízható MX-re).
// Visszaad: 'exists' | 'nxdomain' | 'no_mail' | 'unknown'
async function dohLookup(domain, type, endpoint) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const r = await fetch(`${endpoint}?name=${encodeURIComponent(domain)}&type=${type}`, {
      headers: { accept: 'application/dns-json' }, signal: ctrl.signal
    });
    if (!r.ok) return 'unknown';
    const j = await r.json();
    if (j.Status === 3) return 'nxdomain';           // a domain nem létezik
    if (j.Status !== 0) return 'unknown';            // SERVFAIL stb.
    const answers = (j.Answer || []).filter(a => a.type === (type === 'MX' ? 15 : 1));
    if (type === 'MX') {
      const usable = answers.filter(a => !/^\s*\d+\s+\.?\s*$/.test(a.data)); // Null MX kiszűrése
      return usable.length ? 'exists' : 'no_mail';
    }
    return answers.length ? 'exists' : 'no_mail';
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
}

async function domainAcceptsMail(domain) {
  for (const endpoint of ['https://cloudflare-dns.com/dns-query', 'https://dns.google/resolve']) {
    const mx = await dohLookup(domain, 'MX', endpoint);
    if (mx === 'exists') return true;
    if (mx === 'nxdomain') return false;
    if (mx === 'no_mail') {
      // MX nélkül az A rekordra is lehet levelet küldeni (RFC 5321)
      const a = await dohLookup(domain, 'A', endpoint);
      if (a === 'exists') return true;
      if (a === 'nxdomain' || a === 'no_mail') return false;
    }
    // 'unknown' -> próbáljuk a következő resolvert
  }
  return null; // nem tudtuk eldönteni
}

async function checkDomain(domain) {
  const hit = cache.get(domain);
  if (hit && Date.now() - hit.t < TTL) return hit;

  let result;
  if (KNOWN_OK.has(domain)) {
    result = { ok: true };
  } else if (DISPOSABLE.has(domain)) {
    result = { ok: false, reason: 'disposable' };
  } else {
    const accepts = await domainAcceptsMail(domain);
    if (accepts === false) result = { ok: false, reason: 'no_mx' };
    else result = { ok: true, reason: accepts === null ? 'dns_unavailable' : null };
  }
  result.t = Date.now();
  if (result.reason !== 'dns_unavailable') cache.set(domain, result);
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
