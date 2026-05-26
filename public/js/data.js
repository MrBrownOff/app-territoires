// Interbois — Données réelles
// Magasins CANAC avec répartition territoriale

window.IB_DATA = {
  reps: [
    {
      id: 'rep1',
      name: 'Rep 1',
      region: 'Cookshire (Estrie & Sud)',
      home: { city: 'Cookshire', lat: 45.467, lng: -72.057 },
      color: '#2c5f2d',
      colorName: 'vert'
    },
    {
      id: 'rep2',
      name: 'Rep 2',
      region: 'Québec (Capitale-Nationale & Nord)',
      home: { city: 'Québec', lat: 46.8139, lng: -71.2080 },
      color: '#c85a3a',
      colorName: 'orange'
    }
  ],

  stores: [
    // ============ REP 1 — Estrie & Sud (23 magasins) ============
    { id: '14', name: 'CANAC - Longueuil', city: 'Longueuil', lat: 45.535714, lng: -73.520221, rep: 'rep1', freq: 'mensuel', visits: 12 },
    { id: '20', name: 'CANAC - Notre-Dame-des-Prairies', city: 'Notre-Dame-des-Prairies', lat: 46.0421555, lng: -73.4351195, rep: 'rep1', freq: 'mensuel', visits: 12 },
    { id: '55', name: 'CANAC - Victoriaville', city: 'Victoriaville', lat: 45.86649, lng: -72.47837315, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '57', name: 'CANAC - Saint-Georges', city: 'Saint-Georges', lat: 46.102205, lng: -70.655716, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '59', name: 'CANAC - Trois-Rivières', city: 'Trois-Rivières', lat: 46.337125, lng: -72.579977, rep: 'rep1', freq: 'mensuel', visits: 12 },
    { id: '60', name: 'CANAC - Sherbrooke', city: 'Sherbrooke', lat: 45.39547925, lng: -71.86639838, rep: 'rep1', freq: 'mensuel', visits: 12 },
    { id: '61', name: 'CANAC - Cap-de-la-Madelaine', city: 'Trois-Rivières', lat: 46.3968267, lng: -72.5328249, rep: 'rep1', freq: 'mensuel', visits: 12 },
    { id: '63', name: 'CANAC - Rock-Forest', city: 'Rock Forest', lat: 45.36216795, lng: -72.00663991, rep: 'rep1', freq: 'mensuel', visits: 12 },
    { id: '64', name: 'CANAC - Cowansville', city: 'Cowansville', lat: 45.194161, lng: -72.753101, rep: 'rep1', freq: 'mensuel', visits: 12 },
    { id: '66', name: 'CANAC - Drummondville', city: 'Drummondville', lat: 45.8667951, lng: -72.4787763, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '68', name: 'CANAC - Beauharnois', city: 'Beauharnois', lat: 45.3083263, lng: -73.86041816, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '69', name: 'CANAC - Saint-Hubert', city: 'Longueuil', lat: 45.4847356, lng: -73.3778651, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '70', name: 'CANAC - Granby', city: 'Granby', lat: 45.418124, lng: -72.760033, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '71', name: 'CANAC - Thetford Mines', city: 'Thetford Mines', lat: 46.115879, lng: -71.273788, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '72', name: 'CANAC - Shawinigan', city: 'Shawinigan', lat: 46.55950605, lng: -72.73610205, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '73', name: 'CANAC - Notre-Dame-des-Prairies', city: 'Notre-Dame-des-Prairies', lat: 46.0421555, lng: -73.4351195, rep: 'rep1', freq: 'mensuel', visits: 12 },
    { id: '74', name: 'CANAC - Prévost', city: 'Prévost', lat: 45.820693, lng: -74.047691, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '75', name: 'CANAC - La Prairie', city: 'La Prairie', lat: 45.407735, lng: -73.460768, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '76', name: 'CANAC - Contrecoeur', city: 'Contrecoeur', lat: 45.84911561, lng: -73.22951116, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '77', name: 'CANAC - Sorel-Tracy', city: 'Sorel-Tracy', lat: 46.035146, lng: -73.0899563, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '79', name: 'CANAC - Valleyfield', city: 'Valleyfield', lat: 45.2675695, lng: -74.1512948, rep: 'rep1', freq: '6-8 sem', visits: 7 },
    { id: '230', name: 'CANAC - Laval', city: 'Laval', lat: 45.568905, lng: -73.783055, rep: 'rep1', freq: 'mensuel', visits: 12 },
    { id: '231', name: 'CANAC - Magog', city: 'Magog', lat: 45.279923, lng: -72.128948, rep: 'rep1', freq: 'mensuel', visits: 12 },

    // ============ REP 2 — Capitale-Nationale & Nord (16 magasins) ============
    { id: '45', name: 'CANAC - L\'Ancienne-Lorette', city: 'Québec', lat: 46.7962482, lng: -71.34599416, rep: 'rep2', freq: 'mensuel', visits: 12 },
    { id: '46', name: 'CANAC - Henri-Bourrassa', city: 'Charlesbourg', lat: 46.8463001, lng: -71.2376278, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '47', name: 'CANAC - Marie-de-L\'incarnation', city: 'Québec', lat: 46.8113778, lng: -71.2487358, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '48', name: 'CANAC - Val-Bélair', city: 'Québec', lat: 46.8181439, lng: -71.2672774, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '49', name: 'CANAC - Saint-Romuald', city: 'Saint-Romuald', lat: 46.74477, lng: -71.229397, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '50', name: 'CANAC - Vanier', city: 'Québec', lat: 46.8181439, lng: -71.2672774, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '51', name: 'CANAC - Louix-XIV', city: 'Charlesbourg', lat: 46.8714595, lng: -71.25388375, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '52', name: 'CANAC - Saint-Augustin', city: 'Saint-Augustin-de-Desmaures', lat: 46.7500668, lng: -71.4330819, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '53', name: 'CANAC - Lévis', city: 'Lévis', lat: 46.789816, lng: -71.156564, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '54', name: 'CANAC - Beauport', city: 'Beauport', lat: 46.8831559, lng: -71.1844219, rep: 'rep2', freq: 'mensuel', visits: 12 },
    { id: '56', name: 'CANAC - Bernier', city: 'Charlesbourg', lat: 46.90305, lng: -71.315127, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '58', name: 'CANAC - Chicoutimi', city: 'Chicoutimi', lat: 48.39082, lng: -71.073186, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '62', name: 'CANAC - Saint-Nicolas', city: 'Saint-Nicolas', lat: 46.717741, lng: -71.295939, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '65', name: 'CANAC - Jonquière', city: 'Jonquière', lat: 48.409709, lng: -71.20687, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '67', name: 'CANAC - Rimouski', city: 'Rimouski', lat: 48.461984, lng: -68.501125, rep: 'rep2', freq: '6-8 sem', visits: 7 },
    { id: '78', name: 'CANAC - Rivières-du-Loup', city: 'Rivière-du-Loup', lat: 47.838296, lng: -69.542516, rep: 'rep2', freq: '6-8 sem', visits: 7 }
  ]
};

// Aggregate stats per rep
(function(){
  function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
  }

  window.IB_DATA.reps.forEach(rep => {
    const stores = window.IB_DATA.stores.filter(s => s.rep === rep.id);
    const total = stores.reduce((acc, s) => acc + s.visits, 0);
    const totalDist = stores.reduce((acc, s) => {
      const d = haversineDistance(rep.home.lat, rep.home.lng, s.lat, s.lng);
      return acc + d * 2 * s.visits;
    }, 0);
    rep.stats = {
      magasins: stores.length,
      visMensuelles: stores.filter(s => s.freq === 'mensuel').length,
      vis68: stores.filter(s => s.freq === '6-8 sem').length,
      totalAn: total,
      moyMois: +(total / 12).toFixed(1),
      distanceTot: totalDist
    };
  });
})();
