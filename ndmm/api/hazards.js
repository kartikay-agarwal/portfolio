// ndmm/api/hazards.js
export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
  const hazards = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { type: "flood", severity: "high", name: "Demo Flood Zone", updated: new Date().toISOString() },
        geometry: { type: "Polygon", coordinates: [[[77.5910,12.9700],[77.5920,12.9730],[77.5970,12.9740],[77.5960,12.9710],[77.5910,12.9700]]] }
      }
    ]
  };
  res.status(200).json(hazards);
}
