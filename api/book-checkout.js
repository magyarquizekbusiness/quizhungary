import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { computePricing } from '../lib/book-pricing.js';
import { BOOK } from '../lib/lulu.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  // Nyomtatott termék: elállási jog 14 nap (személyre szabott nem), ezt a feltételek tartalmazzák – elfogadás kötelező.
  if (body.consent !== true) return res.status(400).json({ error: 'A feltételek elfogadása szükséges.' });

  try {
    // Az árat MINDIG a szerver számolja újra, a kliens adatainak nem hiszünk.
    const p = await computePricing(body);

    const { data: order, error: insErr } = await supabase.from('book_orders').insert({
      quantity: p.quantity, country: p.country, unit_cents: p.unitCents,
      shipping_cents: p.shippingCents, total_cents: p.totalCents,
      lulu_env: process.env.LULU_ENV === 'production' ? 'production' : 'sandbox',
      consent_at: new Date().toISOString(),
    }).select('id').single();
    if (insErr) throw insErr;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: p.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: p.unitCents,
          product_data: { name: 'A Nagy Kvízgyűjtemény – nyomtatott könyv', description: '300 kvízkérdés, 10 fejezet, 6×9 hüvelyk, puhafedeles' },
        },
      }],
      shipping_address_collection: { allowed_countries: [p.country] },
      phone_number_collection: { enabled: true },
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: p.shippingCents, currency: 'eur' },
          display_name: p.shippingCents === 0 ? 'Ingyenes szállítás (2+ könyv)' : 'Szállítás (postai)',
          delivery_estimate: { minimum: { unit: 'business_day', value: 7 }, maximum: { unit: 'business_day', value: 20 } },
        },
      }],
      success_url: `${process.env.SITE_URL}/konyv?payment=success`,
      cancel_url: `${process.env.SITE_URL}/konyv?payment=cancel`,
      client_reference_id: order.id,
      metadata: { product: 'book', order_id: order.id, quantity: String(p.quantity), country: p.country, state: p.state },
      custom_text: { submit: { message: 'Nyomtatott könyv, rendelésre gyártjuk (Lulu nyomda). Szállítás: 1–3 hét.' } },
    });

    await supabase.from('book_orders').update({ stripe_session_id: session.id }).eq('id', order.id);
    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('book-checkout hiba', e.message);
    return res.status(e.status || 500).json({ error: e.status ? e.message : 'Hiba történt, próbáld újra.' });
  }
}
