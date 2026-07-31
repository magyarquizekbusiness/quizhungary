// Közös email-építő és -küldő segédmodul.
//
// Cél: a Gmail "Elsődleges" fülre kerüljenek az emailek a "Promóciók" helyett.
// Ezt úgy érjük el, hogy a levelek személyes hangvételűek, könnyű felépítésűek,
// van plain-text változatuk, és tartalmazzák a szabványos leiratkozási fejléceket
// (RFC 8058 egykattintásos leiratkozás), amit a Gmail bulk-sender szabályai elvárnak.

const ACCENT = '#e8192c';

// Világos, levélszerű HTML sablon – kerüli a nagy gradiens bannereket és a
// feltűnő CTA-gombokat, amiket a Gmail "promóciós" jelként értékel.
export function buildEmail({ greeting, paragraphs, ctaLabel, ctaUrl, signoff, footerNote, unsubUrl, unsubLabel }) {
  const paraHtml = paragraphs
    .map(p => `<p style="margin:0 0 14px;">${p}</p>`)
    .join('');

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a;font-size:15px;line-height:1.6;">
  <p style="margin:0 0 14px;">${greeting}</p>
  ${paraHtml}
  <p style="margin:0 0 14px;"><a href="${ctaUrl}" style="color:${ACCENT};font-weight:600;text-decoration:none;">${ctaLabel} &rarr;</a></p>
  <p style="margin:0 0 4px;color:#555;">${signoff}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:22px 0 14px;">
  <p style="margin:0;color:#999;font-size:12px;line-height:1.5;">${footerNote} <a href="${unsubUrl}" style="color:#999;">${unsubLabel}</a></p>
</div>`;

  // Plain-text változat – jelentősen javítja a kézbesíthetőséget és az
  // Elsődleges fülre kerülés esélyét.
  const text = [
    greeting,
    '',
    ...paragraphs.map(stripHtml),
    '',
    `${stripHtml(ctaLabel)}: ${ctaUrl}`,
    '',
    stripHtml(signoff),
    '',
    `${stripHtml(footerNote)} ${unsubUrl}`
  ].join('\n');

  return { html, text };
}

function stripHtml(s) {
  return String(s).replace(/<[^>]+>/g, '').replace(/&rarr;/g, '→').replace(/&nbsp;/g, ' ').trim();
}

// Egységes küldés a Resend API-n keresztül, a helyes fejlécekkel.
export async function sendEmail({ to, subject, html, text, unsubUrl }) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'QuizHungary <info@quizhungary.com>',
      reply_to: 'info@quizhungary.com',
      to,
      subject,
      html,
      text,
      headers: {
        // Egykattintásos leiratkozás (RFC 8058) – a Gmail/Yahoo bulk-sender
        // szabályai megkövetelik, és megbízhatóbb feladóként kezeli a levelet.
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      }
    })
  });
}
