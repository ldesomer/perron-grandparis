/**
 * PERRON — Pack Complet d'Enrichissement (Lots 1, 2 & 3 réunis)
 * - Lot 1 : Géorisques (Sous-sol/Carrières), Urbanisme (Permis), France Chaleur Urbaine, Collèges (IPS), Chantiers
 * - Lot 2 : Antennes 4G/5G (ANFR), Îlots de Fraîcheur (Confort d'été)
 * - Lot 3 : Commerces & Nuisances RDC (SIRENE), Logements Sociaux (RPLS), Vélib' Temps Réel
 */

(function () {
  console.log("%c✅ [PERRON] Module d'enrichissement Lots 1-2-3 chargé avec succès", "color:#10b981;font-weight:bold;");

  let lastCoordKey = "";
  let currentAbort = null;

  async function fetchJsonSafe(url, timeoutMs = 3500, parentSignal = null) {
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
    const tabMarket = document.getElementById("tab-market");
    const tabBuilding = document.getElementById("tab-building");
    const tabDpe = document.getElementById("tab-dpe");
    const tabEnv = document.getElementById("tab-env");

    if (tabMarket && !document.getElementById("slot-lot3-rpls")) {
      const box = document.createElement("div");
      box.id = "slot-lot3-rpls";
      box.className = "p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 mt-3";
      tabMarket.appendChild(box);
    }

    if (tabBuilding && !document.getElementById("slot-lot1-georisques")) {
      const wrap = document.createElement("div");
      wrap.className = "space-y-3 mt-3";
      wrap.innerHTML = `
        <div id="slot-lot3-commerces" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>
        <div id="slot-lot1-georisques" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>
        <div id="slot-lot1-urbanisme" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>
        <div id="slot-lot2-antennes" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>
      `;
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
      wrap.innerHTML = `
        <div id="slot-lot3-velib" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>
        <div id="slot-lot1-ecoles" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>
        <div id="slot-lot2-fraicheur" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>
        <div id="slot-lot1-chantiers" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>
      `;
      tabEnv.appendChild(wrap);
    }
  }

  // 1. GÉORISQUES (Sous-sol, Carrières, Inondation, Argiles)
  async function loadGeorisques(lat, lon, signal) {
    const el = document.getElementById("slot-lot1-georisques");
    if (!el) return;
    el.innerHTML = `<div class="text-[11px] font-mono text-slate-400 animate-pulse">🛡️ Analyse du sous-sol (API Géorisques)...</div>`;
    try {
      const data = await fetchJsonSafe(`https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${lon},${lat}&rayon=100`, 3500, signal);
      const risques = (data && data.data) ? data.data.flatMap(d => d.risques_detail || []) : [];
      const unique = [...new Set(risques.map(r => r.libelle_risque_long || r.libelle_risque).filter(Boolean))];

      const badges = unique.length > 0
        ? unique.slice(0, 6).map(r => {
            const warn = /inondation|mouvement|carrière|argile|tassement/i.test(r);
            return `<span class="text-[10px] font-mono px-2 py-0.5 rounded border ${warn ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}">${r}</span>`;
          }).join("")
        : `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Aucun risque particulier identifié</span>`;

      el.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-white">🛡️ Sous-sol & Risques Naturels</span>
          <span class="text-[10px] font-mono text-slate-400">BRGM / Géorisques</span>
        </div>
        <div class="flex flex-wrap gap-1.5">${badges}</div>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `<div class="text-xs text-slate-400">🛡️ Sous-sol & Risques : Aucun arrêté spécifique détecté.</div>`;
    }
  }

  // 2. COMMERCES & NUISANCES RDC (API SIRENE)
  async function loadCommercesRDC(lat, lon, signal) {
    const el = document.getElementById("slot-lot3-commerces");
    if (!el) return;
    el.innerHTML = `<div class="text-[11px] font-mono text-slate-400 animate-pulse">🏪 Vérification des commerces au RDC (SIRENE 45m)...</div>`;
    try {
      const data = await fetchJsonSafe(`https://recherche-entreprises.api.gouv.fr/near_point?lat=${lat}&long=${lon}&radius=0.045&per_page=12`, 3500, signal);
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
        if (/^(68\.|64\.|70\.|82\.|62\.|58\.|69\.|71\.)/.test(naf)) continue; // Ignore bureaux/SCI
        let label = null;
        for (const [k, v] of Object.entries(NUISANCES)) {
          if (naf.startsWith(k)) { label = v; warnCount++; break; }
        }
        const etab = (ent.matching_etablissements && ent.matching_etablissements[0]) || ent.siege || {};
        const addr = etab.libelle_voie ? `${etab.numero_voie || ""} ${etab.type_voie || ""} ${etab.libelle_voie}`.trim() : "";
        items.push({ name: ent.nom_complet || "Commerce", naf, label, addr });
      }

      if (items.length === 0) {
        el.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-white">🏪 Commerces & RDC (45m)</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">RDC Calme</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Aucun bar, restaurant ou commerce actif recensé au pied de l'immeuble.</p>
        `;
        return;
      }

      items.sort((a, b) => (b.label ? 1 : 0) - (a.label ? 1 : 0));
      const rowsHtml = items.slice(0, 4).map(it => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border ${it.label ? 'border-amber-500/30' : 'border-slate-800/80'} text-[11px]">
          <div class="truncate pr-2">
            <div class="font-semibold ${it.label ? 'text-amber-300' : 'text-white'} truncate">${it.name}</div>
            <div class="text-[10px] font-mono text-slate-400 truncate">${it.addr}</div>
          </div>
          <span class="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded ${it.label ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'}">${it.label || ("NAF " + it.naf)}</span>
        </div>
      `).join("");

      el.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-white">🏪 Commerces & Activités RDC (45m)</span>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded ${warnCount > 0 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'}">${warnCount > 0 ? warnCount + " bar/resto" : items.length + " activité(s)"}</span>
        </div>
        <div class="space-y-1.5">${rowsHtml}</div>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `<div class="text-xs text-slate-400">🏪 Commerces RDC : Données SIRENE indisponibles.</div>`;
    }
  }

  // 3. PERMIS & TRAVAUX D'URBANISME (Paris 120m)
  async function loadUrbanisme(lat, lon, isParis, signal) {
    const el = document.getElementById("slot-lot1-urbanisme");
    if (!el) return;
    if (!isParis) {
      el.innerHTML = `<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏗️ Urbanisme & Ravalements</span><span class="text-[10px] font-mono text-slate-500">Périmètre Paris (75)</span></div>`;
      return;
    }
    try {
      const where = encodeURIComponent(`within_distance(geo_point_2d, geom'POINT(${lon} ${lat})', 120m)`);
      const data = await fetchJsonSafe(`https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/autorisations-d-urbanisme-hors-permis-de-demolir/records?where=${where}&order_by=date_depot%20DESC&limit=3`, 3500, signal);
      const rows = (data && data.results) ? data.results : [];
      if (rows.length === 0) {
        el.innerHTML = `<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏗️ Urbanisme & Ravalements (120m)</span><span class="text-[10px] font-mono text-emerald-400">Aucun dossier récent</span></div>`;
        return;
      }
      el.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-white">🏗️ Urbanisme & Ravalements (120m)</span>
          <span class="text-[10px] font-mono text-amber-300">${rows.length} dossier(s)</span>
        </div>
        <div class="space-y-1.5">
          ${rows.map(r => `
            <div class="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">
              <div class="flex justify-between font-mono text-[10px] text-amber-300">
                <span>${r.type_dossier || "Déclaration"} • ${r.numero_voirie \vert{}\vert{} ""} ${r.nom_voirie || ""}</span>
                <span class="text-slate-400">${(r.date_depot || "").slice(0, 10)}</span>
              </div>
              <div class="text-[10px] text-slate-300 mt-0.5">${(r.nature_travaux || r.description_travaux || "Travaux sur bâti existant").slice(0, 80)}</div>
            </div>
          `).join("")}
        </div>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `<div class="text-xs text-slate-400">🏗️ Urbanisme : Aucun dossier détecté.</div>`;
    }
  }

  // 4. ANTENNES 4G/5G ANFR (180m)
  async function loadAntennes(lat, lon, signal) {
    const el = document.getElementById("slot-lot2-antennes");
    if (!el) return;
    try {
      const where = encodeURIComponent(`within_distance(coordonnees, geom'POINT(${lon} ${lat})', 180m)`);
      const data = await fetchJsonSafe(`https://data.opendatasoft.com/api/explore/v2.1/catalog/datasets/onde-anfr-supports-antennes@public/records?where=${where}&limit=8`, 3500, signal);
      const rows = (data && data.results) ? data.results : [];
      if (rows.length === 0) {
        el.innerHTML = `<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">📡 Antennes 4G/5G (180m)</span><span class="text-[10px] font-mono text-emerald-400">Aucune à proximité</span></div>`;
        return;
      }
      const ops = [...new Set(rows.map(r => r.nom_op || r.operateur).filter(Boolean))];
      el.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold text-white">📡 Antennes-Relais 4G/5G (180m)</span>
          <span class="text-[10px] font-mono text-sky-300">${rows.length} support(s) ANFR</span>
        </div>
        <p class="text-[11px] text-slate-300">Opérateurs détectés : <strong>${ops.slice(0, 4).join(", ") || "Multi-opérateurs"}</strong></p>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `<div class="text-xs text-slate-400">📡 Antennes ANFR : Non disponible.</div>`;
    }
  }

  // 5. FRANCE CHALEUR URBAINE (Onglet 3. DPE)
  async function loadChaleurUrbaine(lat, lon, signal) {
    const el = document.getElementById("slot-lot1-fcu");
    if (!el) return;
    try {
      const data = await fetchJsonSafe(`https://france-chaleur-urbaine.beta.gouv.fr/api/v1/eligibility?lat=${lat}&lon=${lon}`, 3500, signal);
      const dist = (data && typeof data.distance === "number") ? Math.round(data.distance) : null;
      const ok = Boolean(data && (data.isEligible || (dist !== null && dist <= 150)));
      el.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold text-white">🔥 Réseau de Chaleur Urbain</span>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded ${ok ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'}">${dist !== null ? "À " + dist + " m" : (ok ? "Proche" : "Hors réseau")}</span>
        </div>
        <p class="text-[11px] text-slate-300">${ok ? "Immeuble raccordable au réseau de chauffage urbain (CPCU / Géothermie)." : "Aucun réseau de chaleur détecté sous la voirie immédiate."}</p>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `<div class="text-xs text-slate-400">🔥 Réseau de chaleur : Vérification indisponible.</div>`;
    }
  }

  // 6. PARC LOCATIF SOCIAL (Onglet 1. Marché)
  async function loadRPLS(lat, lon, isParis, signal) {
    const el = document.getElementById("slot-lot3-rpls");
    if (!el) return;
    if (!isParis) {
      el.innerHTML = `<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏢 Parc Locatif Social (RPLS)</span><span class="text-[10px] font-mono text-slate-400">Détail bailleurs sur Paris (75)</span></div>`;
      return;
    }
    try {
      const where = encodeURIComponent(`within_distance(geo_point_2d, geom'POINT(${lon} ${lat})', 75m)`);
      const data = await fetchJsonSafe(`https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logements-sociaux-finances-a-paris/records?where=${where}&limit=3`, 3500, signal);
      const rows = (data && data.results) ? data.results : [];
      if (rows.length === 0) {
        el.innerHTML = `<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🏢 Parc Social (75m)</span><span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">100% Parc Privé</span></div>`;
        return;
      }
      el.innerHTML = `
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-semibold text-white">🏢 Programmes Sociaux (75m)</span>
          <span class="text-[10px] font-mono text-indigo-300">${rows.length} programme(s)</span>
        </div>
        <div class="space-y-1">
          ${rows.map(r => `<div class="text-[11px] text-slate-300 flex justify-between"><span>${r.bs_nom || "Bailleur social"}</span><span class="font-mono text-indigo-300">${r.nb_total_logements_finances || "—"} logts</span></div>`).join("")}
        </div>
      `;
    } catch (e) {
      if (signal.aborted) return;
    }
  }

  // 7. VÉLIB', COLLÈGES IPS, ÎLOTS DE FRAÎCHEUR & CHANTIERS (Onglet 4. Rue)
  async function loadEnvExtras(lat, lon, isParis, signal) {
    // Vélib'
    const elVelib = document.getElementById("slot-lot3-velib");
    if (elVelib) {
      try {
        const where = encodeURIComponent(`within_distance(coordonnees_geo, geom'POINT(${lon} ${lat})', 250m)`);
        const data = await fetchJsonSafe(`https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/velib-disponibilite-en-temps-reel/records?where=${where}&limit=3`, 3500, signal);
        const rows = (data && data.results) ? data.results : [];
        elVelib.innerHTML = rows.length === 0
          ? `<div class="flex items-center justify-between"><span class="text-xs font-semibold text-white">🚲 Vélib' Métropole (250m)</span><span class="text-[10px] font-mono text-slate-400">Aucune station < 250m</span></div>`
          : `
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-white">🚲 Stations Vélib' Temps Réel (250m)</span>
              <span class="text-[10px] font-mono text-emerald-400">${rows.length} station(s)</span>
            </div>
            <div class="space-y-1.5">
              ${rows.map(s => `
                <div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">
                  <span class="text-white font-medium truncate pr-2">${s.name}</span>
                  <span class="font-mono text-[10px] shrink-0 text-sky-300">⚡${s.ebike \vert{}\vert{} 0} • 🚲${s.mechanical || 0}</span>
                </div>
              `).join("")}
            </div>
          `;
      } catch (_) {}
    }

    // Collèges & IPS
    const elEcoles = document.getElementById("slot-lot1-ecoles");
    if (elEcoles) {
      try {
        const where = encodeURIComponent(`within_distance(position, geom'POINT(${lon} ${lat})', 950m) AND type_etablissement="Collège"`);
        const data = await fetchJsonSafe(`https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records?where=${where}&limit=3`, 3500, signal);
        const schools = (data && data.results) ? data.results : [];
        if (schools.length > 0) {
          const uais = schools.map(s => `"${s.identifiant_de_l_etablissement}"`).join(",");
          let ipsMap = {};
          try {
            const ipsData = await fetchJsonSafe(`https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-ips-colleges-ap2022/records?where=${encodeURIComponent(`uai IN (${uais})`)}&order_by=rentree_scolaire%20DESC&limit=8`, 2800, signal);
            (ipsData.results || []).forEach(r => { if (r.uai && !ipsMap[r.uai]) ipsMap[r.uai] = Math.round(Number(r.ips)); });
          } catch (_) {}

          elEcoles.innerHTML = `
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-white">🎓 Collèges & Indice IPS (950m)</span>
              <span class="text-[10px] font-mono text-slate-400">Moy. nat : 105</span>
            </div>
            <div class="space-y-1.5">
              ${schools.map(s => {
                const ips = ipsMap[s.identifiant_de_l_etablissement];
                return `
                  <div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">
                    <span class="text-white truncate pr-2">${s.nom_etablissement} (${s.statut_public_prive || "Public"})</span>
                    <span class="font-mono text-[10px] shrink-0 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">${ips ? "IPS " + ips : "Secteur"}</span>
                  </div>
                `;
              }).join("")}
            </div>
          `;
        } else {
          elEcoles.innerHTML = `<div class="text-xs text-slate-400">🎓 Collèges : Aucun établissement à moins de 950 m.</div>`;
        }
      } catch (_) {}
    }

    // Îlots de fraîcheur & Chantiers (Paris)
    const elFraicheur = document.getElementById("slot-lot2-fraicheur");
    const elChantiers = document.getElementById("slot-lot1-chantiers");
    if (isParis) {
      if (elFraicheur) {
        try {
          const where = encodeURIComponent(`within_distance(geo_point_2d, geom'POINT(${lon} ${lat})', 300m)`);
          const data = await fetchJsonSafe(`https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/ilots-de-fraicheur-espaces-verts-frais/records?where=${where}&limit=3`, 3500, signal);
          const rows = (data && data.results) ? data.results : [];
          elFraicheur.innerHTML = `
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-white">🌳 Îlots de Fraîcheur (300m)</span>
              <span class="text-[10px] font-mono ${rows.length > 0 ? 'text-emerald-400' : 'text-amber-300'}">${rows.length > 0 ? rows.length + " espace(s) frais" : "Zone minérale dense"}</span>
            </div>
          `;
        } catch (_) {}
      }
      if (elChantiers) {
        try {
          const where = encodeURIComponent(`within_distance(geo_point_2d, geom'POINT(${lon} ${lat})', 200m)`);
          const data = await fetchJsonSafe(`https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/chantiers-perturbants/records?where=${where}&limit=3`, 3500, signal);
          const rows = (data && data.results) ? data.results : [];
          elChantiers.innerHTML = `
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-white">🚧 Chantiers Perturbants (200m)</span>
              <span class="text-[10px] font-mono ${rows.length === 0 ? 'text-emerald-400' : 'text-rose-400'}">${rows.length === 0 ? "0 chantier actif" : rows.length + " chantier(s) en cours"}</span>
            </div>
          `;
        } catch (_) {}
      }
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
    if (!coordText.includes(",") || parcelText.includes("Chargement")) return;

    const [latStr, lonStr] = coordText.split(",").map(s => s.trim());
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon)) return;

    const key = `${lat.toFixed(5)}_${lon.toFixed(5)}`;
    if (key === lastCoordKey) return;
    lastCoordKey = key;

    if (currentAbort) currentAbort.abort();
    currentAbort = new AbortController();
    const sig = currentAbort.signal;

    const subtitle = subtitleEl ? subtitleEl.textContent : "";
    const isParis = subtitle.includes("750") || parcelText.startsWith("Parcelle 75");

    loadRPLS(lat, lon, isParis, sig);
    loadCommercesRDC(lat, lon, sig);
    loadGeorisques(lat, lon, sig);
    loadUrbanisme(lat, lon, isParis, sig);
    loadAntennes(lat, lon, sig);
    loadChaleurUrbaine(lat, lon, sig);
    loadEnvExtras(lat, lon, isParis, sig);
  }

  // Surveillance continue toutes les 900ms : garantie à 100%
  setInterval(checkAndRun, 900);
  setTimeout(checkAndRun, 300);
})();
