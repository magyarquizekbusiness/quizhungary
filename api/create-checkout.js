import Stripe from 'stripe';
import { getAuthedUser } from '../lib/auth.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // A felhasználót a hitelesített tokenből vesszük, nem a kérés törzséből.
  const authUser = await getAuthedUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
  const userId = authUser.id;
  const email = authUser.email;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.SITE_URL}/?payment=success`,
      cancel_url: `${process.env.SITE_URL}/?payment=cancel`,
      client_reference_id: userId,
      customer_email: email || undefined,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
      allow_promotion_codes: true,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}