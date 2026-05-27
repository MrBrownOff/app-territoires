const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const parseKml = require('./kml-parser');
const axios = require('axios');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Headers additionnels
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Supabase (optionnel - désactivé pour Railway)
let supabase = null;
// Supabase est désactivé car nous n'utilisons que localStorage pour persister les zones

// ===== ROUTES =====

// Parser CSV robuste (gère les guillemets)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// GET - Charger magasins Canac
app.get('/api/clients', async (req, res) => {
  try {
    const csvPath = path.join(__dirname, '../data/Ditributeurs_Canac_-_Points_de_vente_Interbois.csv');
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'Fichier Canac non trouvé' });
    }

    const clients = fs.readFileSync(csvPath, 'utf8')
      .split('\n')
      .slice(1)  // Ignorer en-tête
      .filter(line => line.trim())
      .map(line => {
        const parts = parseCSVLine(line);
        const lat = parseFloat(parts[5]);
        const lon = parseFloat(parts[6]);

        // Vérifier que lat/lon sont valides
        if (isNaN(lat) || isNaN(lon)) {
          console.warn('Coordonnées invalides:', parts[1], parts[5], parts[6]);
          return null;
        }

        return {
          id: parts[0]?.trim(),
          name: parts[1]?.trim(),
          frequency: parts[2]?.trim(),
          city: parts[3]?.trim(),
          region: parts[4]?.trim(),
          lat: lat,
          lon: lon,
          type: 'canac',
          enseigne: 'CANAC'
        };
      })
      .filter(c => c !== null && c.lat && c.lon);

    console.log(`✅ Chargé ${clients.length} magasins Canac`);
    res.json(clients);
  } catch (error) {
    console.error('Erreur chargement Canac:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Prospects supprimé (on utilise seulement Canac)

// GET - Charger zones (localStorage côté client)
app.get('/api/zones', (req, res) => {
  // Zones gérées en localStorage côté client
  res.json([]);
});

// POST - Zones sauvegardées en localStorage côté client
app.post('/api/zones', (req, res) => {
  res.json({ success: true, message: 'Zone sauvegardée en localStorage' });
});

// DELETE - Zones supprimées en localStorage côté client
app.delete('/api/zones/:id', (req, res) => {
  res.json({ success: true });
});

// Calcul distance Haversine (fallback)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Decode polyline (Valhalla format)
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let result = 0, shift = 0;
    for (let i = 0; i < 32; i++) {
      const b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
      if (b < 0x20) break;
    }
    lat += (result & 1) ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    for (let i = 0; i < 32; i++) {
      const b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
      if (b < 0x20) break;
    }
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// Generate curved polyline for visual representation when real routing unavailable
function generateCurvedPolyline(from, to, segments = 15) {
  const polyline = [{ lat: from.lat, lng: from.lng }];
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  const offsetLng = (to.lng - from.lng) * 0.1; // slight perpendicular offset

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    // Bezier curve with control point offset
    const lat = from.lat + (to.lat - from.lat) * t;
    const lng = from.lng + (to.lng - from.lng) * t + offsetLng * Math.sin(Math.PI * t);
    polyline.push({ lat, lng });
  }
  polyline.push({ lat: to.lat, lng: to.lng });
  return polyline;
}

// POST - Calculer itinéraire
// POST - Sauvegarder domicile rep
app.post('/api/rep-location', async (req, res) => {
  try {
    const { rep, lat, lon } = req.body;

    if (!supabase) {
      console.log('ℹ️ Rep location sauvegardée en localStorage (Supabase indisponible)');
      res.json({ success: true, message: 'Sauvegardée en localStorage' });
      return;
    }

    const { data, error } = await supabase
      .from('rep_locations')
      .upsert({
        rep_number: rep,
        lat,
        lon,
        updated_at: new Date()
      }, { onConflict: 'rep_number' });

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur sauvegarde location:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Charger domiciles reps
app.get('/api/rep-locations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rep_locations')
      .select('*');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Erreur chargement locations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate real route distance using accessible API or approximation
app.post('/api/route', async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) {
      return res.status(400).json({ error: 'from et to requis' });
    }

    // Try multiple routing services
    let routeData = null;

    // Try 0: OSRM public (completely free, no auth needed)
    if (!routeData) {
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
        const response = await axios.get(osrmUrl, { timeout: 5000 });
        if (response.data && response.data.routes && response.data.routes[0]) {
          const route = response.data.routes[0];
          const distance = route.distance / 1000; // convert m to km
          const duration = route.duration / 60; // convert s to minutes
          const polyline = route.geometry?.coordinates?.map(p => ({ lat: p[1], lng: p[0] })) || [];
          routeData = {
            distance: Math.round(distance * 10) / 10,
            duration: Math.round(duration),
            polyline: polyline.length > 0 ? polyline : generateCurvedPolyline(from, to, 15)
          };
          console.log('✓ OSRM succeeded:', distance.toFixed(1), 'km,', Math.round(duration), 'min');
        }
      } catch (err) {
        console.log('✗ OSRM failed:', err.response?.status || err.message);
      }
    }

    // Try 1: Woosmap (priority - real routing with true distances/times)
    if (process.env.WOOSMAP_API_KEY) {
      try {
        const woosUrl = `https://api.woosmap.com/distance/route/json?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&key=${process.env.WOOSMAP_API_KEY}`;
        const response = await axios.get(woosUrl, { timeout: 5000 });
        if (response.data && response.data.routes && response.data.routes[0]) {
          const route = response.data.routes[0];
          const distance = route.distance.value / 1000; // convert m to km
          const duration = route.duration.value / 60; // convert s to minutes

          // Debug: log what we get from Woosmap
          console.log('Woosmap response keys:', Object.keys(route));
          console.log('Has overview_polyline?', !!route.overview_polyline);
          if (route.overview_polyline) {
            console.log('overview_polyline keys:', Object.keys(route.overview_polyline));
          }

          // Decode polyline from overview_polyline
          let polyline = [];
          if (route.overview_polyline?.points) {
            polyline = decodePolyline(route.overview_polyline.points)
              .map(p => ({ lat: p[0], lng: p[1] }));
            console.log('✓ Woosmap polyline decoded:', polyline.length, 'points');
          } else {
            console.log('⚠ Woosmap no overview_polyline, using approximation');
          }

          // Fallback to curved approximation if no polyline
          if (polyline.length === 0) {
            polyline = generateCurvedPolyline(from, to, 15);
          }

          routeData = {
            distance: Math.round(distance * 10) / 10,
            duration: Math.round(duration),
            polyline
          };
          console.log('✓ Woosmap succeeded:', distance.toFixed(1), 'km,', Math.round(duration), 'min');
        }
      } catch (err) {
        console.log('✗ Woosmap failed:', err.response?.status || err.message);
      }
    }

    // Try 1: Valhalla (open source alternative)
    try {
      const valhallaUrl = `https://valhalla1.openstreetmap.de/route?json={"costing":"auto","locations":[{"lat":${from.lat},"lon":${from.lng}},{"lat":${to.lat},"lon":${to.lng}}]}&exclude=ferry`;
      const response = await axios.get(valhallaUrl, { timeout: 5000 });
      if (response.data && response.data.trip && response.data.trip.legs) {
        const distance = response.data.trip.summary.length / 1000;
        const duration = response.data.trip.summary.time / 60;
        const polyline = response.data.trip.legs
          .flatMap(leg => leg.shape ? decodePolyline(leg.shape) : [])
          .map(p => ({ lat: p[0], lng: p[1] }));
        routeData = {
          distance: Math.round(distance * 10) / 10,
          duration: Math.round(duration),
          polyline
        };
        console.log('✓ Valhalla succeeded');
      }
    } catch (err) {
      console.log('✗ Valhalla failed:', err.response?.status || err.message);
    }

    // Try 2: GraphHopper free API
    if (!routeData) {
      try {
        const ghUrl = `https://graphhopper.com/api/1/route?point=${from.lat},${from.lng}&point=${to.lat},${to.lng}&profile=car&locale=en&points_encoded=false`;
        const response = await axios.get(ghUrl, { timeout: 5000 });
        if (response.data && response.data.routes && response.data.routes[0]) {
          const route = response.data.routes[0];
          const distance = route.distance / 1000;
          const duration = route.time / 60000;
          const polyline = route.points?.coordinates?.map(p => ({ lat: p[1], lng: p[0] })) || [];
          routeData = {
            distance: Math.round(distance * 10) / 10,
            duration: Math.round(duration),
            polyline
          };
          console.log('✓ GraphHopper succeeded');
        }
      } catch (err) {
        console.log('✗ GraphHopper failed:', err.response?.status || err.message);
      }
    }

    // Try 3: OpenRouteService free tier
    if (!routeData) {
      try {
        const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248&start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`;
        const response = await axios.get(orsUrl, { timeout: 5000 });
        if (response.data && response.data.features && response.data.features[0]) {
          const feature = response.data.features[0];
          const distance = feature.properties.segments[0].distance / 1000;
          const duration = feature.properties.segments[0].duration / 60;
          const coords = feature.geometry.coordinates;
          const polyline = coords.map(p => ({ lat: p[1], lng: p[0] }));
          routeData = {
            distance: Math.round(distance * 10) / 10,
            duration: Math.round(duration),
            polyline
          };
          console.log('✓ OpenRouteService succeeded');
        }
      } catch (err) {
        console.log('✗ OpenRouteService failed:', err.response?.status || err.message);
      }
    }

    // Try 4: MapQuest Open API
    if (!routeData) {
      try {
        const mqUrl = `https://open.mapquestapi.com/directions/v2/route?key=k8V4RBcvYqEYmOPZvZQAjqWBHBG8dMKR&from=${from.lat},${from.lng}&to=${to.lat},${to.lng}&outFormat=json`;
        const response = await axios.get(mqUrl, { timeout: 5000 });
        if (response.data && response.data.route) {
          const route = response.data.route;
          const distance = route.distance * 1.60934; // convert miles to km
          const duration = route.time / 60000; // convert ms to minutes
          const polyline = route.shape?.shapePoints?.map((lat, i, arr) =>
            i % 2 === 0 ? { lat, lng: arr[i + 1] } : null
          ).filter(p => p) || [];
          routeData = {
            distance: Math.round(distance * 10) / 10,
            duration: Math.round(duration),
            polyline: polyline.length > 0 ? polyline : undefined
          };
          console.log('✓ MapQuest succeeded');
        }
      } catch (err) {
        console.log('✗ MapQuest failed:', err.response?.status || err.message);
      }
    }

    // Fallback: Improved Haversine with road factor optimized for Quebec (1.85x)
    if (!routeData) {
      const R = 6371;
      const dLat = (to.lat - from.lat) * Math.PI / 180;
      const dLng = (to.lng - from.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.asin(Math.sqrt(a));
      const straightDist = R * c;
      const roadDistance = straightDist * 1.85;
      const avgSpeed = 85;
      const duration = (roadDistance / avgSpeed) * 60;

      // Generate curved polyline for Haversine fallback
      const polyline = generateCurvedPolyline(from, to, 15);

      routeData = {
        distance: Math.round(roadDistance * 10) / 10,
        duration: Math.round(duration),
        polyline,
        approximated: true
      };
    }

    res.json(routeData);
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test routing services (debug endpoint)
app.get('/api/test-routing', async (req, res) => {
  const results = {};
  const testCoords = { from: { lat: 45.467, lng: -72.057 }, to: { lat: 45.39547925, lng: -71.86639838 } };

  // Test OSRM public
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${testCoords.from.lng},${testCoords.from.lat};${testCoords.to.lng},${testCoords.to.lat}?overview=full&geometries=geojson`;
    console.log('Testing OSRM:', url);
    const r = await axios.get(url, { timeout: 3000 });
    results.osrm = {
      status: 'ok',
      hasRoutes: !!r.data.routes,
      routesCount: r.data.routes?.length || 0,
      hasGeometry: !!r.data.routes?.[0]?.geometry
    };
  } catch (e) {
    results.osrm = { status: 'error', error: e.message, code: e.code };
  }

  // Test Woosmap
  try {
    const url = `https://api.woosmap.com/distance/route/json?origin=${testCoords.from.lat},${testCoords.from.lng}&destination=${testCoords.to.lat},${testCoords.to.lng}&key=${process.env.WOOSMAP_API_KEY}`;
    console.log('Testing Woosmap:', url);
    const r = await axios.get(url, { timeout: 3000 });
    console.log('Woosmap response:', JSON.stringify(r.data, null, 2));
    results.woosmap = {
      status: 'ok',
      hasRoutes: !!r.data.routes,
      routesCount: r.data.routes?.length || 0,
      responseKeys: Object.keys(r.data),
      woosStatus: r.data.status,
      woosError: r.data.error_message,
      firstRoute: r.data.routes?.[0] ? Object.keys(r.data.routes[0]) : null,
      rows: r.data.rows ? Object.keys(r.data.rows[0] || {}) : null
    };
  } catch (e) {
    results.woosmap = { status: 'error', error: e.message, code: e.code };
  }

  // Test Valhalla (POST instead of GET with query param)
  try {
    const payload = {
      costing: 'auto',
      locations: [
        { lat: testCoords.from.lat, lon: testCoords.from.lng },
        { lat: testCoords.to.lat, lon: testCoords.to.lng }
      ]
    };
    console.log('Testing Valhalla with POST:', JSON.stringify(payload));
    const r = await axios.post('https://valhalla1.openstreetmap.de/route', payload, { timeout: 3000 });
    results.valhalla = { status: 'ok', hasTrip: !!r.data.trip, tripKeys: r.data.trip ? Object.keys(r.data.trip) : null };
  } catch (e) {
    results.valhalla = { status: 'error', error: e.message, code: e.code, statusCode: e.response?.status, responseData: e.response?.data };
  }

  // Test GraphHopper
  try {
    const url = `https://graphhopper.com/api/1/route?point=${testCoords.from.lat},${testCoords.from.lng}&point=${testCoords.to.lat},${testCoords.to.lng}&profile=car`;
    console.log('Testing GraphHopper:', url);
    const r = await axios.get(url, { timeout: 3000 });
    results.graphhopper = { status: 'ok', hasRoutes: !!r.data.routes };
  } catch (e) {
    results.graphhopper = { status: 'error', error: e.message, code: e.code, statusCode: e.response?.status };
  }

  // Test DNS resolution
  const dns = require('dns').promises;
  try {
    const ip = await dns.resolve4('api.woosmap.com');
    results.dns_woosmap = { status: 'ok', ip };
  } catch (e) {
    results.dns_woosmap = { status: 'error', error: e.message };
  }

  res.json(results);
});

// Démarrer serveur
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Serveur démarré sur http://${HOST}:${PORT}`);
  console.log('📍 Environment: Production' + (process.env.WOOSMAP_API_KEY ? ' (Woosmap enabled)' : ' (Woosmap disabled)'));
});

module.exports = app;
