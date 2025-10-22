import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';

// Fix default icon issues with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_BASE = process.env.REACT_APP_API_BASE || '/api';

export default function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [safeRoute, setSafeRoute] = useState(null);
  const [nearestShelter, setNearestShelter] = useState(null);
  const [shelters, setShelters] = useState([]);
  const dangerZone = [
    [12.9700, 77.5910],
    [12.9730, 77.5920],
    [12.9740, 77.5970],
    [12.9710, 77.5960],
    [12.9700, 77.5910],
  ];

  useEffect(() => {
    // load shelters from backend
    fetch(`${API_BASE}/shelters`).then(r=>r.json()).then(data=>{
      // convert GeoJSON features to simple array
      const list = data.features.map(f => ({
        name: f.properties.name,
        coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]]
      }));
      setShelters(list);
    }).catch(console.error);

    // get browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      }, err => {
        console.warn('Geolocation failed', err);
      });
    }
  }, []);

  const isSafe = (coords) => {
    const point = turf.point([coords[1], coords[0]]);
    const polygon = turf.polygon([[...dangerZone.map(([lat, lon]) => [lon, lat])]]);
    return !turf.booleanPointInPolygon(point, polygon);
  };

  const findNearestShelter = async () => {
    if (!userLocation || shelters.length === 0) return;
    let minDistance = Infinity;
    let nearest = null;
    shelters.forEach(shelter => {
      if (isSafe(shelter.coords)) {
        const dist = turf.distance(turf.point([userLocation[1], userLocation[0]]), turf.point([shelter.coords[1], shelter.coords[0]]));
        if (dist < minDistance) { minDistance = dist; nearest = shelter; }
      }
    });
    setNearestShelter(nearest);
    if (nearest) {
      // call backend to get route (backend proxies ORS)
      const start = `${userLocation[1]},${userLocation[0]}`; // lon,lat
      const end = `${nearest.coords[1]},${nearest.coords[0]}`;
      try {
        const res = await fetch(`${API_BASE}/route?start=${start}&end=${end}`);
        const data = await res.json();
        const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
        setSafeRoute(coords);
      } catch (err) { console.error('Route error', err); }
    }
  };

  return (
    <div style={{maxWidth:1000, margin:'0 auto'}}>
      <h1 style={{fontSize:22, marginBottom:6}}>Disaster Safe Map</h1>
      <p>Locate shelters and get a safe walking route during emergencies.</p>
      <div style={{display:'flex', gap:12, marginBottom:12}}>
        <button onClick={findNearestShelter} style={{padding:'8px 12px', background:'#0369a1', color:'white', borderRadius:8}}>Find Safe Route</button>
        <div style={{alignSelf:'center'}}>{nearestShelter ? <strong>Nearest: {nearestShelter.name}</strong> : 'No shelter selected'}</div>
      </div>

      <div style={{height:520}}>
        <MapContainer center={[12.9716,77.5946]} zoom={14} className="leaflet-container" style={{height:'100%', width:'100%'}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
          {userLocation && <Marker position={userLocation}><Popup>You are here</Popup></Marker>}
          <Polygon positions={dangerZone} pathOptions={{color:'red', fillOpacity:0.2}}><Popup>Danger Zone</Popup></Polygon>
          {shelters.map((s,i)=>(<Marker key={i} position={s.coords}><Popup>{s.name}</Popup></Marker>))}
          {safeRoute && <Polyline positions={safeRoute} pathOptions={{color:'blue', weight:5}} />}
        </MapContainer>
      </div>
    </div>
  );
}
