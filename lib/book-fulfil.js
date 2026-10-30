// Fizetett könyvrendelés teljesítése: címadat mentése, Lulu nyomdai megrendelés, e-mailek.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createPrintJob, STATE_REQUIRED } from './lulu.js';
import { sendEmail } from './email.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function signedUrl(path) {
  const { data, error } = await supabase.storage.from('book-files').createSignedUrl(path, 60 * 60 * 24);
  if (error) throw new Error(`Aláírt URL hiba (${path}): ${error.message}`);
  return data.signedUrl;
}

async function alertOwner(subject, text) {
  try {
    await sendEmail({ to: 'info@quizhungary.com', subject, text, html: `<pre>${text}</pre>`, unsubUrl: `${process.env.SITE_URL}/adatvedelem` });
  } catch (e) { console.error('alertOwner hiba', e.message); }
}

export async function fulfilBookOrder(sessionFromEvent) {
  const orderId = sessionFromEvent.metadata?.order_id;
  if (!orderId) return;

  const { data: order } = await supabase.from('book_orders').select('*').eq('id', orderId).single();
  if (!order) { console.error('Ismeretlen könyvrendelés', orderId); return; }
  // Idempotens: a Stripe újraküldheti az eseményt.
  if (order.status === 'submitted') return;

  // A szállítási és számlázási adatot a rendelés leadásakor mentettük (szerver által ellenőrizve).
  const session = await stripe.checkout.sessions.retrieve(sessionFromEvent.id);
  const email = order.email || session.customer_details?.email || null;
  const address = order.shipping_address;

  // Védelem: a fizetett összeg egyezzen a szerver által számolttal.
  if (!address || session.amount_total !== order.total_cents) {
    await supabase.from('book_orders').update({ status: 'lulu_error', error: `Eltérés: amount ${session.amount_total}/${order.total_cents}, cím: ${address ? 'van' : 'hiányzik'}` }).eq('id', orderId);
    await alertOwner('Könyvrendelés: ellenőrizendő eltérés', `Rendelés: ${orderId}\nStripe session: ${session.id}\nAz összeg nem egyezik, vagy hiányzik a cím.`);
    return;
  }

  await supabase.from('book_orders').update({
    status: 'paid', stripe_payment_intent: session.payment_intent,
  }).eq('id', orderId);

  const b = order.billing || {};
  await alertOwner(`Új könyvrendelés (fizetve): ${order.quantity} db – számlázandó`,
    `Rendelés: ${orderId}\nÖsszeg: ${(order.total_cents / 100).toFixed(2)} EUR\nDarab: ${order.quantity}\n\nSzámlázási adatok:\n${b.name}${b.company ? ' (cég, adószám: ' + b.tax_number + ')' : ''}\n${b.postcode} ${b.city}, ${b.street1}\nE-mail: ${email}\n\nSzállítás:\n${address.name}, ${address.postcode} ${address.city}, ${address.street1} ${address.street2 || ''}\nTel: ${address.phone_number}\nMegjegyzés: ${order.note || '-'}`);

  try {
    if (STATE_REQUIRED.includes(address.country_code) && !address.state_code) throw new Error('Hiányzó állam/tartomány kód');
    const job = await createPrintJob({
      orderId, email, quantity: order.quantity, address,
      interiorUrl: await signedUrl('interior.pdf'),
      coverUrl: await signedUrl('cover.pdf'),
    });
    await supabase.from('book_orders').update({ status: 'submitted', lulu_print_job_id: String(job.id), error: null }).eq('id', orderId);
  } catch (e) {
    const detail = JSON.stringify(e.detail || {}).slice(0, 1500);
    console.error('Lulu print job hiba', e.message, detail);
    await supabase.from('book_orders').update({ status: 'lulu_error', error: `${e.message} ${detail}`.slice(0, 2000) }).eq('id', orderId);
    await alertOwner('Könyvrendelés: Lulu hiba (fizetve, kézi beavatkozás kell)', `Rendelés: ${orderId}\nHiba: ${e.message}\n${detail}`);
  }

  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: 'Köszönjük a rendelésed – A Nagy Kvízgyűjtemény',
        text: `Köszönjük a rendelésed! ${order.quantity} db könyvet gyártunk le neked, és postán küldjük a megadott címre. A gyártás és szállítás általában 1–3 hét. Kérdés esetén: info@quizhungary.com. Rendelésszám: ${orderId}`,
        html: `<p>Köszönjük a rendelésed!</p><p><b>${order.quantity} db</b> „A Nagy Kvízgyűjtemény" könyvet gyártunk le neked, és postán küldjük a megadott címre. A gyártás és szállítás általában 1–3 hét.</p><p>Kérdés esetén: info@quizhungary.com<br>Rendelésszám: ${orderId}</p>`,
        unsubUrl: `${process.env.SITE_URL}/adatvedelem`,
      });
    } catch (e) { console.error('Vevő e-mail hiba', e.message); }
  }
}
