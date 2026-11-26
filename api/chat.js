/* POST /api/chat — Gemini text: nutrition assistant.
   Body: {messages:[{role:'user'|'bot',text}], lang}
   Only the chat messages and language are sent — never profile or diary data.
   Returns: {ok:true, reply}
   Gemini key lives ONLY here (env GEMINI_API_KEY). */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ ok: false, error: 'GEMINI_API_KEY not set' });

  const { messages = [], lang = 'ar' } = req.body || {};
  const langName = { ar: 'Moroccan Arabic (Darija), simple and friendly', fr: 'French', en: 'English' }[lang] || 'Arabic';
  const sys =
    `You are NutriVision, a friendly nutrition assistant inside a food-tracking app. ` +
    `Always reply in ${langName}. Keep answers short (max 120 words), practical and encouraging. ` +
    `Give general nutrition information only: never diagnose, never prescribe, and recommend consulting a doctor for medical questions. ` +
    `Never invent nutrient numbers for specific branded products; speak in general estimates and suggest checking the app database. ` +
    `No personal profile or diary data is provided to you; do not ask for it, and say estimates are estimates.`;

  const contents = messages.slice(-10).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: String(m.text || '').slice(0, 2000) }]
  })).filter(m => m.parts[0].text);
  if (!contents.length) return res.status(400).json({ ok: false, error: 'messages required' });

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sys }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
        })
      }
    );
    if (!r.ok) return res.status(502).json({ ok: false, error: 'gemini ' + r.status });
    const data = await r.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    if (!reply) return res.status(502).json({ ok: false, error: 'empty' });
    return res.status(200).json({ ok: true, reply: reply.slice(0, 2000) });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'chat failed' });
  }
}
