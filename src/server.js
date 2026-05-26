const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
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

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
        const lat = parseFloat(parts[14]);
        const lon = parseFloat(parts[15]);
        
        // Vérifier que lat/lon sont valides
        if (isNaN(lat) || isNaN(lon)) {
          console.warn('Coordonnées invalides:', parts[1], parts[14], parts[15]);
          return null;
        }

        return {
          id: parts[0]?.trim(),
          name: parts[1]?.trim(),
          city: parts[3]?.trim(),
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

// POST - Calculer itinéraire Woosmap
app.post('/api/route', async (req, res) => {
  try {
    const { origin, destination } = req.body;

    const response = await axios.get('https://routing-api.woosmap.com/route', {
      params: {
        origin: `${origin.lat},${origin.lon}`,
        destination: `${destination.lat},${destination.lon}`,
        key: process.env.WOOSMAP_API_KEY
      }
    });

    const route = response.data.routes?.[0];
    if (!route) {
      return res.status(400).json({ error: 'Pas de route trouvée' });
    }

    const distance = route.distance?.value || 0;
    const duration = route.duration?.value || 0;

    res.json({
      distance: (distance / 1000).toFixed(1),
      duration: Math.ceil(duration / 60),
      polyline: route.polyline?.points || []
    });
  } catch (error) {
    console.error('Erreur itinéraire:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Sauvegarder domicile rep
app.post('/api/rep-location', async (req, res) => {
  try {
    const { rep, lat, lon } = req.body;

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Démarrer serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});

module.exports = app;
