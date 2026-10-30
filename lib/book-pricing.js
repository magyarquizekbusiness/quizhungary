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

