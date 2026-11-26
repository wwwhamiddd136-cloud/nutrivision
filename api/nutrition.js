/* POST /api/nutrition — USDA FoodData Central search, simplified per-100g values.
   Body: {query: string}
   Returns: {ok:true, results:[{fdcId, description, per100:{kcal,p,c,f,fib}}]}
   USDA key lives ONLY here (env USDA_API_KEY; falls back to USDA's public DEMO_KEY). */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
function nutrient(food, ids, kcalMode) {
  for (const n of food.foodNutrients || []) {
    const id = n.nutrientId ?? n.nutrient?.id;
    if (ids.includes(id)) {
      const unit = (n.unitName ?? n.nutrient?.unitName ?? '').toLowerCase();
      let v = n.value ?? n.amount ?? 0;
      if (kcalMode && unit === 'kj') v = v / 4.184;      // FDC mixes kJ and kcal
      return v;
    }
  }
  return 0;
}
export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim())
    return res.status(400).json({ ok: false, error: 'query required' });

  const key = process.env.USDA_API_KEY || 'DEMO_KEY';
  const url = 'https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + encodeURIComponent(key);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.trim().slice(0, 120),
        dataType: ['Foundation', 'SR Legacy'],
        pageSize: 6
      })
    });
    if (!r.ok) return res.status(502).json({ ok: false, error: 'usda ' + r.status });
    const data = await r.json();
    // nutrient ids: 1008 Energy(kcal), 2047 Energy Atwater General, 2048 Atwater Specific,
    // 1003 protein, 1005 carbs, 1004 fat, 1079 fiber
    const results = (data.foods || []).map(f => ({
      fdcId: f.fdcId,
      description: String(f.description || '').slice(0, 140),
      per100: {
        kcal: Math.round(nutrient(f, [1008, 2047, 2048], true)),
        p: Math.round(nutrient(f, [1003]) * 10) / 10,
        c: Math.round(nutrient(f, [1005]) * 10) / 10,
        f: Math.round(nutrient(f, [1004]) * 10) / 10,
        fib: Math.round(nutrient(f, [1079]) * 10) / 10
      }
    })).filter(f => f.per100.kcal > 0);
    return res.status(200).json({ ok: true, results });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'nutrition failed' });
  }
}
