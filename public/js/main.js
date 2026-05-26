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
  streets: L.tileLayer('https://{s}.basemaps.cartocdn.com/full_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CartoDB',
    maxZoom: 19,
    id: 'streets'
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

function loadRepLocations() {
  const stored = localStorage.getItem(REP_LOCATIONS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      repLocations = parsed;
      console.log(`✅ Rep locations chargées du localStorage:`, repLocations);
    } catch (e) {
      console.warn('⚠️ Impossible de charger rep locations, utilisation des valeurs par défaut', e);
    }
  } else {
    console.log('✅ Utilisation des rep locations par défaut');
  }
}

function saveRepLocations() {
  localStorage.setItem(REP_LOCATIONS_KEY, JSON.stringify(repLocations));
  updateRepLocationDisplay();
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

// Rep locations storage
const REP_LOCATIONS_KEY = 'interbois_rep_locations';
let repLocations = {
  1: { lat: 45.467, lon: -72.057, address: 'Cookshire' },
  2: { lat: 46.8139, lon: -71.2080, address: 'Quebec' },
  3: { lat: 48.3894, lon: -71.2036, address: 'Chicoutimi' }
};

// Zone editing
let editingZoneId = null;
let editingPolygonMarkers = [];

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
  loadRepLocations();
  updateRepLocationDisplay();
  console.log(`✅ Carte initialisée - ${currentRep} villes trouvées`);
}

// ===== DESSINER/ÉDITER POLYGONE =====
function toggleDrawing() {
  // Check if there are existing zones for this rep
  const repZones = Object.values(zones).filter(z => z.rep === currentRep);

  if (repZones.length > 0 && !isDrawing) {
    // Show options to create new or edit existing
    const zonesList = repZones.map((z, i) => `${i + 1}. Zone ${z.id.substring(0, 8)}`).join('\n');
    const choice = prompt(
      `Zones existantes pour Rep ${currentRep}:\n${zonesList}\n\nAppuyez OK pour créer une nouvelle zone,\nVous pouvez aussi cliquer sur une zone pour l'éditer.`,
      ''
    );
    if (choice === null) return; // Cancel
  }

  startNewZone();
}

function startNewZone() {
  isDrawing = true;
  currentPolygon = [];
  editingPolygonMarkers = [];
  editingZoneId = null;

  document.getElementById('draw-polygon').style.background = '#c85a3a';
  document.getElementById('draw-polygon').textContent = '✏️ Mode dessin (Esc pour finir)';
}

function editZone(zoneId) {
  editingZoneId = zoneId;
  const zone = zones[zoneId];
  isDrawing = true;
  currentPolygon = [...zone.coordinates];
  editingPolygonMarkers = [];

  // Show existing points avec numéros et possibilité de suppression
  currentPolygon.forEach((coords, index) => {
    const [lat, lon] = coords;
    const marker = L.circleMarker([lat, lon], {
      radius: 8,
      fillColor: zone.color,
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
      className: 'editable-point'
    });

    const pointIndex = index; // Capture l'index correctement
    marker.bindPopup(`
      <small>Point ${pointIndex + 1}</small><br>
      <button onclick="window.removePointFromZone(${pointIndex})" style="margin-top:5px; padding:3px 8px; cursor:pointer; background: #e74c3c; color: white; border: none; border-radius: 3px; font-size: 11px;">Supprimer</button>
    `);

    marker.addTo(map);
    editingPolygonMarkers.push(marker);
  });

  document.getElementById('draw-polygon').style.background = '#c85a3a';
  document.getElementById('draw-polygon').textContent = '✏️ Mode édition (Esc pour finir)';
  alert(`Édition de la zone Rep ${zone.rep}\nCliquez sur la carte pour ajouter des points\nCliquez sur un point existant pour le supprimer\nAppuyez sur Échap pour terminer`);
}

