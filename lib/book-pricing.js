import { BOOK, EU_COUNTRIES, STATE_REQUIRED, quoteShipping } from './lulu.js';

// Szerver oldali árszámítás – a kliens csak megjeleníti. Ugyanezt a logikát használja a checkout is.
export async function computePricing(input) {
  const quantity = parseInt(input.quantity, 10);
  const country = String(input.country || '').toUpperCase();
  const city = String(input.city || '').trim();
  const postcode = String(input.postcode || '').trim();
  const state = String(input.state || '').trim().toUpperCase();

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > BOOK.maxQty) throw Object.assign(new Error('Érvénytelen darabszám.'), { status: 400 });
  if (!EU_COUNTRIES.includes(country)) throw Object.assign(new Error('Ebbe az országba jelenleg nem szállítunk.'), { status: 400 });
  if (!city || !postcode) throw Object.assign(new Error('Add meg a várost és az irányítószámot.'), { status: 400 });
  if (STATE_REQUIRED.includes(country) && !state) throw Object.assign(new Error('Add meg a tartomány kódját.'), { status: 400 });

  const unitCents = BOOK.priceCents;
  let shippingCents = 0;
  if (quantity < BOOK.freeShippingFrom) {
    try {
      shippingCents = (await quoteShipping({ quantity, country, city, postcode, state })).shippingCents;
    } catch (e) {
      console.error('Lulu quote hiba', e.message, JSON.stringify(e.detail || {}));
      throw Object.assign(new Error('A szállítási díjat nem sikerült kiszámolni. Ellenőrizd a címadatokat.'), { status: 422 });
    }
  }
  return { quantity, country, city, postcode, state, unitCents, shippingCents, totalCents: unitCents * quantity + shippingCents };
}


// A vevő adatainak ellenőrzése és normalizálása (szerver oldalon, a kliensnek nem hiszünk).
const t = (v, max = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const bad = (m) => Object.assign(new Error(m), { status: 400 });

export function normalizePhone(raw) {
  const d = String(raw || '').replace(/[^\d+]/g, '');
  let n = d.startsWith('+') ? d.slice(1) : d.startsWith('00') ? d.slice(2) : d.startsWith('06') ? '36' + d.slice(2) : d;
  if (/^36\d{8,9}$/.test(n)) return '+' + n;
  if (/^\d{9,15}$/.test(n) && !n.startsWith('36') && d.startsWith('+')) return '+' + n;
  return null;
}

export function validateDetails(b, country) {
  const name = t(b.name, 100);
  const email = t(b.email, 120).toLowerCase();
  const street1 = t(b.street1, 100);
  const street2 = t(b.street2, 100);
  const note = t(b.note, 300);
  if (name.length < 3 || !name.includes(' ')) throw bad('Add meg a teljes neved (vezeték- és keresztnév).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw bad('Adj meg érvényes e-mail címet.');
  const phone = normalizePhone(b.phone);
  if (!phone) throw bad('Adj meg érvényes telefonszámot (pl. +36 30 123 4567). A futárnak és a nyomdának kell.');
  if (street1.length < 3 || !/\d/.test(street1)) throw bad('Add meg az utcát és a házszámot.');
  const postcode = t(b.postcode, 12), city = t(b.city, 80);
  if (country === 'HU' && !/^\d{4}$/.test(postcode)) throw bad('Az irányítószám 4 számjegyű legyen.');

  const shipping = { name, street1, street2, city, postcode, country_code: country, state_code: '', phone_number: phone };

  let billing;
  if (b.billingSame !== false) {
    billing = { same: true, name, street1, street2, city, postcode, country_code: country };
  } else {
    const bn = t(b.billName, 120), bs = t(b.billStreet, 100), bz = t(b.billPostcode, 12), bc = t(b.billCity, 80);
    if (bn.length < 2) throw bad('Add meg a számlázási nevet.');
    if (bs.length < 3 || !/\d/.test(bs)) throw bad('Add meg a számlázási utcát és házszámot.');
    if (country === 'HU' && !/^\d{4}$/.test(bz)) throw bad('A számlázási irányítószám 4 számjegyű legyen.');
    if (bc.length < 2) throw bad('Add meg a számlázási várost.');
    billing = { same: false, name: bn, street1: bs, city: bc, postcode: bz, country_code: country };
  }
  if (b.company === true) {
    const tax = t(b.taxNumber, 20);
    if (!/^\d{8}-\d-\d{2}$/.test(tax)) throw bad('Az adószám formátuma: 12345678-1-23.');
    billing.company = true; billing.tax_number = tax;
  }
  return { email, shipping, billing, note };
}
