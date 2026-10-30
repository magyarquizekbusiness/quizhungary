import { computePricing } from '../lib/book-pricing.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  try {
    const p = await computePricing(body || {});
    return res.status(200).json({ unitCents: p.unitCents, shippingCents: p.shippingCents, totalCents: p.totalCents, freeShipping: p.shippingCents === 0, currency: 'eur' });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}
