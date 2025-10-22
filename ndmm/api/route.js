// ndmm/api/route.js
export default async function handler(req, res) {
  const ORS_KEY = process.env.ORS_API_KEY;
  if (!ORS_KEY) return res.status(500).json({ error: 'ORS_API_KEY not set' });

  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'start and end required (lon,lat)' });

  try {
    const url = `https://api.openrouteservice.org/v2/directions/foot-walking?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    const r = await fetch(url, { method: 'GET', headers: { 'Authorization': ORS_KEY, 'Accept': 'application/json' } });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (err) {
    console.error('route proxy error', err);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
}
