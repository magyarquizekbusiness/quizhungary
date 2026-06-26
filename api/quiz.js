export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, verify } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  async function callOpenAI(messages, maxTokens, temp, model) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        max_tokens: maxTokens,
        temperature: temp,
        messages
      })
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  try {
    // 1. lepes: kerdesek generalasa (gyors, olcso modell)
    const generated = await callOpenAI([{ role: 'user', content: prompt }], 3000, 1.0, 'gpt-4o-mini');

    // Ha nem kerunk verifikaciot, visszaadjuk ahogy van
    if (!verify) {
      return res.status(200).json({ result: generated });
    }

    // 2. lepes: verifikacio EROSEBB modellel (gpt-4o) - pontosabb tenyellenorzes
    const verifyPrompt = `Te egy szigoru tenyellenor vagy egy magyar kviz-alkalmazasnal. Az alabbi kerdeseket kell ellenorizned JSON formatumban: [{"q":"kerdes","o":["A","B","C"],"a":helyes_index}].

ELLENORIZD minden egyes kerdest NAGYON alaposan. Egy kerdest KI KELL HAGYNI ha barmelyik igaz ra:
- A megjelolt helyes valasz (az "a" index altal mutatott opcio) tenylegesen NEM helyes.
- A kerdes HAMIS feltetelezest tartalmaz. Peldak hamis feltetelezesre:
  - "Mikor vezettek be az eurot Magyarorszagon?" -> HIBAS, mert Magyarorszag NEM vezette be az eurot, megtartotta a forintot.
  - Olyan esemenyrol kerdez ami meg sem tortent.
- Tobb valasz is helyes lehet, vagy egyik sem egyertelmuen helyes.
- A kerdes felrevezeto, pontatlan, vagy elavult adatot tartalmaz.

Ha egy kerdes tenyszeruen helyes, de a helyes valasz indexe ("a") rossz, JAVITSD KI az indexet a valoban helyes opciora.

Legy szigoru: inkabb hagyj ki egy bizonytalan kerdest, mint hogy hibasat engedj at. A magyar es europai vonatkozasu tenyekre kulonosen figyelj.

Add vissza CSAK a hibatlan, tenyszeruen helyes kerdeseket, ugyanabban a JSON formatumban. Csak valid JSON tombot adj vissza, semmi mast (se magyarazat, se markdown):

${generated}`;

    const verified = await callOpenAI([{ role: 'user', content: verifyPrompt }], 3000, 0.2, 'gpt-4o');

    return res.status(200).json({ result: verified });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
