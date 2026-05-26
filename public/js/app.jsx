// =============================================================================
// Interbois — Gestion territoriale
// Main React app + Leaflet integration
// =============================================================================

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ----- Tweakable defaults (host rewrites this on disk) ----------------------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "side": "left",
  "markerStyle": "dot",
  "mapStyle": "voyager",
  "density": "regular",
  "showLabels": false
}/*EDITMODE-END*/;

// ----- Helpers --------------------------------------------------------------
const REPS = window.IB_DATA.reps;
const STORES = window.IB_DATA.stores;

function repById(id) { return REPS.find(r => r.id === id); }

// Fetch real routing from OSRM (Open Source Routing Machine)
async function buildPath(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('OSRM request failed');
    const data = await response.json();
    if (!data.routes || !data.routes[0]) throw new Error('No route found');
    const coords = data.routes[0].geometry.coordinates;
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch (err) {
    console.warn('Routing failed, using straight line fallback:', err);
    return [[from.lat, from.lng], [to.lat, to.lng]];
  }
}

function formatNum(n) { return n.toLocaleString('fr-CA'); }

// =============================================================================
// MAP COMPONENT — wraps Leaflet
// =============================================================================
function MapView({ stores, reps, layers, selectedStore, onSelectStore, markerStyle, mapStyle }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const layerRefs = useRef({ stores: null, homes: null, route: null });
  const markersRef = useRef({});
  const [cursor, setCursor] = useState({ lat: 46.5, lng: -71.3 });
  const [zoom, setZoom] = useState(8);

  // Map tile URL based on style
  const tileUrl = useMemo(() => {
    switch (mapStyle) {
      case 'positron':
        return 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
      case 'mono':
        return 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
      case 'voyager':
      default:
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';
    }
  }, [mapStyle]);

  // Initialize map once
  useEffect(() => {
    const map = L.map(mapEl.current, {
      center: [46.5, -71.5],
      zoom: 8,
      minZoom: 6,
      maxZoom: 14,
      zoomControl: false,
      attributionControl: true
    });
    mapRef.current = map;

    map.on('mousemove', (e) => {
      setCursor({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    map.on('zoomend', () => setZoom(map.getZoom()));

    layerRefs.current.stores = L.layerGroup().addTo(map);
    layerRefs.current.homes = L.layerGroup().addTo(map);
    layerRefs.current.route = L.layerGroup().addTo(map);

    return () => map.remove();
  }, []);

  // Swap tile layer when style changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (map._ibTiles) map.removeLayer(map._ibTiles);
    const tiles = L.tileLayer(tileUrl, {
      attribution: 'CARTO · OSM',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);
    map._ibTiles = tiles;

    // mono mode: greyscale
    setTimeout(() => {
      const pane = map.getPane('tilePane');
      if (pane) pane.style.filter = mapStyle === 'mono' ? 'grayscale(1) contrast(1.05)' : '';
    }, 50);
  }, [tileUrl, mapStyle]);

  // Labels layer (city/place names) — toggled separately on top of base tiles
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (map._ibLabels) {
      map.removeLayer(map._ibLabels);
      map._ibLabels = null;
    }
    if (!layers.labels) return;
    const labelsUrl = mapStyle === 'voyager'
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png';
    map._ibLabels = L.tileLayer(labelsUrl, {
      subdomains: 'abcd',
      maxZoom: 19,
      pane: 'shadowPane' // sits above tiles, below markers
    }).addTo(map);
    if (mapStyle === 'mono') {
      // also grayscale the labels pane
      const pane = map.getPane('shadowPane');
      if (pane) pane.style.filter = 'grayscale(1) contrast(1.05)';
    } else {
      const pane = map.getPane('shadowPane');
      if (pane) pane.style.filter = '';
    }
  }, [layers.labels, mapStyle]);

  // Render store markers
  useEffect(() => {
    if (!layerRefs.current.stores) return;
    layerRefs.current.stores.clearLayers();
    markersRef.current = {};

    if (!layers.stores) return;

    stores.forEach(store => {
      const rep = repById(store.rep);
      const repClass = store.rep === 'rep1' ? 'ib-marker--rep1' : 'ib-marker--rep2';
      const styleClass = markerStyle === 'pin' ? 'ib-marker--pin' :
                         markerStyle === 'ring' ? 'ib-marker--ring' : '';
      const selectedClass = selectedStore?.id === store.id ? 'is-selected' : '';
      const icon = L.divIcon({
        className: 'ib-marker-wrap',
        html: `<div class="ib-marker ${repClass} ${styleClass} ${selectedClass}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      const m = L.marker([store.lat, store.lng], { icon }).addTo(layerRefs.current.stores);
      m.on('click', () => onSelectStore(store));
      markersRef.current[store.id] = m;
    });
  }, [stores, layers.stores, markerStyle, selectedStore]);

  // Render home markers (rep domiciles)
  useEffect(() => {
    if (!layerRefs.current.homes) return;
    layerRefs.current.homes.clearLayers();

    if (!layers.homes) return;

    reps.forEach(rep => {
      const cls = rep.id === 'rep2' ? 'ib-home--rep2' : '';
      const icon = L.divIcon({
        className: 'ib-home-wrap',
        html: `<div class="ib-home ${cls}">${rep.name.split(' ')[1] || ''}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      L.marker([rep.home.lat, rep.home.lng], { icon, zIndexOffset: 1000 }).addTo(layerRefs.current.homes);
    });
  }, [reps, layers.homes]);

  // Render animated route to selected store
  useEffect(() => {
    if (!layerRefs.current.route) return;
    layerRefs.current.route.clearLayers();
    if (!selectedStore) return;

    const loadRoute = async () => {
      const rep = repById(selectedStore.rep);
      const pts = await buildPath(rep.home, selectedStore);

      // Halo (white outline)
      L.polyline(pts, {
        color: '#FFFFFF',
        weight: 7,
        opacity: 0.9,
        lineCap: 'round'
      }).addTo(layerRefs.current.route);

      // Main animated dashed line in rep color
      const main = L.polyline(pts, {
        color: rep.color,
        weight: 3,
        opacity: 1,
        lineCap: 'round',
        dashArray: '8 4',
        className: 'ib-route'
      }).addTo(layerRefs.current.route);

      // Fit bounds gently
      const map = mapRef.current;
      if (map) {
        const bounds = L.latLngBounds(pts);
        map.flyToBounds(bounds, { padding: [80, 80], duration: 0.8, maxZoom: 11 });
      }
    };

    loadRoute();
  }, [selectedStore]);

  // Resize on layout change
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    });
    if (mapEl.current) obs.observe(mapEl.current);
    return () => obs.disconnect();
  }, []);

  const zoomIn = () => mapRef.current && mapRef.current.zoomIn();
  const zoomOut = () => mapRef.current && mapRef.current.zoomOut();
  const resetView = () => mapRef.current && mapRef.current.flyTo([46.5, -71.5], 8, { duration: 0.6 });

  return (
    <div className="map-wrap">
      <div ref={mapEl} style={{ height: '100%', width: '100%' }} />
      <div className="map-readout">
        <span className="demi" />
        <span className="num">lat {cursor.lat.toFixed(3)}°</span>
        <span className="num">lng {cursor.lng.toFixed(3)}°</span>
        <span className="num" style={{ color: 'var(--fg2)' }}>z{zoom}</span>
      </div>
      <div className="map-controls">
        <button onClick={zoomIn} aria-label="Zoom in">+</button>
        <button onClick={zoomOut} aria-label="Zoom out">−</button>
        <button onClick={resetView} aria-label="Reset view" style={{ fontSize: 11 }}>⌂</button>
      </div>
      <div className="map-foot">
        <span className="demi" />
        <span>interbois.ca</span>
        <span className="sep" />
        <span>{STORES.length} magasins · {REPS.length} représentants</span>
      </div>
    </div>
  );
}

