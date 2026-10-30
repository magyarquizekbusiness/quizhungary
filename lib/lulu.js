// Lulu Print API segéd: hitelesítés, költségszámítás, nyomdai megrendelés.
// LULU_ENV=production esetén éles, egyébként SANDBOX (biztonságos alapérték).

export const BOOK = {
  podPackageId: '0600X0900BWSTDPB060UC444MXX', // 6x9 in, fekete-fehér, krém, matt borító
  pageCount: 98,
  priceCents: 17_00,            // 17 EUR / db (bruttó, a Stripe-ban is ez)
  freeShippingFrom: 2,          // 2 db-tól ingyenes szállítás
  maxQty: 10,
  shippingLevel: 'MAIL',
};

// EU-27. A rendelés csak ezekbe az országokba megy.
export const EU_COUNTRIES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
// Ahol a Lulu állam/tartomány kódot kér.
export const STATE_REQUIRED = ['ES', 'IT'];

const base = () => process.env.LULU_ENV === 'production' ? 'https://api.lulu.com' : 'https://api.sandbox.lulu.com';

let cached = { token: null, exp: 0 };
export async function getToken() {
  if (cached.token && Date.now() < cached.exp) return cached.token;
  const basic = Buffer.from(`${process.env.LULU_CLIENT_KEY}:${process.env.LULU_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${base()}/auth/realms/glasstree/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Lulu auth hiba (${r.status})`);
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return cached.token;
}

async function luluFetch(path, body) {
  const token = await getToken();
  const r = await fetch(base() + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { j = { raw: text }; }
  if (!r.ok) {
    const err = new Error(`Lulu ${path} hiba (${r.status})`);
    err.detail = j;
    throw err;
  }
  return j;
}

// Nyomtatási + szállítási költség (EUR). Visszaad: { shippingCents, printCents }
export async function quoteShipping({ quantity, country, city, postcode, state }) {
  const j = await luluFetch('/print-job-cost-calculations/', {
    line_items: [{ page_count: BOOK.pageCount, pod_package_id: BOOK.podPackageId, quantity }],
    shipping_address: {
      name: 'QuizHungary vevo', street1: 'Utca 1', city, postcode,
      country_code: country, state_code: state || '', phone_number: '+36301234567',
    },
    shipping_option: BOOK.shippingLevel,
  });
  const cents = (v) => Math.round(parseFloat(v) * 100);
  return {
    shippingCents: cents(j.shipping_cost?.total_cost_incl_tax ?? j.shipping_cost?.total_cost_excl_tax),
    printCents: cents(j.line_item_costs?.[0]?.total_cost_incl_tax ?? 0),
    currency: j.currency,
  };
}

// Nyomdai megrendelés. interiorUrl / coverUrl: letölthető (aláírt) PDF URL-ek.
export async function createPrintJob({ orderId, email, quantity, address, interiorUrl, coverUrl }) {
  return luluFetch('/print-jobs/', {
    contact_email: process.env.LULU_CONTACT_EMAIL || 'info@quizhungary.com',
    external_id: orderId,
    production_delay: 120, // percben: ennyi időn belül még visszavonható
    shipping_level: BOOK.shippingLevel,
    line_items: [{
      external_id: `${orderId}-1`,
      title: 'A Nagy Kvízgyűjtemény',
      quantity,
      printable_normalization: {
        pod_package_id: BOOK.podPackageId,
        cover: { source_url: coverUrl },
        interior: { source_url: interiorUrl },
      },
    }],
    shipping_address: { ...address, email },
  });
}
