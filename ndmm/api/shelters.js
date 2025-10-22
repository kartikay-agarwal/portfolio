// ndmm/api/shelters.js
export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
  const shelters = {
    "type": "FeatureCollection",
    "features": [
      { "type": "Feature", "properties": { "name": "City Hall Shelter" }, "geometry": { "type": "Point", "coordinates": [77.5933, 12.9721] } },
      { "type": "Feature", "properties": { "name": "Community Center" }, "geometry": { "type": "Point", "coordinates": [77.5980, 12.9755] } },
      { "type": "Feature", "properties": { "name": "VIT Shelter" }, "geometry": { "type": "Point", "coordinates": [77.6000, 12.9680] } }
    ]
  };
  res.status(200).json(shelters);
}