window.removePointFromZone = function(index) {
  if (currentPolygon.length <= 3) {
    alert('Une zone doit avoir au moins 3 points');
    return;
  }

  console.log(`🗑️ Suppression du point ${index + 1} (${currentPolygon.length} → ${currentPolygon.length - 1})`);
  currentPolygon.splice(index, 1);

  // Fermer tous les popups
  map.closePopup();

  // Redessiner les marqueurs
  editingPolygonMarkers.forEach(marker => map.removeLayer(marker));
  editingPolygonMarkers = [];

  currentPolygon.forEach((coords, idx) => {
    const [lat, lon] = coords;
    const marker = L.circleMarker([lat, lon], {
      radius: 8,
      fillColor: REP_COLORS[currentRep],
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    });
    marker.bindPopup(`
      <small>Point ${idx + 1}</small><br>
      <button onclick="window.removePointFromZone(${idx})" style="margin-top:5px; padding:3px 8px; cursor:pointer; background: #e74c3c; color: white; border: none; border-radius: 3px; font-size: 11px;">Supprimer</button>
    `);
    marker.addTo(map);
    editingPolygonMarkers.push(marker);
  });

  console.log(`✅ Point ${index + 1} supprimé (${currentPolygon.length} points restants)`);
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
  document.getElementById('draw-polygon').style.background = '#2c5f2d';
  document.getElementById('draw-polygon').textContent = '✏️ Dessiner Zone';

  // Nettoyer les marqueurs d'édition
  editingPolygonMarkers.forEach(marker => map.removeLayer(marker));
  editingPolygonMarkers = [];

  // Si on édite une zone existante, la supprimer d'abord
  if (editingZoneId) {
    const oldZone = zones[editingZoneId];
    drawnPolygons.forEach((poly, i) => {
      if (drawnPolygons[i]) map.removeLayer(poly);
    });
    drawnPolygons = drawnPolygons.filter(p => p);
    zones[editingZoneId].coordinates = currentPolygon;
    saveZone(zones[editingZoneId]);
    editingZoneId = null;
    console.log(`✅ Zone mise à jour`);
  } else {
    // Créer une nouvelle zone
    const zoneId = `zone-${currentRep}-${Date.now()}`;
    zones[zoneId] = {
      id: zoneId,
      rep: currentRep,
      coordinates: currentPolygon,
      color: REP_COLORS[currentRep]
    };
    saveZone(zones[zoneId]);
    console.log(`✅ Zone Rep ${currentRep} créée`);
  }

  // Réafficher les zones
  drawnPolygons = [];
  layers.zones.forEach(poly => map.removeLayer(poly));
  layers.zones = [];
  Object.keys(zones).forEach(zoneId => displayZone(zoneId, zones[zoneId]));
  currentPolygon = [];
}

// ===== CHARGEMENT DONNÉES =====
async function loadData() {
  try {
    // Charger zones depuis localStorage d'abord (elles seront en arrière-plan)
    zones = loadZonesFromStorage();
    Object.keys(zones).forEach(zoneId => {
      displayZone(zoneId, zones[zoneId]);
    });

    // Charger magasins Canac APRÈS (ils seront au-dessus des zones)
    const canacResponse = await fetch(`${API_BASE}/api/clients`);
    canac = await canacResponse.json();
    displayMarkers('canac');

    console.log(`✅ Chargé: ${Object.keys(zones).length} zones depuis localStorage`);
    console.log(`✅ Chargé: ${canac.length} magasins Canac`);
  } catch (error) {
    console.error('Erreur chargement données:', error);
    alert('Erreur: Impossible charger les données. Vérifiez la connexion serveur.');
  }
}

// ===== AFFICHAGE MARQUEURS =====
function displayMarkers(type) {
  const data = canac;
  const color = CLIENT_COLOR;

  console.log(`📍 Affichage de ${data.length} magasins Canac`);

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

  const popupContent = `<strong>Zone - Rep ${zone.rep}</strong><br><button onclick="editZone('${zoneId}')" style="margin-top:8px; margin-right:5px; padding:5px 10px; cursor:pointer; background: ${zone.color}; color: white; border: none; border-radius: 4px; font-size: 12px;">✏️ Éditer</button><button onclick="deleteZoneById('${zoneId}')" style="margin-top:8px; padding:5px 10px; cursor:pointer; background: #e74c3c; color: white; border: none; border-radius: 4px; font-size: 12px;">🗑️ Supprimer</button>`;
  polygon.bindPopup(popupContent);
  polygon.on('click', function(e) {
    if (currentRep === zone.rep) {
      e.target.openPopup();
    }
  });

  map.addLayer(polygon);
  layers.zones.push(polygon);
  drawnPolygons.push(polygon);
}

function deleteZoneById(zoneId) {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) {
    deleteZone(zoneId);
    drawnPolygons = [];
    layers.zones.forEach(poly => map.removeLayer(poly));
    layers.zones = [];
    Object.keys(zones).forEach(id => displayZone(id, zones[id]));
  }
}

