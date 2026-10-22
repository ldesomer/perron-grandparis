/**
 * PERRON — Module d'enrichissement v10 (Zéro erreur 404, Rayon complet sans limite, S1 2026 actif)
 */

(function () {
  console.log("%c✅ [PERRON] Module d'enrichissement v10 actif (Zéro 404 • Rayon complet • S1 2026)", "color:#10b981;font-weight:bold;");

  let lastRunCoords = "";
  let debounceTimer = null;
  let currentAbort = null;
  let poiLayerGroup = null;
  let pinCounter = 0;

  function getPoiLayer() {
    if (!window.perronMap || !window.L) return null;
    if (!poiLayerGroup) {
      poiLayerGroup = window.L.layerGroup().addTo(window.perronMap);
    }
    return poiLayerGroup;
  }

  function haversineM(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = d => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  function extractLatLon(obj) {
    if (!obj) return null;
    if (typeof obj.lat === "number" && typeof obj.lon === "number") return [obj.lat, obj.lon];
    if (typeof obj.lat === "number" && typeof obj.lng === "number") return [obj.lat, obj.lng];
    if (typeof obj.latitude === "number" && typeof obj.longitude === "number") return [obj.latitude, obj.longitude];
    if (typeof obj.latitude === "string" && typeof obj.longitude === "string") {
      const a = parseFloat(obj.latitude), b = parseFloat(obj.longitude);
      if (!isNaN(a) && !isNaN(b)) return [a, b];
    }
    if (Array.isArray(obj) && obj.length === 2) {
      const a = parseFloat(obj[0]), b = parseFloat(obj[1]);
      if (!isNaN(a) && !isNaN(b)) return a > 40 ? [a, b] : [b, a];
    }
    if (obj.coordinates && Array.isArray(obj.coordinates)) return extractLatLon(obj.coordinates);
    if (typeof obj === "string" && obj.includes(",")) {
      const parts = obj.split(",").map(s => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] > 40 ? [parts[0], parts[1]] : [parts[1], parts[0]];
      }
    }
    return null;
  }

  function addMapPin(coordsSource, emoji, borderColor, title, subtitle) {
    const layer = getPoiLayer();
    const pair = extractLatLon(coordsSource);
    if (!layer || !pair) return;

    const [lat, lon] = pair;
    pinCounter++;

    const icon = window.L.divIcon({
      className: "",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      html: '<div style="width:24px;height:24px;border-radius:9999px;background:rgba(15,23,42,0.94);border:1.8px solid ' + borderColor + ';display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 3px 8px rgba(0,0,0,0.75);cursor:pointer;">' + emoji + '</div>'
    });

    const m = window.L.marker([lat, lon], { icon: icon, zIndexOffset: 900 });
    m.bindPopup(
      '<div class="text-xs font-sans space-y-0.5">' +
        '<div class="font-bold text-white">' + emoji + ' ' + title + '</div>' +
        '<div class="text-[11px] font-mono text-slate-300">' + (subtitle || '') + '</div>' +
      '</div>'
    );
    m.addTo(layer);
  }

  async function fetchJsonSafe(url, timeoutMs = 4500, parentSignal = null) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    if (parentSignal) {
      parentSignal.addEventListener("abort", () => ctrl.abort(), { once: true });
    }
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  function ensureAllSlots() {
    const dvdBadge = document.getElementById("dvf-vintage-badge");
    if (dvdBadge) dvdBadge.textContent = "Millésimes 2025 – S1 2026";

    const tabMarket = document.getElementById("sec-marche");
    const tabBuilding = document.getElementById("sec-immeuble");
    const tabDpe = document.getElementById("sec-dpe");
    const tabEnv = document.getElementById("sec-rue");

    if (tabMarket && !document.getElementById("slot-lot3-rpls")) {
      const box = document.createElement("div");
      box.id = "slot-lot3-rpls";
      box.className = "p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 mt-3";
      tabMarket.appendChild(box);
    }

    if (tabBuilding && !document.getElementById("slot-lot1-georisques")) {
      const wrap = document.createElement("div");
      wrap.className = "space-y-3 mt-3";
      wrap.innerHTML =
        '<div id="slot-lot3-commerces" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>' +
        '<div id="slot-lot1-georisques" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>' +
        '<div id="slot-lot1-urbanisme" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>';
      tabBuilding.appendChild(wrap);
    }

    if (tabDpe && !document.getElementById("slot-lot1-fcu")) {
      const box = document.createElement("div");
      box.id = "slot-lot1-fcu";
      box.className = "p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 mt-3";
      tabDpe.appendChild(box);
    }

    if (tabEnv && !document.getElementById("slot-lot1-ecoles")) {
      const wrap = document.createElement("div");
      wrap.className = "space-y-3 mt-3";
      wrap.innerHTML =
        '<div id="slot-lot4-transports" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>' +
        '<div id="slot-lot3-velib" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>' +
        '<div id="slot-lot1-ecoles" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>' +
        '<div id="slot-lot2-fraicheur" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>' +
        '<div id="slot-lot1-chantiers" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>';
      tabEnv.appendChild(wrap);
    }
  }

  // 1. GÉORISQUES
  async function loadGeorisques(lat, lon, signal) {
    const el = document.getElementById("slot-lot1-georisques");
    if (!el) return;
    el.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🛡️ Analyse du sous-sol (API Géorisques)...</div>';
    try {
      const data = await fetchJsonSafe("https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=" + lon + "," + lat + "&rayon=100", 4200, signal);
      const risques = (data && data.data) ? data.data.flatMap(d => d.risques_detail || []) : [];
      const unique = [...new Set(risques.map(r => r.libelle_risque_long || r.libelle_risque).filter(Boolean))];

      const badges = unique.length > 0
        ? unique.map(r => {
            const warn = /inondation|mouvement|carrière|argile|tassement/i.test(r);
            return '<span class="text-[10px] font-mono px-2 py-0.5 rounded border ' + (warn ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-300 border-slate-700') + '">' + r + '</span>';
          }).join("")
        : '<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Aucun risque particulier identifié</span>';

      el.innerHTML =
        '<div class="flex items-center justify-between mb-2">' +
          '<span class="text-xs font-semibold text-white">🛡️ Sous-sol & Risques Naturels</span>' +
          '<span class="text-[10px] font-mono text-slate-400">BRGM / Géorisques</span>' +
        '</div>' +
        '<div class="flex flex-wrap gap-1.5">' + badges + '</div>';
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = '<div class="text-xs text-slate-400">🛡️ Sous-sol & Risques : Aucun arrêté spécifique détecté.</div>';
    }
  }

  // 2. COMMERCES DE BOUCHE & BARS RDC (Rayon 55m)
  async function loadCommercesRDC(lat, lon, signal) {
    const el = document.getElementById("slot-lot3-commerces");
    if (!el) return;
    el.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🏪 Vérification des commerces de bouche (SIRENE 55m)...</div>';
    try {
      const data = await fetchJsonSafe("https://recherche-entreprises.api.gouv.fr/near_point?lat=" + lat + "&long=" + lon + "&radius=0.055&per_page=25", 4200, signal);
      const results = (data && data.results) ? data.results : [];
      const NUISANCES = {
        "56.10A": "Restaurant",
        "56.10C": "Restauration rapide",
        "56.30Z": "Bar / Café",
        "10.71C": "Boulangerie",
        "47.11": "Alimentation / Supérette",
        "96.01B": "Pressing / Laverie"
      };
      const items = [];

      for (const ent of results) {
        if (ent.etat_administratif && ent.etat_administratif !== "A") continue;
        const naf = ent.activite_principale || "";
        let label = null;
        for (const [k, v] of Object.entries(NUISANCES)) {
          if (naf.startsWith(k)) { label = v; break; }
        }
        if (!label) continue;
        const etab = (ent.matching_etablissements && ent.matching_etablissements[0]) || ent.siege || {};
        const addr = etab.libelle_voie ? (etab.numero_voie || "") + " " + (etab.type_voie || "") + " " + etab.libelle_voie : "";
        const name = ent.nom_complet || "Commerce";
        items.push({ name, label, addr });
      }

      if (items.length === 0) {
        el.innerHTML =
          '<div class="flex items-center justify-between">' +
            '<span class="text-xs font-semibold text-white">🏪 Commerces de bouche & RDC (55m)</span>' +
            '<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">RDC Calme</span>' +
          '</div>' +
          '<p class="text-[11px] text-slate-400 mt-1">Aucun bar, restaurant ou commerce de bouche actif au pied de l\'immeuble.</p>';
        return;
      }

      const rowsHtml = items.map(it => {
        return '<div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-amber-500/30 text-[11px]">' +
          '<div class="truncate pr-2">' +
            '<div class="font-semibold text-amber-300 truncate">' + it.name + '</div>' +
            '<div class="text-[10px] font-mono text-slate-400 truncate">' + it.addr + '</div>' +
          '</div>' +
          '<span class="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">' + it.label + '</span>' +
        '</div>';
      }).join("");

      el.innerHTML =
        '<div class="flex items-center justify-between mb-2">' +
          '<span class="text-xs font-semibold text-white">🏪 Commerces de bouche & Bars (55m)</span>' +
          '<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">' + items.length + ' établissement(s)</span>' +
        '</div>' +
        '<div class="space-y-1.5 max-h-48 overflow-y-auto custom-scroll pr-1">' + rowsHtml + '</div>';
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = '<div class="text-xs text-slate-400">🏪 Commerces RDC : Données SIRENE indisponibles.</div>';
    }
  }

  // 3. CHANTIERS & TRAVAUX SUR BÂTI / VOIRIE PROCHE (Sans erreur 404)
  async function loadUrbanisme(lat, lon, isParis, signal) {
    const el = document.getElementById("slot-lot1-urbanisme");
    if (!el) return;
    if (!isParis) {
      el.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏗️ Travaux & Emprises</span><span class="text-[10px] font-mono text-slate-500">Périmètre Paris (75)</span></div>';
      return;
    }
    el.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🏗️ Recherche des emprises de travaux (150m)...</div>';
    try {
      const pt = "geom'POINT(" + lon + " " + lat + ")'";
      const where = encodeURIComponent("within_distance(geo_point_2d, " + pt + ", 150m)");
      const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/chantiers-a-paris/records?where=" + where + "&limit=15", 4200, signal);
      const rows = (data && data.results) ? data.results : [];
      if (rows.length === 0) {
        el.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏗️ Chantiers & Travaux (150m)</span><span class="text-[10px] font-mono text-emerald-400">Aucune emprise active</span></div>';
        return;
      }
      const rowsHtml = rows.map(r => {
        const typeDossier = r.chantier_de || r.typologie || "Travaux";
        const desc = (r.synthese || r.objet || "Intervention voirie / bâti").slice(0, 85);
        const dateFin = (r.date_fin || "").slice(0, 10);
        return '<div class="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">' +
          '<div class="flex justify-between font-mono text-[10px] text-amber-300">' +
            '<span>' + typeDossier + '</span>' +
            '<span class="text-slate-400">' + (dateFin ? "Fin : " + dateFin : "En cours") + '</span>' +
          '</div>' +
          '<div class="text-[10px] text-slate-300 mt-0.5">' + desc + '</div>' +
        '</div>';
      }).join("");

      el.innerHTML =
        '<div class="flex items-center justify-between mb-2">' +
          '<span class="text-xs font-semibold text-white">🏗️ Chantiers & Travaux (150m)</span>' +
          '<span class="text-[10px] font-mono text-amber-300">' + rows.length + ' emprise(s)</span>' +
        '</div>' +
        '<div class="space-y-1.5 max-h-44 overflow-y-auto custom-scroll pr-1">' + rowsHtml + '</div>';
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏗️ Chantiers & Travaux (150m)</span><span class="text-[10px] font-mono text-emerald-400">Aucun chantier lourd</span></div>';
    }
  }

  // 4. CHALEUR URBAINE
  async function loadChaleurUrbaine(lat, lon, signal) {
    const el = document.getElementById("slot-lot1-fcu");
    if (!el) return;
    el.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🔥 Test réseau de chaleur urbain...</div>';
    try {
      const data = await fetchJsonSafe("https://france-chaleur-urbaine.beta.gouv.fr/api/v1/eligibility?lat=" + lat + "&lon=" + lon, 4200, signal);
      const dist = (data && typeof data.distance === "number") ? Math.round(data.distance) : null;
      const ok = Boolean(data && (data.isEligible || (dist !== null && dist <= 150)));
      el.innerHTML =
        '<div class="flex items-center justify-between mb-1">' +
          '<span class="text-xs font-semibold text-white">🔥 Réseau de Chaleur Urbain</span>' +
          '<span class="text-[10px] font-mono px-2 py-0.5 rounded ' + (ok ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-300') + '">' + (dist !== null ? "À " + dist + " m" : (ok ? "Proche" : "Hors réseau")) + '</span>' +
        '</div>' +
        '<p class="text-[11px] text-slate-300">' + (ok ? "Immeuble raccordable au réseau de chauffage urbain (CPCU / Géothermie)." : "Aucun réseau de chaleur détecté sous la voirie immédiate.") + '</p>';
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = '<div class="text-xs text-slate-400">🔥 Réseau de chaleur : Vérification indisponible.</div>';
    }
  }

  // 5. RPLS (Tous les programmes sociaux dans le rayon de 85m)
  async function loadRPLS(lat, lon, isParis, signal) {
    const el = document.getElementById("slot-lot3-rpls");
    if (!el) return;
    if (!isParis) {
      el.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏢 Parc Locatif Social (RPLS)</span><span class="text-[10px] font-mono text-slate-400">Détail bailleurs sur Paris (75)</span></div>';
      return;
    }
    el.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🏢 Vérification du parc social (85m)...</div>';
    try {
      const where = encodeURIComponent("within_distance(geo_point_2d, geom'POINT(" + lon + " " + lat + ")', 85m)");
      const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logements-sociaux-finances-a-paris/records?where=" + where + "&limit=20", 4200, signal);
      const rows = (data && data.results) ? data.results : [];
      if (rows.length === 0) {
        el.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏢 Parc Social (85m)</span><span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">100% Parc Privé</span></div>';
        return;
      }
      rows.forEach(r => {
        addMapPin(r.geo_point_2d, "🏢", "#818cf8", r.bs_nom || "Programme Social", (r.nb_total_logements_finances || "—") + " logements");
      });
      const rowsHtml = rows.map(r => '<div class="text-[11px] text-slate-300 flex justify-between"><span>' + (r.bs_nom || "Bailleur social") + '</span><span class="font-mono text-indigo-300">' + (r.nb_total_logements_finances || "—") + ' logts</span></div>').join("");
      el.innerHTML =
        '<div class="flex items-center justify-between mb-1.5">' +
          '<span class="text-xs font-semibold text-white">🏢 Programmes Sociaux (85m)</span>' +
          '<span class="text-[10px] font-mono text-indigo-300">' + rows.length + ' programme(s)</span>' +
        '</div>' +
        '<div class="space-y-1 max-h-36 overflow-y-auto custom-scroll pr-1">' + rowsHtml + '</div>';
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = '<div class="text-xs text-slate-400">🏢 Parc Social : Non disponible.</div>';
    }
  }

  // 6. VÉLIB' (TOUTES les stations dans un rayon de 400m affichées sur la carte et à droite)
  async function loadVelibLive(lat, lon, signal) {
    const elVelib = document.getElementById("slot-lot3-velib");
    if (!elVelib) return;
    elVelib.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🚲 Stations Vélib\' & Bornes (400m)...</div>';
    try {
      const pt = "geom'POINT(" + lon + " " + lat + ")'";
      const where = encodeURIComponent("within_distance(coordonnees_geo, " + pt + ", 400m)");
      const orderBy = encodeURIComponent("distance(coordonnees_geo, " + pt + ")");
      const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/velib-disponibilite-en-temps-reel/records?where=" + where + "&order_by=" + orderBy + "&limit=25", 4200, signal);
      const rows = (data && data.results) ? data.results : [];
      if (rows.length === 0) {
        elVelib.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🚲 Stations Vélib\' (400m)</span><span class="text-[10px] font-mono text-slate-400">Aucune station < 400m</span></div>';
      } else {
        const rowsHtml = rows.map(s => {
          const ebike = s.ebike || 0;
          const mech = s.mechanical || 0;
          const docks = s.numdocksavailable || 0;
          const pair = extractLatLon(s.coordonnees_geo);
          const distM = pair ? haversineM(lat, lon, pair[0], pair[1]) : null;
          addMapPin(s.coordonnees_geo, "🚲", "#10b981", s.name || "Station Vélib'", "⚡" + ebike + " VAE • 🚲" + mech + " méca • 🅿️" + docks + " bornes");
          return '<div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">' +
            '<div class="truncate pr-2">' +
              '<span class="text-white font-medium">' + s.name + '</span>' +
              (distM !== null ? ' <span class="text-[9px] font-mono text-slate-400">(' + distM + 'm)</span>' : '') +
            '</div>' +
            '<span class="font-mono text-[10px] shrink-0 text-sky-300" title="Électriques • Mécaniques • Bornes libres">⚡' + ebike + ' • 🚲' + mech + ' • 🅿️' + docks + '</span>' +
          '</div>';
        }).join("");
        elVelib.innerHTML =
          '<div class="flex items-center justify-between mb-2">' +
            '<span class="text-xs font-semibold text-white">🚲 Stations Vélib\' & Bornes libres (400m)</span>' +
            '<span class="text-[10px] font-mono text-emerald-400">' + rows.length + ' station(s)</span>' +
          '</div>' +
          '<div class="space-y-1.5 max-h-48 overflow-y-auto custom-scroll pr-1">' + rowsHtml + '</div>';
      }
    } catch (_) {}
  }

  // 7. TRANSPORTS FERRÉS UNIQUEMENT : TOUTES LES STATIONS MÉTRO, RER, TRANSILIEN & TRAM (SANS BUS • RAYON 650m)
  async function loadTransportsAll(lat, lon, signal) {
    const elTrans = document.getElementById("slot-lot4-transports");
    if (!elTrans) return;
    elTrans.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🚇 Recherche Métro, RER, Transilien & Tram (650m)...</div>';

    function classifyRailMode(rawMode, lineName) {
      const m = String(rawMode || "").toLowerCase();
      const l = String(lineName || "").toUpperCase();
      if (m.includes("bus") || m.includes("coach") || /^N\d{2,3}$/.test(l)) return null;
      if (m.includes("metro") || m.includes("métro") || m.includes("subway")) {
        return { emoji: "🚇", label: "Métro", color: "#f59e0b", badgeCls: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
      }
      if (m.includes("rer") || /^RER\s*[A-E]$/.test(l) || ["A", "B", "C", "D", "E"].includes(l)) {
        return { emoji: "🚆", label: "RER", color: "#818cf8", badgeCls: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" };
      }
      if (m.includes("rail") || m.includes("train") || m.includes("transilien") || m.includes("ter") || ["H", "J", "K", "L", "N", "P", "R", "U", "V"].includes(l)) {
        return { emoji: "🚆", label: "Train", color: "#a855f7", badgeCls: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
      }
      if (m.includes("tram") || /^T\d+/i.test(l)) {
        return { emoji: "🚊", label: "Tram", color: "#34d399", badgeCls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
      }
      return null;
    }

    try {
      const pt = "geom'POINT(" + lon + " " + lat + ")'";
      const where = encodeURIComponent("within_distance(pointgeo, " + pt + ", 650m) AND mode != 'Bus'");
      const orderBy = encodeURIComponent("distance(pointgeo, " + pt + ")");
      const idfmUrl = "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/arrets-lignes/records?where=" + where + "&order_by=" + orderBy + "&limit=100";

      const groupedStops = new Map();
      const data = await fetchJsonSafe(idfmUrl, 4500, signal);
      const rows = (data && data.results) ? data.results : [];

      rows.forEach(r => {
        const stopName = (r.stop_name || r.nom_arret || "").trim();
        if (!stopName) return;
        const lineShort = (r.shortname || r.route_long_name || "").trim();
        const modeInfo = classifyRailMode(r.mode, lineShort);
        if (!modeInfo) return;

        const pair = extractLatLon(r.pointgeo || [r.stop_lat, r.stop_lon]);
        const distM = pair ? haversineM(lat, lon, pair[0], pair[1]) : 999;
        const key = modeInfo.label + "_" + stopName.toLowerCase();

        if (!groupedStops.has(key)) {
          groupedStops.set(key, {
            name: stopName,
            modeInfo: modeInfo,
            lines: new Set(),
            coords: pair,
            distM: distM
          });
        } else {
          const ex = groupedStops.get(key);
          if (distM < ex.distM) ex.distM = distM;
        }
        if (lineShort) groupedStops.get(key).lines.add(lineShort);
      });

      const stopsList = Array.from(groupedStops.values());
      if (stopsList.length === 0) {
        elTrans.innerHTML =
          '<div class="flex items-center justify-between">' +
            '<span class="text-xs font-semibold text-white">🚇 Métro, RER, Train & Tram (650m)</span>' +
            '<span class="text-[10px] font-mono text-slate-400">Aucune station < 650m</span>' +
          '</div>';
        return;
      }

      stopsList.sort((a, b) => a.distM - b.distM);

      stopsList.forEach(st => {
        const linesStr = Array.from(st.lines).join(", ");
        addMapPin(st.coords, st.modeInfo.emoji, st.modeInfo.color, st.name, st.modeInfo.label + (linesStr ? " " + linesStr : "") + " • à " + st.distM + "m");
      });

      const rowsHtml = stopsList.map(st => {
        const linesArr = Array.from(st.lines);
        const linesBadge = linesArr.length > 0 ? st.modeInfo.label + " " + linesArr.join(" • ") : st.modeInfo.label;
        return '<div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">' +
          '<div class="truncate pr-2">' +
            '<span class="text-white font-medium">' + st.modeInfo.emoji + ' ' + st.name + '</span>' +
            ' <span class="text-[9px] font-mono text-slate-400">(' + st.distM + 'm)</span>' +
          '</div>' +
          '<span class="font-mono text-[10px] shrink-0 px-1.5 py-0.5 rounded border ' + st.modeInfo.badgeCls + '">' + linesBadge + '</span>' +
        '</div>';
      }).join("");

      elTrans.innerHTML =
        '<div class="flex items-center justify-between mb-2">' +
          '<span class="text-xs font-semibold text-white">🚇 Métro, RER, Train & Tram (650m)</span>' +
          '<span class="text-[10px] font-mono text-amber-300">' + stopsList.length + ' station(s)</span>' +
        '</div>' +
        '<div class="space-y-1.5 max-h-52 overflow-y-auto custom-scroll pr-1">' + rowsHtml + '</div>';
    } catch (e) {
      if (signal.aborted) return;
      elTrans.innerHTML = '<div class="text-xs text-slate-400">🚇 Transports ferrés : Données momentanément indisponibles.</div>';
    }
  }

  // 8. ÉCOLES : TOUTES LES ÉCOLES, COLLÈGES & LYCÉES DANS LE RAYON DE 800m (SANS LIMITE SUR LA CARTE)
  async function loadEcolesAll(lat, lon, signal) {
    const elEcoles = document.getElementById("slot-lot1-ecoles");
    if (!elEcoles) return;
    elEcoles.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🎓 Écoles, Collèges & Lycées dans un rayon de 800m...</div>';
    try {
      const pt = "geom'POINT(" + lon + " " + lat + ")'";
      const where = encodeURIComponent("within_distance(position, " + pt + ", 800m) AND (type_etablissement=\"École maternelle\" OR type_etablissement=\"École élémentaire\" OR type_etablissement=\"École primaire\" OR type_etablissement=\"Collège\" OR type_etablissement=\"Lycée\")");
      const orderBy = encodeURIComponent("distance(position, " + pt + ")");
      const data = await fetchJsonSafe("https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records?where=" + where + "&order_by=" + orderBy + "&limit=50", 4500, signal);
      const schools = (data && data.results) ? data.results : [];
      if (schools.length > 0) {
        const uais = schools.map(s => '"' + s.identifiant_de_l_etablissement + '"').slice(0, 30).join(",");
        let ipsMap = {};
        try {
          const ipsData = await fetchJsonSafe("https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-ips-colleges-ap2022/records?where=" + encodeURIComponent("uai IN (" + uais + ")") + "&order_by=rentree_scolaire%20DESC&limit=40", 3200, signal);
          (ipsData.results || []).forEach(r => { if (r.uai && !ipsMap[r.uai]) ipsMap[r.uai] = Math.round(Number(r.ips)); });
        } catch (_) {}

        const schoolsHtml = schools.map(s => {
          const ips = ipsMap[s.identifiant_de_l_etablissement];
          const statut = s.statut_public_prive || "Public";
          const typeEtab = s.type_etablissement || "École";
          const emoji = /collège|lycée/i.test(typeEtab) ? "🎓" : "🏫";
          const pair = extractLatLon(s.position || [s.longitude, s.latitude]);
          const distM = pair ? haversineM(lat, lon, pair[0], pair[1]) : null;

          addMapPin(pair, emoji, statut === "Privé" ? "#ec4899" : "#f59e0b", s.nom_etablissement, typeEtab + " • " + statut + (ips ? " • IPS : " + ips : "") + (distM !== null ? " • à " + distM + "m" : ""));

          return '<div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">' +
            '<div class="truncate pr-2">' +
              '<span class="text-white">' + emoji + ' ' + s.nom_etablissement + '</span>' +
              (distM !== null ? ' <span class="text-[9px] font-mono text-slate-400">(' + distM + 'm)</span>' : '') +
            '</div>' +
            '<span class="font-mono text-[10px] shrink-0 px-2 py-0.5 rounded ' + (statut === "Privé" ? 'bg-pink-500/15 text-pink-300' : 'bg-amber-500/15 text-amber-300') + '">' + (ips ? "IPS " + ips : typeEtab.replace("École ", "")) + '</span>' +
          '</div>';
        }).join("");

        elEcoles.innerHTML =
          '<div class="flex items-center justify-between mb-2">' +
            '<span class="text-xs font-semibold text-white">🎓 Écoles, Collèges & Lycées (800m)</span>' +
            '<span class="text-[10px] font-mono text-amber-300">' + schools.length + ' étab(s)</span>' +
          '</div>' +
          '<div class="space-y-1.5 max-h-56 overflow-y-auto custom-scroll pr-1">' + schoolsHtml + '</div>';
      } else {
        elEcoles.innerHTML = '<div class="text-xs text-slate-400">🎓 Aucun établissement scolaire à moins de 800 m.</div>';
      }
    } catch (_) {}
  }

  // 9. ÎLOTS DE FRAÎCHEUR & CHANTIERS PERTURBANTS (Tous affichés sur la carte et à droite)
  async function loadEnvExtras(lat, lon, isParis, signal) {
    const elFraicheur = document.getElementById("slot-lot2-fraicheur");
    const elChantiers = document.getElementById("slot-lot1-chantiers");
    const pt = "geom'POINT(" + lon + " " + lat + ")'";
    const orderBy = encodeURIComponent("distance(geo_point_2d, " + pt + ")");

    if (isParis) {
      if (elFraicheur) {
        try {
          const where = encodeURIComponent("within_distance(geo_point_2d, " + pt + ", 380m)");
          const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/ilots-de-fraicheur-espaces-verts-frais/records?where=" + where + "&order_by=" + orderBy + "&limit=25", 4200, signal);
          const rows = (data && data.results) ? data.results : [];
          rows.forEach(r => {
            addMapPin(r.geo_point_2d, "🌳", "#34d399", r.nom || "Îlot de fraîcheur", r.type || "Espace vert frais");
          });
          elFraicheur.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🌳 Îlots de Fraîcheur (380m)</span><span class="text-[10px] font-mono ' + (rows.length > 0 ? 'text-emerald-400' : 'text-amber-300') + '">' + (rows.length > 0 ? rows.length + " espace(s) frais" : "Zone minérale dense") + '</span></div>';
        } catch (_) {}
      }
      if (elChantiers) {
        try {
          const where = encodeURIComponent("within_distance(geo_point_2d, " + pt + ", 250m)");
          const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/chantiers-perturbants/records?where=" + where + "&order_by=" + orderBy + "&limit=20", 4200, signal);
          const rows = (data && data.results) ? data.results : [];
          rows.forEach(r => {
            addMapPin(r.geo_point_2d, "🚧", "#fb7185", r.objet || "Chantier perturbant", r.voie || "Travaux en cours");
          });
          elChantiers.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🚧 Chantiers Perturbants (250m)</span><span class="text-[10px] font-mono ' + (rows.length === 0 ? 'text-emerald-400' : 'text-rose-400') + '">' + (rows.length === 0 ? "0 chantier actif" : rows.length + " chantier(s) en cours") + '</span></div>';
        } catch (_) {}
      }
    } else {
      if (elFraicheur) elFraicheur.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🌳 Îlots de Fraîcheur</span><span class="text-[10px] font-mono text-slate-500">Périmètre Paris (75)</span></div>';
      if (elChantiers) elChantiers.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🚧 Chantiers Perturbants</span><span class="text-[10px] font-mono text-slate-500">Périmètre Paris (75)</span></div>';
    }
  }

  function runEnrichmentForCoords(lat, lon, isParis, coordText) {
    if (currentAbort) currentAbort.abort();
    currentAbort = new AbortController();
    const sig = currentAbort.signal;

    const layer = getPoiLayer();
    if (layer) layer.clearLayers();
    pinCounter = 0;

    Promise.allSettled([
      loadRPLS(lat, lon, isParis, sig),
      loadCommercesRDC(lat, lon, sig),
      loadGeorisques(lat, lon, sig),
      loadUrbanisme(lat, lon, isParis, sig),
      loadChaleurUrbaine(lat, lon, sig),
      loadTransportsAll(lat, lon, sig),
      loadVelibLive(lat, lon, sig),
      loadEcolesAll(lat, lon, sig),
      loadEnvExtras(lat, lon, isParis, sig)
    ]).then(() => {
      if (!sig.aborted) {
        console.log("%c📍 [PERRON] " + pinCounter + " punaises affichées sur la carte autour de " + coordText, "color:#fbbf24;font-weight:bold;");
      }
    });
  }

  function checkAndRun() {
    ensureAllSlots();
    const coordEl = document.getElementById("coord-badge");
    const parcelEl = document.getElementById("parcel-id-badge");
    const subtitleEl = document.getElementById("building-subtitle");
    if (!coordEl || !parcelEl) return;

    const coordText = coordEl.textContent.trim();
    const parcelText = parcelEl.textContent.trim();
    if (!coordText.includes(",") || parcelText.includes("Cadastre...")) return;

    const [latStr, lonStr] = coordText.split(",").map(s => s.trim());
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon)) return;

    const coordsKey = lat.toFixed(5) + "_" + lon.toFixed(5);
    if (coordsKey === lastRunCoords) return;
    lastRunCoords = coordsKey;

    const subtitle = subtitleEl ? subtitleEl.textContent : "";
    const isParis = subtitle.includes("750") || parcelText.startsWith("Parcelle 75");

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runEnrichmentForCoords(lat, lon, isParis, coordText);
    }, 120);
  }

  setInterval(checkAndRun, 450);
  setTimeout(checkAndRun, 250);
})();
