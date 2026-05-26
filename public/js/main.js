// ===== CONFIGURATION =====
const API_BASE = '';
const STORAGE_KEY = 'territoires_zones';

const REP_COLORS = {
  1: '#2c5f2d',   /* Forest Green */
  2: '#c85a3a',   /* Warm Orange */
  3: '#6b4c89'    /* Deep Purple */
};

const CLIENT_COLOR = '#0066cc';

// CartoDB Basemaps
const BASEMAPS = {
  positron: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CartoDB',
    maxZoom: 19,
    id: 'positron'
  }),
  voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastered/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CartoDB',
    maxZoom: 19,
    id: 'voyager'
  }),
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CartoDB',
    maxZoom: 19,
    id: 'dark'
  })
};

// ===== LOCALSTORAGE UTILS =====
function loadZonesFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

function saveZonesToStorage(zonesObj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(zonesObj));
}

// ===== STATE =====
let map;
let currentRep = 1;
let canac = [];  // Seulement Canac
let zones = {};
let isDrawing = false;
let currentPolygon = [];
let drawnPolygons = [];

let layers = {
  canac: [],
  zones: []
};

let currentBasemap = 'positron';
let uniqueCities = new Set();

// ===== INITIALISATION CARTE =====
function initMap() {
  map = L.map('map', {
    center: [47, -71.5],
    zoom: 6,
    scrollWheelZoom: true,
    attributionControl: true
  });

  // Ajouter le basemap par défaut (CartoDB Positron)
  BASEMAPS.positron.addTo(map);

  map.on('click', onMapClick);

  loadData();
}

// ===== DESSINER POLYGONE (SIMPLE) =====
function toggleDrawing() {
  isDrawing = !isDrawing;
  currentPolygon = [];
  
  if (isDrawing) {
    document.getElementById('draw-polygon').style.background = '#ffaa00';
    document.getElementById('draw-polygon').textContent = '✏️ Mode dessin (Esc pour finir)';
    alert(`Mode dessin activé pour Rep ${currentRep}\nCliquez sur la carte pour ajouter des points\nAppuyez sur Échap pour terminer`);
  } else {
    document.getElementById('draw-polygon').style.background = '#667eea';
    document.getElementById('draw-polygon').textContent = '✏️ Dessiner Zone';
  }
}

function onMapClick(e) {
  if (!isDrawing) return;

  currentPolygon.push([e.latlng.lat, e.latlng.lng]);
  
  // Afficher le point
  L.circleMarker([e.latlng.lat, e.latlng.lng], {
    radius: 4,
    fillColor: REP_COLORS[currentRep],
    color: REP_COLORS[currentRep],
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.8
  }).addTo(map);
}

// Touche Échap pour finir le dessin
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isDrawing) {
    finishPolygon();
  }
});

function finishPolygon() {
  if (currentPolygon.length < 3) {
    alert('Au moins 3 points requis!');
    return;
  }

  isDrawing = false;
  document.getElementById('draw-polygon').style.background = '#667eea';
  document.getElementById('draw-polygon').textContent = '✏️ Dessiner Zone';

  // Créer le polygone
  const polygon = L.polygon(currentPolygon, {
    color: REP_COLORS[currentRep],
    weight: 2,
    opacity: 0.8,
    fillColor: REP_COLORS[currentRep],
    fillOpacity: 0.2
  });

  polygon.addTo(map);

  // Sauvegarder
  const zoneId = `zone-${currentRep}-${Date.now()}`;
  zones[zoneId] = {
    id: zoneId,
    rep: currentRep,
    coordinates: currentPolygon,
    color: REP_COLORS[currentRep]
  };

  saveZone(zones[zoneId]);
  drawnPolygons.push(polygon);
  currentPolygon = [];

  console.log(`✅ Zone Rep ${currentRep} créée`);
}

// ===== CHARGEMENT DONNÉES =====
async function loadData() {
  try {
    // Charger magasins Canac
    const canacResponse = await fetch(`${API_BASE}/api/clients`);
    canac = await canacResponse.json();
    displayMarkers('canac');

    // Charger zones depuis localStorage (pas de serveur)
    zones = loadZonesFromStorage();
    Object.keys(zones).forEach(zoneId => {
      displayZone(zoneId, zones[zoneId]);
    });

    console.log(`✅ Chargé: ${canac.length} magasins Canac`);
    console.log(`✅ Chargé: ${Object.keys(zones).length} zones depuis localStorage`);
  } catch (error) {
    console.error('Erreur chargement données:', error);
    alert('Erreur: Impossible charger les données. Vérifiez la connexion serveur.');
  }
}

// ===== AFFICHAGE MARQUEURS =====
function displayMarkers(type) {
  const data = canac;
  const color = CLIENT_COLOR;

  data.forEach(item => {
    // Ajouter la ville à la liste pour la recherche
    if (item.city) {
      uniqueCities.add(item.city);
    }

    const marker = L.circleMarker([item.lat, item.lon], {
      radius: 6,
      fillColor: color,
      color: color,
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.6
    });

    marker.bindPopup(`
      <strong>${item.name}</strong><br>
      ${item.city}<br>
      <button onclick="calculateRoute(${item.lat}, ${item.lon}, '${item.name}')" style="margin-top:5px; padding:5px 10px; cursor:pointer;">📍 Itinéraire</button>
    `);

    marker.on('click', () => {
      map.setView([item.lat, item.lon], 12);
    });

    map.addLayer(marker);
    layers.canac.push(marker);
  });
}