// =============================================================================
// SIDEBAR PARTS
// =============================================================================
function RepCard({ rep, isActive, onClick }) {
  const s = rep.stats;
  return (
    <div
      className={`rep ${isActive ? 'is-active' : ''}`}
      style={{ '--rep-color': rep.color }}
      onClick={onClick}
    >
      <div className="rep-head">
        <span className="rep-dot" />
        <div className="rep-name">{rep.name} <span style={{ color: 'var(--fg2)', fontWeight: 400 }}>· {rep.home.city}</span></div>
      </div>
      <div className="rep-region" style={{ marginBottom: 12 }}>{rep.region.toUpperCase()}</div>
      <div className="rep-stats">
        <div className="row"><span className="k">Magasins</span><span className="v">{s.magasins}</span></div>
        <div className="row"><span className="k">Mens.</span><span className="v">{s.visMensuelles}</span></div>
        <div className="row"><span className="k">6–8 sem</span><span className="v">{s.vis68}</span></div>
        <div className="row"><span className="k">Total / an</span><span className="v">{s.totalAn}</span></div>
        <div className="row"><span className="k">Moy / mois</span><span className="v">{s.moyMois}</span></div>
        <div className="row"><span className="k">Distance</span><span className="v">{formatNum(s.distanceTot)}</span></div>
      </div>
      <div className="rep-foot">
        <span>Domicile</span>
        <span className="km">{rep.home.city}</span>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, count }) {
  return (
    <div className={`toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="sw" />
      <span className="label">{label}</span>
      {count != null && <span className="count">{count}</span>}
    </div>
  );
}

function Sidebar({
  activeRep, setActiveRep,
  layers, setLayers,
  query, setQuery,
  selectedStore, setSelectedStore,
  filteredStores
}) {
  return (
    <aside className="sidebar">
      {/* Recherche */}
      <div className="sb-section">
        <div className="sb-eyebrow">Recherche <span className="num">{filteredStores.length}/{STORES.length}</span></div>
        <div className="search">
          <span className="icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Magasin, ville, secteur…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Représentants */}
      <div className="sb-section">
        <div className="sb-eyebrow">Représentants <span className="num">02</span></div>
        {REPS.map(rep => (
          <RepCard
            key={rep.id}
            rep={rep}
            isActive={activeRep === rep.id}
            onClick={() => setActiveRep(activeRep === rep.id ? null : rep.id)}
          />
        ))}
      </div>

      {/* Territoires (action) */}
      <div className="sb-section">
        <div className="sb-eyebrow">Territoires</div>
        <button className="btn">
          <span>Initialiser territoires</span>
          <span className="arrow">→</span>
        </button>
        <div style={{ fontSize: 11, color: 'var(--fg2)', marginTop: 10, lineHeight: 1.5 }}>
          Recalcule les affectations des <b style={{ color: 'var(--fg1)' }}>{STORES.length} magasins</b> à partir des points de domicile.
        </div>
      </div>

      {/* Affichage */}
      <div className="sb-section">
        <div className="sb-eyebrow">Affichage</div>
        <div className="toggles">
          <Toggle
            checked={layers.stores}
            onChange={v => setLayers(l => ({ ...l, stores: v }))}
            label="Magasins Canac"
            count={STORES.length}
          />
          <Toggle
            checked={layers.homes}
            onChange={v => setLayers(l => ({ ...l, homes: v }))}
            label="Domiciles représentants"
            count={REPS.length}
          />
          <Toggle
            checked={layers.labels}
            onChange={v => setLayers(l => ({ ...l, labels: v }))}
            label="Étiquettes (villes)"
          />
        </div>
      </div>

      {/* Légende */}
      <div className="sb-section">
        <div className="sb-eyebrow">Légende</div>
        <div className="legend">
          <div className="row"><span className="mark" style={{ background: '#000' }} /> Magasin · Rep 1</div>
          <div className="row"><span className="mark" style={{ background: '#FE5000' }} /> Magasin · Rep 2</div>
          <div className="row"><span className="mark mark--home" /> Domicile représentant</div>
          <div className="row"><span className="mark mark--route" style={{ background: '#000' }} /> Itinéraire calculé</div>
        </div>
      </div>

      {/* Route info bar (sticky bottom) */}
      {selectedStore && (() => {
        const rep = repById(selectedStore.rep);
        return (
          <div className="route-info" style={{ position: 'relative' }}>
            <button className="close" onClick={() => setSelectedStore(null)}>×</button>
            <div className="label">Itinéraire · {rep.name}</div>
            <div className="dest">{selectedStore.name}</div>
            <div className="stats">
              <div>
                <span className="v">{selectedStore.dist}<span style={{ fontSize: 11, color: 'var(--ib-grey-medium)', marginLeft: 4 }}>km</span></span>
                <span className="k">aller simple</span>
              </div>
              <div>
                <span className="v" style={{ color: 'var(--ib-white)' }}>≈ {Math.round(selectedStore.dist / 80 * 60)}<span style={{ fontSize: 11, color: 'var(--ib-grey-medium)', marginLeft: 4 }}>min</span></span>
                <span className="k">durée estimée</span>
              </div>
            </div>
          </div>
        );
      })()}
    </aside>
  );
}

// =============================================================================
// HEADER
// =============================================================================
function Header() {
  const [now] = useState(new Date());
  const fmt = now.toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <header className="app-header">
      <div className="wordmark">
        <img src="assets/logo-white.png" alt="interbois" />
        <span className="divider" />
        <span className="label">Gestion territoriale</span>
      </div>
      <div />
      <div className="meta">
        <span className="item"><span className="demi-rond" /></span>
        <span className="item"><span>SESSION</span><b>2026 · Q2</b></span>
        <span className="item"><span>DATE</span><b>{fmt}</b></span>
        <span className="item"><span>UTILISATEUR</span><b>M. Lemieux</b></span>
      </div>
    </header>
  );
}

// =============================================================================
// MAIN APP
// =============================================================================
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [query, setQuery] = useState('');
  const [activeRep, setActiveRep] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [layers, setLayers] = useState({ stores: true, homes: true, labels: true });

  // Filter stores based on search query AND active rep
  const filteredStores = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STORES.filter(s => {
      if (activeRep && s.rep !== activeRep) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) ||
             s.city.toLowerCase().includes(q);
    });
  }, [query, activeRep]);

  // Auto-clear selected if filter excludes it
  useEffect(() => {
    if (selectedStore && !filteredStores.find(s => s.id === selectedStore.id)) {
      setSelectedStore(null);
    }
  }, [filteredStores, selectedStore]);

  return (
    <div className="app" data-side={t.side} data-density={t.density}>
      <Header />
      <div className="app-main">
        <Sidebar
          activeRep={activeRep}
          setActiveRep={setActiveRep}
          layers={layers}
          setLayers={setLayers}
          query={query}
          setQuery={setQuery}
          selectedStore={selectedStore}
          setSelectedStore={setSelectedStore}
          filteredStores={filteredStores}
        />
        <MapView
          stores={filteredStores}
          reps={REPS}
          layers={layers}
          selectedStore={selectedStore}
          onSelectStore={setSelectedStore}
          markerStyle={t.markerStyle}
          mapStyle={t.mapStyle}
        />
      </div>

      <TweaksPanel>
        <TweakSection label="Disposition" />
        <TweakRadio
          label="Panneau"
          value={t.side}
          options={[{ value: 'left', label: 'Gauche' }, { value: 'right', label: 'Droite' }]}
          onChange={v => setTweak('side', v)}
        />
        <TweakRadio
          label="Densité"
          value={t.density}
          options={[{ value: 'compact', label: 'Compact' }, { value: 'regular', label: 'Aéré' }]}
          onChange={v => setTweak('density', v)}
        />

        <TweakSection label="Carte" />
        <TweakSelect
          label="Fond de carte"
          value={t.mapStyle}
          options={[
            { value: 'voyager', label: 'Voyager — chaud' },
            { value: 'positron', label: 'Positron — clair' },
            { value: 'mono', label: 'Monochrome N&B' }
          ]}
          onChange={v => setTweak('mapStyle', v)}
        />

        <TweakSection label="Marqueurs" />
        <TweakRadio
          label="Style"
          value={t.markerStyle}
          options={[
            { value: 'dot', label: 'Point' },
            { value: 'pin', label: 'Goutte' },
            { value: 'ring', label: 'Anneau' }
          ]}
          onChange={v => setTweak('markerStyle', v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
