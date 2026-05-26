// ===== TERRITORIES MANAGEMENT =====
// Hypothèse 2: Répartition basée sur la distance aux domiciles des Reps
// Rep 1 (Cookshire): 45.467, -72.057
// Rep 2 (Québec): 46.8139, -71.2080

const TERRITORIES_STORAGE_KEY = 'interbois_territories';

// Magasins assignés à Zone A (Rep 1 - Cookshire) par distance
// Chaque magasin va au Rep le plus proche
const ZONE_A_STORES = [14, 20, 55, 59, 60, 61, 63, 64, 66, 68, 69, 70, 73, 74, 75, 76, 77, 79, 230, 231];

// Rep locations for distance calculation
const REP_LOCATIONS = {
  1: { lat: 45.467, lon: -72.057, name: 'Cookshire' },
  2: { lat: 46.8139, lon: -71.2080, name: 'Québec' }
};

// Fréquences de visite par magasin
const VISIT_FREQUENCIES = {
  54: { frequency: 'monthly', visitsPerYear: 12 },
  61: { frequency: 'monthly', visitsPerYear: 12 },
  45: { frequency: 'monthly', visitsPerYear: 12 },
  230: { frequency: 'monthly', visitsPerYear: 12 },
  231: { frequency: 'monthly', visitsPerYear: 12 },
  20: { frequency: 'monthly', visitsPerYear: 12 },
  63: { frequency: 'monthly', visitsPerYear: 12 },
  60: { frequency: 'monthly', visitsPerYear: 12 },
  59: { frequency: 'monthly', visitsPerYear: 12 },
  64: { frequency: 'monthly', visitsPerYear: 12 }
};

function loadTerritoriesFromStorage() {
  const stored = localStorage.getItem(TERRITORIES_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

function saveTerritoriesInStorage(territories) {
  localStorage.setItem(TERRITORIES_STORAGE_KEY, JSON.stringify(territories));
}

function assignStoreToTerritory(store) {
  // Assign based on distance-based list
  // ZONE_A_STORES contains all stores closer to Cookshire (Rep 1)
  if (ZONE_A_STORES.includes(parseInt(store.id))) {
    return 1;
  }
  return 2;
}

function initializeTerritoriesHypothesis1(canac) {
  const territories = {
    1: {  // Rep 1 (Cookshire - Bleu)
      rep: 1,
      name: 'Rep 1 - Cookshire (Estrie & Sud)',
      stores: [],
      color: '#2c5f2d'
    },
    2: {  // Rep 2 (Québec - Rouge)
      rep: 2,
      name: 'Rep 2 - Québec (Capitale-Nationale & Nord)',
      stores: [],
      color: '#c85a3a'
    }
  };

  // Assign each store to a territory
  canac.forEach(store => {
    const rep = assignStoreToTerritory(store);
    territories[rep].stores.push({
      id: store.id,
      name: store.name,
      lat: store.lat,
      lon: store.lon,
      region: store.region,
      frequency: store.frequency || 'unknown'
    });
  });

  saveTerritoriesInStorage(territories);
  return territories;
}

function calculateTerritoryStats(territory) {
  const stores = territory.stores || [];
  const totalStores = stores.length;

  // Calculate visits per year
  let totalVisitsPerYear = 0;
  let monthlyVisits = 0;
  let sixWeekVisits = 0;

  stores.forEach(store => {
    if (VISIT_FREQUENCIES[store.id]) {
      totalVisitsPerYear += VISIT_FREQUENCIES[store.id].visitsPerYear;
      if (VISIT_FREQUENCIES[store.id].frequency === 'monthly') {
        monthlyVisits++;
      } else {
        sixWeekVisits++;
      }
    } else {
      // Default: 6-8 weeks
      totalVisitsPerYear += 7;
      sixWeekVisits++;
    }
  });

  // Calculate total distance (simplified)
  let totalDistance = 0;
  if (stores.length > 1) {
    for (let i = 0; i < stores.length - 1; i++) {
      const d = haversineDistance(
        stores[i].lat, stores[i].lon,
        stores[i + 1].lat, stores[i + 1].lon
      );
      totalDistance += d;
    }
  }

  return {
    totalStores,
    monthlyVisits,
    sixWeekVisits,
    totalVisitsPerYear: Math.round(totalVisitsPerYear),
    totalDistance: Math.round(totalDistance),
    avgVisitsPerMonth: (totalVisitsPerYear / 12).toFixed(1)
  };
}

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

function displayTerritoriesStats(territories) {
  const statsDiv = document.getElementById('territories-stats');
  if (!statsDiv) return;

  let html = '<div class="stats-container">';

  Object.values(territories).forEach(territory => {
    const stats = calculateTerritoryStats(territory);
    html += `
      <div class="territory-stat" style="border-left: 4px solid ${territory.color}">
        <div class="stat-title">${territory.name}</div>
        <div class="stat-row">
          <span class="stat-label">Magasins:</span>
          <span class="stat-value">${stats.totalStores}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Visites mensuelles:</span>
          <span class="stat-value">${stats.monthlyVisits}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Visites 6-8 sem:</span>
          <span class="stat-value">${stats.sixWeekVisits}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Total/an:</span>
          <span class="stat-value">${stats.totalVisitsPerYear}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Moy/mois:</span>
          <span class="stat-value">${stats.avgVisitsPerMonth}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Distance tot:</span>
          <span class="stat-value">${stats.totalDistance} km</span>
        </div>
      </div>
    `;
  });

  html += '</div>';
  statsDiv.innerHTML = html;
}