// ===== ITINÉRAIRES =====
async function calculateRoute(lat, lon, name) {
  const routeInfo = document.getElementById('route-info');
  const origin = repLocations[currentRep];

  console.log(`🛣️ Calcul itinéraire pour ${name}`);
  console.log(`📍 Origine: ${origin.address || 'Non défini'} (${origin.lat}, ${origin.lon})`);
  console.log(`📍 Destination: ${name} (${lat}, ${lon})`);

  if (!origin.lat || !origin.lon) {
    routeInfo.innerHTML = '⚠️ Veuillez d\'abord définir le domicile du représentant (panel "Domicile Rep")';
    routeInfo.classList.add('active');
    return;
  }

  routeInfo.innerHTML = '⏳ Calcul en cours...';
  routeInfo.classList.add('active');

  try {
    if (!origin || typeof origin !== 'object') {
      routeInfo.innerHTML = '❌ Erreur: Lieu d\'origine non défini';
      console.error('Origin invalide:', origin);
      return;
    }

    const requestBody = {
      origin: { lat: parseFloat(origin.lat), lon: parseFloat(origin.lon) },
      destination: { lat: parseFloat(lat), lon: parseFloat(lon) }
    };

    if (isNaN(requestBody.origin.lat) || isNaN(requestBody.origin.lon)) {
      routeInfo.innerHTML = '❌ Erreur: Coordonnées d\'origine invalides. Veuillez vérifier le domicile du rep.';
      console.error('Coordonnées invalides:', requestBody.origin);
      return;
    }

    console.log('📤 Requête:', requestBody);

    const response = await fetch(`${API_BASE}/api/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log(`📥 Réponse status: ${response.status}`);
    const route = await response.json();
    console.log('📥 Réponse body:', route);

    if (route.error) {
      routeInfo.innerHTML = `❌ Erreur serveur: ${route.error}`;
      console.error('Erreur API:', route.error);
      return;
    }

    if (route.distance === undefined || route.duration === undefined) {
      routeInfo.innerHTML = '❌ Réponse serveur invalide (distance/durée manquantes)';
      console.error('Données manquantes:', route);
      return;
    }

    routeInfo.innerHTML = `
      <strong>${name}</strong><br>
      📏 Distance: <strong>${route.distance} km</strong><br>
      ⏱️ Durée: <strong>${route.duration} min</strong><br>
      <small style="color: var(--text-light);">Depuis: ${origin.address}</small>
    `;
    console.log(`✅ Itinéraire calculé: ${route.distance} km, ${route.duration} min`);

  } catch (error) {
    console.error('Erreur itinéraire:', error);
    routeInfo.innerHTML = `❌ Erreur: ${error.message}`;
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

// ===== REP LOCATION MANAGEMENT =====
function updateRepLocationDisplay() {
  const rep = currentRep;
  const location = repLocations[rep];
  const latInput = document.getElementById('rep-lat');
  const lonInput = document.getElementById('rep-lon');
  const addressInput = document.getElementById('rep-address');
  const infoDiv = document.getElementById('rep-location-info');

  latInput.value = location.lat.toFixed(4);
  lonInput.value = location.lon.toFixed(4);
  addressInput.value = location.address || '';

  if (location.address) {
    infoDiv.innerHTML = `<i class="fas fa-check-circle" style="color: var(--accent);"></i> ${location.address}<br><small>${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}</small>`;
  } else {
    infoDiv.innerHTML = '<i class="fas fa-info-circle"></i> Entrez l\'adresse du domicile';
  }
}

document.getElementById('save-rep-location').addEventListener('click', () => {
  const lat = parseFloat(document.getElementById('rep-lat').value);
  const lon = parseFloat(document.getElementById('rep-lon').value);
  const address = document.getElementById('rep-address').value;

  if (isNaN(lat) || isNaN(lon)) {
    alert('Veuillez entrer des coordonnées valides');
    return;
  }

  repLocations[currentRep] = { lat, lon, address };
  saveRepLocations();
  console.log(`✅ Localisation Rep ${currentRep} sauvegardée`);
});

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
  console.log(`🔍 Recherche "${query}" → ${results.length} résultats`);
  searchResultsList.innerHTML = '';

  results.forEach(city => {
    const li = document.createElement('li');
    li.textContent = city;
    li.addEventListener('click', () => {
      zoomToCity(city);
      citySearchInput.value = '';
      searchResultsList.innerHTML = '';
      console.log(`✅ Zoom vers ${city}`);
    });
    searchResultsList.appendChild(li);
  });
}

function zoomToCity(city) {
  // Trouver tous les magasins de la ville
  const cityClients = canac.filter(client => client.city === city);

  if (cityClients.length === 0) {
    console.log(`❌ Aucun magasin trouvé pour ${city}`);
    return;
  }

  // Créer un groupe de tous les marqueurs de la ville
  const markers = [];
  canac.forEach(client => {
    if (client.city === city) {
      const marker = L.latLng(client.lat, client.lon);
      markers.push(marker);
    }
  });

  if (markers.length > 0) {
    const bounds = L.latLngBounds(markers);
    map.fitBounds(bounds, { padding: [50, 50] });
    console.log(`✅ ${markers.length} magasin(s) trouvé(s) à ${city}`);
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
    updateRepLocationDisplay();
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
