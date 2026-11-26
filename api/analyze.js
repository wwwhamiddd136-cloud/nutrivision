/* POST /api/analyze — Gemini vision: identify meal ingredients + estimated grams.
   Body: {image: dataURL(base64 jpeg), lang: 'ar'|'fr'|'en'}
   Returns: {ok:true, dish, dish_en, items:[{name, name_en, grams, confidence}]}
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

  const { image, lang = 'ar' } = req.body || {};
  if (!image || typeof image !== 'string' || image.length > 8_000_000)
    return res.status(400).json({ ok: false, error: 'image required' });
  const b64 = image.includes(',') ? image.split(',')[1] : image;

  const langName = { ar: 'Modern Standard Arabic (الفصحى), never Darija or any dialect', fr: 'French', en: 'English' }[lang] || 'Modern Standard Arabic';
  const prompt =
    `You are a food recognition system. Look at this meal photo. ` +
    `Reply with ONLY a JSON object, no markdown, no extra text:\n` +
    `{"dish": "dish name in ${langName}", "dish_en": "dish name in English", "items": [` +
    `{"name": "ingredient name in ${langName}", "name_en": "simple English name for USDA database search, e.g. 'chicken breast cooked' or 'rice white cooked'", ` +
    `"grams": estimated portion weight in grams as a number, "confidence": "high|medium|low"}]}\n` +
    `Rules: list each visible ingredient separately (max 10). Estimate realistic gram weights for the portions shown. ` +
    `name_en must be plain searchable food names, not descriptions of the photo. If this is not food, return {"dish":"", "items":[]}.`;

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: b64 } }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1200, response_mime_type: 'application/json' }
        })
      }
    );
    if (!r.ok) return res.status(502).json({ ok: false, error: 'gemini ' + r.status });
    const data = await r.json();
    let text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    text = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.items)) parsed.items = [];
    parsed.items = parsed.items.slice(0, 10).map(it => ({
      name: String(it.name || it.name_en || '').slice(0, 80),
      name_en: String(it.name_en || it.name || '').slice(0, 80),
      grams: Math.max(1, Math.min(2000, Math.round(Number(it.grams) || 100))),
      confidence: ['high', 'medium', 'low'].includes(it.confidence) ? it.confidence : 'medium'
    }));
    return res.status(200).json({ ok: true, dish: String(parsed.dish || '').slice(0, 120), dish_en: String(parsed.dish_en || '').slice(0, 120), items: parsed.items });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'analyze failed' });
  }
}