// ===== AFFICHAGE ZONES =====
function displayZone(zoneId, zone) {
  const polygon = L.polygon(zone.coordinates, {
    color: zone.color,
    weight: 2,
    opacity: 0.8,
    fillColor: zone.color,
    fillOpacity: 0.2
  });

  polygon.bindPopup(`<strong>Zone - Rep ${zone.rep}</strong>`);
  map.addLayer(polygon);
  layers.zones.push(polygon);
  drawnPolygons.push(polygon);
}

// ===== ITINÉRAIRES =====
async function calculateRoute(lat, lon, name) {
  const routeInfo = document.getElementById('route-info');
  routeInfo.innerHTML = '⏳ Calcul en cours...';
  routeInfo.classList.add('active');

  try {
    // Coordonnées domiciles
    const repLocations = {
      1: { lat: 45.467, lon: -72.057 },  // Cookshire
      2: { lat: 46.8139, lon: -71.2080 }, // Québec
      3: { lat: 48.3894, lon: -71.2036 }  // Chicoutimi
    };

    const origin = repLocations[currentRep];
    const response = await fetch(`${API_BASE}/api/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin,
        destination: { lat, lon }
      })
    });

    const route = await response.json();

    if (route.error) {
      routeInfo.innerHTML = '❌ Erreur calcul itinéraire';
      return;
    }

    routeInfo.innerHTML = `
      <strong>${name}</strong><br>
      📏 Distance: <strong>${route.distance} km</strong><br>
      ⏱️ Durée: <strong>${route.duration} min</strong>
    `;

  } catch (error) {
    console.error('Erreur itinéraire:', error);
    routeInfo.innerHTML = '❌ Erreur: ' + error.message;
  }
}

// ===== SAUVEGARDE ZONES (localStorage) =====
function saveZone(zone) {
  zones[zone.id] = zone;
  saveZonesToStorage(zones);
  console.log(`✅ Zone ${zone.id} sauvegardée en localStorage`);
}

function deleteZone(zoneId) {
  delete zones[zoneId];
  saveZonesToStorage(zones);
  console.log(`✅ Zone ${zoneId} supprimée`);
}

// ===== RECHERCHE PAR VILLE =====
const citySearchInput = document.getElementById('city-search');
const searchResultsList = document.getElementById('search-results');

function filterCitiesByQuery(query) {
  if (!query) {
    searchResultsList.innerHTML = '';
    return [];
  }

  const lowerQuery = query.toLowerCase();
  return Array.from(uniqueCities)
    .filter(city => city.toLowerCase().includes(lowerQuery))
    .sort()
    .slice(0, 10);
}

function updateSearchResults(query) {
  const results = filterCitiesByQuery(query);
  searchResultsList.innerHTML = '';

  results.forEach(city => {
    const li = document.createElement('li');
    li.textContent = city;
    li.addEventListener('click', () => {
      zoomToCity(city);
      citySearchInput.value = '';
      searchResultsList.innerHTML = '';
    });
    searchResultsList.appendChild(li);
  });
}

function zoomToCity(city) {
  const cityMarkers = layers.canac.filter(marker => {
    const popupContent = marker.getPopup().getContent();
    return popupContent.includes(`<br>${city}<br>`);
  });

  if (cityMarkers.length > 0) {
    // Calculer les limites de tous les marqueurs de la ville
    const group = new L.featureGroup(cityMarkers);
    map.fitBounds(group.getBounds(), { padding: [50, 50] });
  }
}

citySearchInput.addEventListener('input', (e) => {
  updateSearchResults(e.target.value);
});

// Fermer les résultats de recherche en cliquant ailleurs
document.addEventListener('click', (e) => {
  if (e.target !== citySearchInput && !citySearchInput.contains(e.target)) {
    searchResultsList.innerHTML = '';
  }
});

// ===== BASEMAP SWITCHER =====
function switchBasemap(basemapId) {
  if (currentBasemap === basemapId) return;

  // Supprimer l'ancien basemap
  map.removeLayer(BASEMAPS[currentBasemap]);

  // Ajouter le nouveau basemap
  BASEMAPS[basemapId].addTo(map);
  currentBasemap = basemapId;

  // Mettre à jour le bouton actif
  document.querySelectorAll('.basemap-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.basemap === basemapId);
  });

  console.log(`✅ Basemap changé en: ${basemapId}`);
}

// ===== CONTRÔLES UI =====
document.querySelectorAll('.basemap-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    switchBasemap(e.target.closest('.basemap-btn').dataset.basemap);
  });
});

document.querySelectorAll('.rep-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.rep-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentRep = parseInt(e.target.dataset.rep);
    document.getElementById('route-info').innerHTML = '';
    console.log(`Rep sélectionné: ${currentRep}`);
  });
});

document.getElementById('draw-polygon').addEventListener('click', toggleDrawing);

document.getElementById('clear-zones').addEventListener('click', () => {
  if (confirm('Supprimer toutes les zones?')) {
    Object.keys(zones).forEach(zoneId => deleteZone(zoneId));
    zones = {};
    drawnPolygons.forEach(poly => map.removeLayer(poly));
    drawnPolygons = [];
  }
});

document.getElementById('export-zones').addEventListener('click', () => {
  const data = {
    zones,
    timestamp: new Date().toISOString()
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zones-export.json';
  a.click();
});

document.getElementById('show-clients').addEventListener('change', (e) => {
  layers.canac.forEach(marker => {
    if (e.target.checked) {
      map.addLayer(marker);
    } else {
      map.removeLayer(marker);
    }
  });
});

document.getElementById('show-zones').addEventListener('change', (e) => {
  layers.zones.forEach(polygon => {
    if (e.target.checked) {
      map.addLayer(polygon);
    } else {
      map.removeLayer(polygon);
    }
  });
});

// ===== DÉMARRAGE =====
document.addEventListener('DOMContentLoaded', initMap);
