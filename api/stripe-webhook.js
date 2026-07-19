import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Service role key needed to bypass RLS and update profiles
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// IMPORTANT: disable body parsing so we can verify the raw signature
export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id;
        if (userId) {
          await supabase.from('profiles').update({
            is_premium: true,
            stripe_customer_id: session.customer,
            subscription_status: 'active'
          }).eq('id', userId);
        }
        break;
      }
      case 'invoice.paid': {
        // Subscription renewed — keep premium active
        const invoice = event.data.object;
        const customerId = invoice.customer;
        // Get period end from the invoice line item
        let periodEnd = null;
        try {
          const lineEnd = invoice.lines?.data?.[0]?.period?.end;
          if (lineEnd) periodEnd = new Date(lineEnd * 1000).toISOString();
        } catch (e) {}
        if (customerId) {
          const update = { is_premium: true, subscription_status: 'active' };
          if (periodEnd) update.subscription_end = periodEnd;
          await supabase.from('profiles').update(update).eq('stripe_customer_id', customerId);
        }
        break;
      }
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const isActive = sub.status === 'active' || sub.status === 'trialing';
        const update = { is_premium: isActive, subscription_status: sub.status };
        if (sub.current_period_end) {
          update.subscription_end = new Date(sub.current_period_end * 1000).toISOString();
        }
        if (customerId) {
          await supabase.from('profiles').update(update).eq('stripe_customer_id', customerId);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        if (customerId) {
          await supabase.from('profiles').update({
            subscription_status: 'past_due'
          }).eq('stripe_customer_id', customerId);
        }
        break;
      }
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}