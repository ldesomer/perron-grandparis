/**
 * PERRON — Module d'enrichissement v6.1 (Base v6 PRD intacte + Transports IDFM/OSM : Métro, RER, Transilien, Tram, Bus)
 */

(function () {
  console.log("%c✅ [PERRON] Module d'enrichissement v6.1 actif (avec Transports)", "color:#10b981;font-weight:bold;");

  let lastRunSignature = "";
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

  function extractLatLon(obj) {
    if (!obj) return null;
    if (typeof obj.lat === "number" && typeof obj.lon === "number") return [obj.lat, obj.lon];
    if (typeof obj.lat === "number" && typeof obj.lng === "number") return [obj.lat, obj.lng];
    if (typeof obj.latitude === "number" && typeof obj.longitude === "number") return [obj.latitude, obj.longitude];
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
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      html: '<div style="width:26px;height:26px;border-radius:9999px;background:#0f172a;border:2px solid ' + borderColor + ';display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 4px 10px rgba(0,0,0,0.7);cursor:pointer;">' + emoji + '</div>'
    });

    const m = window.L.marker([lat, lon], { icon: icon, zIndexOffset: 1000 });
    m.bindPopup(
      '<div class="text-xs font-sans space-y-0.5">' +
        '<div class="font-bold text-white">' + emoji + ' ' + title + '</div>' +
        '<div class="text-[11px] font-mono text-slate-300">' + (subtitle || '') + '</div>' +
      '</div>'
    );
    m.addTo(layer);
  }

  async function fetchJsonSafe(url, timeoutMs = 4000, parentSignal = null) {
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
        '<div id="slot-lot1-urbanisme" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>' +
        '<div id="slot-lot2-antennes" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>';
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
    } else if (tabEnv && !document.getElementById("slot-lot4-transports")) {
      const velibEl = document.getElementById("slot-lot3-velib");
      const transBox = document.createElement("div");
      transBox.id = "slot-lot4-transports";
      transBox.className = "p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90";
      if (velibEl && velibEl.parentNode) {
        velibEl.parentNode.insertBefore(transBox, velibEl);
      } else {
        tabEnv.appendChild(transBox);
      }
    }
  }

  // 1. GÉORISQUES
  async function loadGeorisques(lat, lon, signal) {
    const el = document.getElementById("slot-lot1-georisques");
    if (!el) return;
    el.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🛡️ Analyse du sous-sol (API Géorisques)...</div>';
    try {
      const data = await fetchJsonSafe("https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=" + lon + "," + lat + "&rayon=100", 4000, signal);
      const risques = (data && data.data) ? data.data.flatMap(d => d.risques_detail || []) : [];
      const unique = [...new Set(risques.map(r => r.libelle_risque_long || r.libelle_risque).filter(Boolean))];

      const badges = unique.length > 0
        ? unique.slice(0, 6).map(r => {
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

  // 2. COMMERCES DE BOUCHE & BARS RDC
  async function loadCommercesRDC(lat, lon, signal) {
    const el = document.getElementById("slot-lot3-commerces");
    if (!el) return;
    el.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🏪 Vérification des commerces de bouche (SIRENE 45m)...</div>';
    try {
      const data = await fetchJsonSafe("https://recherche-entreprises.api.gouv.fr/near_point?lat=" + lat + "&long=" + lon + "&radius=0.045&per_page=15", 4000, signal);
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
        items.push({ name: ent.nom_complet || "Commerce", label, addr });
      }

      if (items.length === 0) {
        el.innerHTML =
          '<div class="flex items-center justify-between">' +
            '<span class="text-xs font-semibold text-white">🏪 Commerces de bouche & RDC (45m)</span>' +
            '<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">RDC Calme</span>' +
          '</div>' +
          '<p class="text-[11px] text-slate-400 mt-1">Aucun bar, restaurant ou commerce de bouche actif au pied de l\'immeuble.</p>';
        return;
      }

      const rowsHtml = items.slice(0, 4).map(it => {
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
          '<span class="text-xs font-semibold text-white">🏪 Commerces de bouche & Bars (45m)</span>' +
          '<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">' + items.length + ' établissement(s)</span>' +
        '</div>' +
        '<div class="space-y-1.5">' + rowsHtml + '</div>';
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = '<div class="text-xs text-slate-400">🏪 Commerces RDC : Données SIRENE indisponibles.</div>';
    }
  }

  // 3. URBANISME
  async function loadUrbanisme(lat, lon, isParis, signal) {
    const el = document.getElementById("slot-lot1-urbanisme");
    if (!el) return;
    if (!isParis) {
      el.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏗️ Urbanisme & Ravalements</span><span class="text-[10px] font-mono text-slate-500">Périmètre Paris (75)</span></div>';
      return;
    }
    el.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🏗️ Recherche des permis & travaux (120m)...</div>';
    try {
      const where = encodeURIComponent("within_distance(geo_point_2d, geom'POINT(" + lon + " " + lat + ")', 120m)");
      const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/autorisations-d-urbanisme-h-p-d/records?where=" + where + "&limit=3", 4000, signal);
      const rows = (data && data.results) ? data.results : [];
      if (rows.length === 0) {
        el.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏗️ Urbanisme & Ravalements (120m)</span><span class="text-[10px] font-mono text-emerald-400">Aucun dossier récent</span></div>';
        return;
      }
      const rowsHtml = rows.map(r => {
        const typeDossier = r.type_dossier || "Déclaration";
        const numVoirie = r.numero_voirie || "";
        const nomVoirie = r.nom_voirie || "";
        const dateDepot = (r.date_depot || "").slice(0, 10);
        const desc = (r.nature_travaux || r.description_travaux || "Travaux sur bâti existant").slice(0, 80);
        addMapPin(r.geo_point_2d, "🏗️", "#fbbf24", typeDossier + " • " + numVoirie + " " + nomVoirie, desc);
        return '<div class="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">' +
          '<div class="flex justify-between font-mono text-[10px] text-amber-300">' +
            '<span>' + typeDossier + ' • ' + numVoirie + ' ' + nomVoirie + '</span>' +
            '<span class="text-slate-400">' + dateDepot + '</span>' +
          '</div>' +
          '<div class="text-[10px] text-slate-300 mt-0.5">' + desc + '</div>' +
        '</div>';
      }).join("");

      el.innerHTML =
        '<div class="flex items-center justify-between mb-2">' +
          '<span class="text-xs font-semibold text-white">🏗️ Urbanisme & Ravalements (120m)</span>' +
          '<span class="text-[10px] font-mono text-amber-300">' + rows.length + ' dossier(s)</span>' +
        '</div>' +
        '<div class="space-y-1.5">' + rowsHtml + '</div>';
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = '<div class="text-xs text-slate-400">🏗️ Urbanisme : Aucun dossier détecté.</div>';
    }
  }

  // 4. ANTENNES ANFR
  async function loadAntennes(lat, lon, signal) {
    const el = document.getElementById("slot-lot2-antennes");
    if (!el) return;
    el.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">📡 Recherche des antennes 4G/5G (180m)...</div>';
    try {
      const where = encodeURIComponent("within_distance(coordonnees, geom'POINT(" + lon + " " + lat + ")', 180m)");
      const data = await fetchJsonSafe("https://data.opendatasoft.com/api/explore/v2.1/catalog/datasets/les-stations-radioelectriques-anfr@public/records?where=" + where + "&limit=6", 4000, signal);
      const rows = (data && data.results) ? data.results : [];
      if (rows.length === 0) {
        el.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">📡 Antennes 4G/5G (180m)</span><span class="text-[10px] font-mono text-emerald-400">Aucune à proximité</span></div>';
        return;
      }
      rows.forEach(r => {
        addMapPin(r.coordonnees || r.geo_point_2d, "📡", "#38bdf8", "Antenne " + (r.adm_lb_nom || r.operateur || "4G/5G"), "Support ANFR");
      });
      const ops = [...new Set(rows.map(r => r.adm_lb_nom || r.nom_op || r.operateur).filter(Boolean))];
      el.innerHTML =
        '<div class="flex items-center justify-between mb-1">' +
          '<span class="text-xs font-semibold text-white">📡 Antennes-Relais 4G/5G (180m)</span>' +
          '<span class="text-[10px] font-mono text-sky-300">' + rows.length + ' support(s) ANFR</span>' +
        '</div>' +
        '<p class="text-[11px] text-slate-300">Opérateurs détectés : <strong>' + (ops.slice(0, 4).join(", ") || "Multi-opérateurs") + '</strong></p>';
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = '<div class="text-xs text-slate-400">📡 Antennes ANFR : Non disponible.</div>';
    }
  }

  // 5. CHALEUR URBAINE
  async function loadChaleurUrbaine(lat, lon, signal) {
    const el = document.getElementById("slot-lot1-fcu");
    if (!el) return;
    el.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🔥 Test réseau de chaleur urbain...</div>';
    try {
      const data = await fetchJsonSafe("https://france-chaleur-urbaine.beta.gouv.fr/api/v1/eligibility?lat=" + lat + "&lon=" + lon, 4000, signal);
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

  // 6. RPLS (Logements Sociaux)
  async function loadRPLS(lat, lon, isParis, signal) {
    const el = document.getElementById("slot-lot3-rpls");
    if (!el) return;
    if (!isParis) {
      el.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏢 Parc Locatif Social (RPLS)</span><span class="text-[10px] font-mono text-slate-400">Détail bailleurs sur Paris (75)</span></div>';
      return;
    }
    el.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🏢 Vérification du parc social (75m)...</div>';
    try {
      const where = encodeURIComponent("within_distance(geo_point_2d, geom'POINT(" + lon + " " + lat + ")', 75m)");
      const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logements-sociaux-finances-a-paris/records?where=" + where + "&limit=3", 4000, signal);
      const rows = (data && data.results) ? data.results : [];
      if (rows.length === 0) {
        el.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏢 Parc Social (75m)</span><span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">100% Parc Privé</span></div>';
        return;
      }
      rows.forEach(r => {
        addMapPin(r.geo_point_2d, "🏢", "#818cf8", r.bs_nom || "Programme Social", (r.nb_total_logements_finances || "—") + " logements");
      });
      const rowsHtml = rows.map(r => '<div class="text-[11px] text-slate-300 flex justify-between"><span>' + (r.bs_nom || "Bailleur social") + '</span><span class="font-mono text-indigo-300">' + (r.nb_total_logements_finances || "—") + ' logts</span></div>').join("");
      el.innerHTML =
        '<div class="flex items-center justify-between mb-1.5">' +
          '<span class="text-xs font-semibold text-white">🏢 Programmes Sociaux (75m)</span>' +
          '<span class="text-[10px] font-mono text-indigo-300">' + rows.length + ' programme(s)</span>' +
        '</div>' +
        '<div class="space-y-1">' + rowsHtml + '</div>';
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = '<div class="text-xs text-slate-400">🏢 Parc Social : Non disponible.</div>';
    }
  }

  // 7. VÉLIB' (AVEC BORNES LIBRES DÉTAILLÉES)
  async function loadVelibLive(lat, lon, signal) {
    const elVelib = document.getElementById("slot-lot3-velib");
    if (!elVelib) return;
    elVelib.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🚲 Stations Vélib\' & Bornes (300m)...</div>';
    try {
      const where = encodeURIComponent("within_distance(coordonnees_geo, geom'POINT(" + lon + " " + lat + ")', 300m)");
      const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/velib-disponibilite-en-temps-reel/records?where=" + where + "&limit=4", 4000, signal);
      const rows = (data && data.results) ? data.results : [];
      if (rows.length === 0) {
        elVelib.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🚲 Stations Vélib\' (300m)</span><span class="text-[10px] font-mono text-slate-400">Aucune station < 300m</span></div>';
      } else {
        const rowsHtml = rows.map(s => {
          const ebike = s.ebike || 0;
          const mech = s.mechanical || 0;
          const docks = s.numdocksavailable || 0;
          addMapPin(s.coordonnees_geo, "🚲", "#10b981", s.name || "Station Vélib'", "⚡" + ebike + " VAE • 🚲" + mech + " méca • 🅿️" + docks + " bornes libres");
          return '<div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">' +
            '<span class="text-white font-medium truncate pr-2">' + s.name + '</span>' +
            '<span class="font-mono text-[10px] shrink-0 text-sky-300" title="Électriques • Mécaniques • Bornes libres">⚡' + ebike + ' • 🚲' + mech + ' • 🅿️' + docks + '</span>' +
          '</div>';
        }).join("");
        elVelib.innerHTML =
          '<div class="flex items-center justify-between mb-2">' +
            '<span class="text-xs font-semibold text-white">🚲 Stations Vélib\' & Bornes libres (300m)</span>' +
            '<span class="text-[10px] font-mono text-emerald-400">' + rows.length + ' station(s)</span>' +
          '</div>' +
          '<div class="space-y-1.5">' + rowsHtml + '</div>';
      }
    } catch (_) {}
  }

  // 8. TRANSPORTS EN COMMUN : MÉTRO, RER, TRANSILIEN, TRAM & BUS (IDFM + FALLBACK OVERPASS OSM)
  async function loadTransportsAll(lat, lon, signal) {
    const elTrans = document.getElementById("slot-lot4-transports");
    if (!elTrans) return;
    elTrans.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🚇 Recherche Métro, RER, Transilien, Tram & Bus (450m)...</div>';

    // Classification visuelle par mode de transport
    function classifyMode(rawMode, lineName) {
      const m = String(rawMode || "").toLowerCase();
      const l = String(lineName || "").toUpperCase();
      if (m.includes("metro") || m.includes("métro") || m === "subway") {
        return { emoji: "🚇", label: "Métro", color: "#f59e0b", badgeCls: "bg-amber-500/20 text-amber-300 border-amber-500/30", priority: 1 };
      }
      if (m.includes("rer") || /^RER\s*[A-E]$/.test(l) || ["A", "B", "C", "D", "E"].includes(l)) {
        return { emoji: "🚆", label: "RER", color: "#818cf8", badgeCls: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30", priority: 1 };
      }
      if (m.includes("rail") || m.includes("train") || m.includes("transilien") || ["H", "J", "K", "L", "N", "P", "R", "U", "V"].includes(l)) {
        return { emoji: "🚆", label: "Train", color: "#a855f7", badgeCls: "bg-purple-500/20 text-purple-300 border-purple-500/30", priority: 1 };
      }
      if (m.includes("tram") || /^T\d+/i.test(l)) {
        return { emoji: "🚊", label: "Tram", color: "#34d399", badgeCls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", priority: 2 };
      }
      return { emoji: "🚏", label: "Bus", color: "#38bdf8", badgeCls: "bg-sky-500/20 text-sky-300 border-sky-500/30", priority: 3 };
    }

    try {
      // Source 1 : API Officielle Île-de-France Mobilités (arrets-lignes) avec le vrai champ 'pointgeo' et l'unité '450m'
      const where = encodeURIComponent("within_distance(pointgeo, geom'POINT(" + lon + " " + lat + ")', 450m)");
      const idfmUrl = "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/arrets-lignes/records?where=" + where + "&limit=60";

      let groupedStops = new Map();

      try {
        const data = await fetchJsonSafe(idfmUrl, 3800, signal);
        const rows = (data && data.results) ? data.results : [];

        rows.forEach(r => {
          const stopName = (r.stop_name || r.nom_arret || "").trim();
          if (!stopName) return;
          const lineShort = (r.shortname || r.route_long_name || "").trim();
          const modeInfo = classifyMode(r.mode, lineShort);
          const key = modeInfo.label + "_" + stopName.toLowerCase();

          if (!groupedStops.has(key)) {
            groupedStops.set(key, {
              name: stopName,
              modeInfo: modeInfo,
              lines: new Set(),
              coords: r.pointgeo || [r.stop_lat, r.stop_lon],
              operator: r.operatorname || "IDFM"
            });
          }
          if (lineShort) groupedStops.get(key).lines.add(lineShort);
        });
      } catch (_) {
        // Fallback automatique Source 2 : Overpass API OpenStreetMap si IDFM ne répond pas
        const overpassQuery = '[out:json][timeout:3];(node["highway"="bus_stop"](around:380,' + lat + ',' + lon + ');node["railway"~"station|subway_entrance|tram_stop"](around:500,' + lat + ',' + lon + '););out body 25;';
        const osmUrl = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(overpassQuery);
        const osmData = await fetchJsonSafe(osmUrl, 3800, signal);
        const elements = (osmData && osmData.elements) ? osmData.elements : [];

        elements.forEach(el => {
          const tags = el.tags || {};
          const stopName = tags.name || "";
          if (!stopName) return;
          const rawMode = tags.station || tags.railway || tags.highway || "bus";
          const lineRef = tags.route_ref || tags.ref || tags.line || "";
          const modeInfo = classifyMode(rawMode, lineRef);
          const key = modeInfo.label + "_" + stopName.toLowerCase();

          if (!groupedStops.has(key)) {
            groupedStops.set(key, {
              name: stopName,
              modeInfo: modeInfo,
              lines: new Set(),
              coords: { lat: el.lat, lon: el.lon },
              operator: tags.operator || "RATP / SNCF"
            });
          }
          if (lineRef) {
            lineRef.split(/[;,]/).forEach(l => { if (l.trim()) groupedStops.get(key).lines.add(l.trim()); });
          }
        });
      }

      const stopsList = Array.from(groupedStops.values());

      if (stopsList.length === 0) {
        elTrans.innerHTML =
          '<div class="flex items-center justify-between">' +
            '<span class="text-xs font-semibold text-white">🚇 Transports & Bus (450m)</span>' +
            '<span class="text-[10px] font-mono text-slate-400">Aucun arrêt < 450m</span>' +
          '</div>';
        return;
      }

      // Trier : Métro / RER / Train d'abord, puis Tram, puis Bus (et par nombre de lignes)
      stopsList.sort((a, b) => {
        if (a.modeInfo.priority !== b.modeInfo.priority) return a.modeInfo.priority - b.modeInfo.priority;
        return b.lines.size - a.lines.size;
      });

      const topStops = stopsList.slice(0, 6);

      topStops.forEach(st => {
        const linesStr = Array.from(st.lines).slice(0, 6).join(", ");
        const subText = st.modeInfo.label + (linesStr ? " • Ligne(s) : " + linesStr : "") + " (" + st.operator + ")";
        addMapPin(st.coords, st.modeInfo.emoji, st.modeInfo.color, st.name, subText);
      });

      const rowsHtml = topStops.map(st => {
        const linesArr = Array.from(st.lines).slice(0, 5);
        const linesBadge = linesArr.length > 0
          ? st.modeInfo.label + " " + linesArr.join(" • ")
          : st.modeInfo.label;

        return '<div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">' +
          '<div class="truncate pr-2">' +
            '<span class="text-white font-medium">' + st.modeInfo.emoji + ' ' + st.name + '</span>' +
          '</div>' +
          '<span class="font-mono text-[10px] shrink-0 px-1.5 py-0.5 rounded border ' + st.modeInfo.badgeCls + '">' + linesBadge + '</span>' +
        '</div>';
      }).join("");

      elTrans.innerHTML =
        '<div class="flex items-center justify-between mb-2">' +
          '<span class="text-xs font-semibold text-white">🚇 Métro, RER, Train & Bus (450m)</span>' +
          '<span class="text-[10px] font-mono text-amber-300">' + stopsList.length + ' arrêt(s)</span>' +
        '</div>' +
        '<div class="space-y-1.5">' + rowsHtml + '</div>';
    } catch (e) {
      if (signal.aborted) return;
      elTrans.innerHTML =
        '<div class="flex items-center justify-between">' +
          '<span class="text-xs font-semibold text-white">🚇 Transports en commun</span>' +
          '<span class="text-[10px] font-mono text-slate-400">Données IDFM momentanément indisponibles</span>' +
        '</div>';
    }
  }

  // 9. ÉCOLES (MATERNELLE, PRIMAIRE, COLLÈGE, LYCÉE - PUBLICS & PRIVÉS)
  async function loadEcolesAll(lat, lon, signal) {
    const elEcoles = document.getElementById("slot-lot1-ecoles");
    if (!elEcoles) return;
    elEcoles.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🎓 Écoles, Collèges & Lycées (950m)...</div>';
    try {
      const where = encodeURIComponent("within_distance(position, geom'POINT(" + lon + " " + lat + ")', 950m) AND (type_etablissement=\"École maternelle\" OR type_etablissement=\"École élémentaire\" OR type_etablissement=\"École primaire\" OR type_etablissement=\"Collège\" OR type_etablissement=\"Lycée\")");
      const data = await fetchJsonSafe("https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records?where=" + where + "&limit=6", 4000, signal);
      const schools = (data && data.results) ? data.results : [];
      if (schools.length > 0) {
        const uais = schools.map(s => '"' + s.identifiant_de_l_etablissement + '"').join(",");
        let ipsMap = {};
        try {
          const ipsData = await fetchJsonSafe("https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-ips-colleges-ap2022/records?where=" + encodeURIComponent("uai IN (" + uais + ")") + "&order_by=rentree_scolaire%20DESC&limit=10", 3000, signal);
          (ipsData.results || []).forEach(r => { if (r.uai && !ipsMap[r.uai]) ipsMap[r.uai] = Math.round(Number(r.ips)); });
        } catch (_) {}

        const schoolsHtml = schools.map(s => {
          const ips = ipsMap[s.identifiant_de_l_etablissement];
          const statut = s.statut_public_prive || "Public";
          const typeEtab = s.type_etablissement || "École";
          const emoji = /collège|lycée/i.test(typeEtab) ? "🎓" : "🏫";
          addMapPin(s.position || [s.longitude, s.latitude], emoji, statut === "Privé" ? "#ec4899" : "#f59e0b", s.nom_etablissement, typeEtab + " • " + statut + (ips ? " • IPS : " + ips : ""));
          return '<div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">' +
            '<span class="text-white truncate pr-2">' + emoji + ' ' + s.nom_etablissement + '</span>' +
            '<span class="font-mono text-[10px] shrink-0 px-2 py-0.5 rounded ' + (statut === "Privé" ? 'bg-pink-500/15 text-pink-300' : 'bg-amber-500/15 text-amber-300') + '">' + (ips ? "IPS " + ips : typeEtab) + '</span>' +
          '</div>';
        }).join("");

        elEcoles.innerHTML =
          '<div class="flex items-center justify-between mb-2">' +
            '<span class="text-xs font-semibold text-white">🎓 Écoles, Collèges & Lycées (950m)</span>' +
            '<span class="text-[10px] font-mono text-slate-400">Public & Privé</span>' +
          '</div>' +
          '<div class="space-y-1.5">' + schoolsHtml + '</div>';
      } else {
        elEcoles.innerHTML = '<div class="text-xs text-slate-400">🎓 Aucun établissement scolaire à moins de 950 m.</div>';
      }
    } catch (_) {}
  }

  // 10. ÎLOTS DE FRAÎCHEUR & CHANTIERS
  async function loadEnvExtras(lat, lon, isParis) {
    const elFraicheur = document.getElementById("slot-lot2-fraicheur");
    const elChantiers = document.getElementById("slot-lot1-chantiers");
    if (isParis) {
      if (elFraicheur) {
        try {
          const where = encodeURIComponent("within_distance(geo_point_2d, geom'POINT(" + lon + " " + lat + ")', 350m)");
          const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/ilots-de-fraicheur-espaces-verts-frais/records?where=" + where + "&limit=5", 4000);
          const rows = (data && data.results) ? data.results : [];
          rows.forEach(r => {
            addMapPin(r.geo_point_2d, "🌳", "#34d399", r.nom || "Îlot de fraîcheur", r.type || "Espace vert frais");
          });
          elFraicheur.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🌳 Îlots de Fraîcheur (350m)</span><span class="text-[10px] font-mono ' + (rows.length > 0 ? 'text-emerald-400' : 'text-amber-300') + '">' + (rows.length > 0 ? rows.length + " espace(s) frais" : "Zone minérale dense") + '</span></div>';
        } catch (_) {}
      }
      if (elChantiers) {
        try {
          const where = encodeURIComponent("within_distance(geo_point_2d, geom'POINT(" + lon + " " + lat + ")', 250m)");
          const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/chantiers-perturbants/records?where=" + where + "&limit=4", 4000);
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

    const sigKey = lat.toFixed(5) + "_" + lon.toFixed(5) + "_" + parcelText;
    if (sigKey === lastRunSignature) return;
    lastRunSignature = sigKey;

    if (currentAbort) currentAbort.abort();
    currentAbort = new AbortController();
    const sig = currentAbort.signal;

    const layer = getPoiLayer();
    if (layer) layer.clearLayers();
    pinCounter = 0;

    const subtitle = subtitleEl ? subtitleEl.textContent : "";
    const isParis = subtitle.includes("750") || parcelText.startsWith("Parcelle 75");

    Promise.allSettled([
      loadRPLS(lat, lon, isParis, sig),
      loadCommercesRDC(lat, lon, sig),
      loadGeorisques(lat, lon, sig),
      loadUrbanisme(lat, lon, isParis, sig),
      loadAntennes(lat, lon, sig),
      loadChaleurUrbaine(lat, lon, sig),
      loadTransportsAll(lat, lon, sig),
      loadVelibLive(lat, lon, sig),
      loadEcolesAll(lat, lon, sig),
      loadEnvExtras(lat, lon, isParis)
    ]).then(() => {
      if (!sig.aborted) {
        console.log("%c📍 [PERRON] " + pinCounter + " punaises affichées sur la carte", "color:#fbbf24;font-weight:bold;");
      }
    });
  }

  setInterval(checkAndRun, 600);
  setTimeout(checkAndRun, 250);
})();
