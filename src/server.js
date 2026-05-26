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

    // Try 1: Valhalla (open source alternative)
    try {
      const valhallaUrl = `https://valhalla1.openstreetmap.de/route?json={"costing":"auto","locations":[{"lat":${from.lat},"lon":${from.lng}},{"lat":${to.lat},"lon":${to.lng}}]}&exclude=ferry`;
      const response = await axios.get(valhallaUrl, { timeout: 5000 });
      if (response.data && response.data.trip && response.data.trip.legs) {
        const distance = response.data.trip.summary.length / 1000; // convert to km
        const duration = response.data.trip.summary.time / 60; // convert to minutes
        routeData = { distance: Math.round(distance * 10) / 10, duration: Math.round(duration) };
      }
    } catch (err) {
      // silently fail
    }

    // Try 2: GraphHopper free API
    if (!routeData) {
      try {
        const ghUrl = `https://graphhopper.com/api/1/route?point=${from.lat},${from.lng}&point=${to.lat},${to.lng}&profile=car&locale=en&points_encoded=false`;
        const response = await axios.get(ghUrl, { timeout: 5000 });
        if (response.data && response.data.routes && response.data.routes[0]) {
          const route = response.data.routes[0];
          const distance = route.distance / 1000; // convert to km
          const duration = route.time / 60000; // convert to minutes
          routeData = { distance: Math.round(distance * 10) / 10, duration: Math.round(duration) };
        }
      } catch (err) {
        // silently fail
      }
    }

    // Fallback: Improved Haversine with road factor optimized for Quebec (1.5-1.6x)
    if (!routeData) {
      const R = 6371; // Earth radius in km
      const dLat = (to.lat - from.lat) * Math.PI / 180;
      const dLng = (to.lng - from.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.asin(Math.sqrt(a));
      const straightDist = R * c;
      // Quebec roads average 1.85x longer than straight line (accounts for network topology and obstacles)
      const roadDistance = straightDist * 1.85;
      const avgSpeed = 85; // km/h average for Quebec highways/roads
      const duration = (roadDistance / avgSpeed) * 60; // minutes
      routeData = {
        distance: Math.round(roadDistance * 10) / 10,
        duration: Math.round(duration),
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

// Démarrer serveur
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Serveur démarré sur http://${HOST}:${PORT}`);
});

module.exports = app;
