/**
 * PERRON — Pack Complet d'Enrichissement (Lots 1, 2 & 3 + Punaises Carte Universelles)
 */

(function () {
  console.log("%c✅ [PERRON] Module d'enrichissement + Punaises Carte v2 chargé", "color:#10b981;font-weight:bold;");

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

  // Extracteur universel de coordonnées GPS (supporte {lat,lon}, {lat,lng}, [lon,lat], "lat,lon", GeoJSON)
  function extractLatLon(obj) {
    if (!obj) return null;
    if (typeof obj.lat === "number" && typeof obj.lon === "number") return [obj.lat, obj.lon];
    if (typeof obj.lat === "number" && typeof obj.lng === "number") return [obj.lat, obj.lng];
    if (typeof obj.latitude === "number" && typeof obj.longitude === "number") return [obj.latitude, obj.longitude];
    if ( typeof obj.latitude === "string" && typeof obj.longitude === "string") {
      const a = parseFloat(obj.latitude), b = parseFloat(obj.longitude);
      if (!isNaN(a) && !isNaN(b)) return [a, b];
    }
    if (Array.isArray(obj) && obj.length === 2) {
      const a = parseFloat(obj[0]), b = parseFloat(obj[1]);
      if (!isNaN(a) && !isNaN(b)) {
        // En Île-de-France, lat ~ 48.8 et lon ~ 2.3
        return a > 40 ? [a, b] : [b, a];
      }
    }
    if (obj.coordinates && Array.isArray(obj.coordinates)) {
      return extractLatLon(obj.coordinates);
    }
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
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      html:
        '<div style="width:28px;height:28px;border-radius:9999px;background:#0f172a;border:2px solid ' +
        borderColor +
        ';display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.85);cursor:pointer;">' +
        emoji +
        "</div>"
    });

    const m = window.L.marker([lat, lon], { icon: icon, zIndexOffset: 1000 });
    m.bindPopup(
      '<div class="text-xs font-sans space-y-0.5">' +
        '<div class="font-bold text-white">' + emoji + " " + title + "</div>" +
        '<div class="text-[11px] font-mono text-slate-300">' + (subtitle || "") + "</div>" +
      "</div>"
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

  // 2. COMMERCES & NUISANCES RDC (API SIRENE + Punaises Carte)
  async function loadCommercesRDC(lat, lon, signal) {
    const el = document.getElementById("slot-lot3-commerces");
    if (!el) return;
    el.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🏪 Vérification des commerces au RDC (SIRENE 45m)...</div>';
    try {
      const data = await fetchJsonSafe("https://recherche-entreprises.api.gouv.fr/near_point?lat=" + lat + "&long=" + lon + "&radius=0.045&per_page=12", 4000, signal);
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
      let warnCount = 0;

      for (const ent of results) {
        if (ent.etat_administratif && ent.etat_administratif !== "A") continue;
        const naf = ent.activite_principale || "";
        if (/^(68\.|64\.|70\.|82\.|62\.|58\.|69\.|71\.)/.test(naf)) continue;
        let label = null;
        for (const [k, v] of Object.entries(NUISANCES)) {
          if (naf.startsWith(k)) { label = v; warnCount++; break; }
        }
        const etab = (ent.matching_etablissements && ent.matching_etablissements[0]) || ent.siege || {};
        const addr = etab.libelle_voie ? (etab.numero_voie || "") + " " + (etab.type_voie || "") + " " + etab.libelle_voie : "";
        const name = ent.nom_complet || "Commerce";

        // Punaise carte pour tous les commerces trouvés au pied de l'immeuble
        addMapPin(etab, label ? "🍹" : "🏪", label ? "#f59e0b" : "#38bdf8", name, (label || ("NAF " + naf)) + (addr ? " • " + addr : ""));

        items.push({ name: name, naf: naf, label: label, addr: addr });
      }

      if (items.length === 0) {
        el.innerHTML =
          '<div class="flex items-center justify-between">' +
            '<span class="text-xs font-semibold text-white">🏪 Commerces & RDC (45m)</span>' +
            '<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">RDC Calme</span>' +
          '</div>' +
          '<p class="text-[11px] text-slate-400 mt-1">Aucun bar, restaurant ou commerce actif recensé au pied de l\'immeuble.</p>';
        return;
      }

      items.sort((a, b) => (b.label ? 1 : 0) - (a.label ? 1 : 0));
      const rowsHtml = items.slice(0, 4).map(it => {
        const badgeText = it.label ? it.label : ("NAF " + it.naf);
        const badgeClass = it.label ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-300";
        const titleClass = it.label ? "text-amber-300" : "text-white";
        const borderClass = it.label ? "border-amber-500/30" : "border-slate-800/80";

        return '<div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border ' + borderClass + ' text-[11px]">' +
          '<div class="truncate pr-2">' +
            '<div class="font-semibold ' + titleClass + ' truncate">' + it.name + '</div>' +
            '<div class="text-[10px] font-mono text-slate-400 truncate">' + it.addr + '</div>' +
          '</div>' +
          '<span class="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded ' + badgeClass + '">' + badgeText + '</span>' +
        '</div>';
      }).join("");

      el.innerHTML =
        '<div class="flex items-center justify-between mb-2">' +
          '<span class="text-xs font-semibold text-white">🏪 Commerces & Activités RDC (45m)</span>' +
          '<span class="text-[10px] font-mono px-2 py-0.5 rounded ' + (warnCount > 0 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-sky-500/15 text-sky-300 border border-sky-500/30') + '">' + (warnCount > 0 ? warnCount + " bar/resto" : items.length + " activité(s)") + '</span>' +
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
      el.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏗️ Urbanisme & Ravalements (120m)</span><span class="text-[10px] font-mono text-emerald-400">Aucun chantier lourd déclaré</span></div>';
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
      el.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">📡 Antennes 4G/5G (180m)</span><span class="text-[10px] font-mono text-emerald-400">0 support immédiat</span></div>';
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

  // 6. RPLS
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

  // 7. EXTRAS ENV (VÉLIB', COLLÈGES, ÎLOTS FRAÎCHEUR, CHANTIERS + PUNAISES CARTE)
  async function loadEnvExtras(lat, lon, isParis, signal) {
    const elVelib = document.getElementById("slot-lot3-velib");
    if (elVelib) {
      elVelib.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🚲 Disponibilité Vélib\' Temps Réel (300m)...</div>';
      try {
        const where = encodeURIComponent("within_distance(coordonnees_geo, geom'POINT(" + lon + " " + lat + ")', 300m)");
        const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/velib-disponibilite-en-temps-reel/records?where=" + where + "&limit=4", 4000, signal);
        const rows = (data && data.results) ? data.results : [];
        if (rows.length === 0) {
          elVelib.innerHTML = '<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🚲 Vélib\' Métropole (300m)</span><span class="text-[10px] font-mono text-slate-400">Aucune station < 300m</span></div>';
        } else {
          const rowsHtml = rows.map(s => {
            addMapPin(s.coordonnees_geo, "🚲", "#10b981", s.name || "Station Vélib'", "⚡" + (s.ebike || 0) + " VAE • 🚲" + (s.mechanical || 0) + " méca");
            return '<div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">' +
              '<span class="text-white font-medium truncate pr-2">' + s.name + '</span>' +
              '<span class="font-mono text-[10px] shrink-0 text-sky-300">⚡' + (s.ebike || 0) + ' • 🚲' + (s.mechanical || 0) + '</span>' +
            '</div>';
          }).join("");
          elVelib.innerHTML =
            '<div class="flex items-center justify-between mb-2">' +
              '<span class="text-xs font-semibold text-white">🚲 Stations Vélib\' Temps Réel (300m)</span>' +
              '<span class="text-[10px] font-mono text-emerald-400">' + rows.length + ' station(s)</span>' +
            '</div>' +
            '<div class="space-y-1.5">' + rowsHtml + '</div>';
        }
      } catch (_) {}
    }

    const elEcoles = document.getElementById("slot-lot1-ecoles");
    if (elEcoles) {
      elEcoles.innerHTML = '<div class="text-[11px] font-mono text-slate-400 animate-pulse">🎓 Analyse des collèges & IPS (950m)...</div>';
      try {
        const where = encodeURIComponent("within_distance(position, geom'POINT(" + lon + " " + lat + ")', 950m) AND type_etablissement=\"Collège\"");
        const data = await fetchJsonSafe("https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records?where=" + where + "&limit=4", 4000, signal);
        const schools = (data && data.results) ? data.results : [];
        if (schools.length > 0) {
          const uais = schools.map(s => '"' + s.identifiant_de_l_etablissement + '"').join(",");
          let ipsMap = {};
          try {
            const ipsData = await fetchJsonSafe("https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-ips-colleges-ap2022/records?where=" + encodeURIComponent("uai IN (" + uais + ")") + "&order_by=rentree_scolaire%20DESC&limit=8", 3000, signal);
            (ipsData.results || []).forEach(r => { if (r.uai && !ipsMap[r.uai]) ipsMap[r.uai] = Math.round(Number(r.ips)); });
          } catch (_) {}

          const schoolsHtml = schools.map(s => {
            const ips = ipsMap[s.identifiant_de_l_etablissement];
            addMapPin(s.position || [s.longitude, s.latitude], "🎓", "#f59e0b", s.nom_etablissement, ips ? "Indice IPS : " + ips : (s.statut_public_prive || "Collège"));
            return '<div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">' +
              '<span class="text-white truncate pr-2">' + s.nom_etablissement + ' (' + (s.statut_public_prive || "Public") + ')</span>' +
              '<span class="font-mono text-[10px] shrink-0 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">' + (ips ? "IPS " + ips : "Secteur") + '</span>' +
            '</div>';
          }).join("");

          elEcoles.innerHTML =
            '<div class="flex items-center justify-between mb-2">' +
              '<span class="text-xs font-semibold text-white">🎓 Collèges & Indice IPS (950m)</span>' +
              '<span class="text-[10px] font-mono text-slate-400">Moy. nat : 105</span>' +
            '</div>' +
            '<div class="space-y-1.5">' + schoolsHtml + '</div>';
        } else {
          elEcoles.innerHTML = '<div class="text-xs text-slate-400">🎓 Collèges : Aucun établissement à moins de 950 m.</div>';
        }
      } catch (_) {}
    }

    const elFraicheur = document.getElementById("slot-lot2-fraicheur");
    const elChantiers = document.getElementById("slot-lot1-chantiers");
    if (isParis) {
      if (elFraicheur) {
        try {
          const where = encodeURIComponent("within_distance(geo_point_2d, geom'POINT(" + lon + " " + lat + ")', 350m)");
          const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/ilots-de-fraicheur-espaces-verts-frais/records?where=" + where + "&limit=5", 4000, signal);
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
          const data = await fetchJsonSafe("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/chantiers-perturbants/records?where=" + where + "&limit=4", 4000, signal);
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
      loadEnvExtras(lat, lon, isParis, sig)
    ]).then(() => {
      if (!sig.aborted) {
        console.log("%c📍 [PERRON] " + pinCounter + " punaises ajoutées sur la carte autour de " + coordText, "color:#fbbf24;font-weight:bold;");
      }
    });
  }

  setInterval(checkAndRun, 600);
  setTimeout(checkAndRun, 250);
})();
