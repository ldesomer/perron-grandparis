/**
 * PERRON — Plugin Isolé Lot 3 : Commerces RDC (SIRENE), Logements Sociaux (RPLS) & Mobilité Temps Réel (Vélib' Grand Paris)
 * 100% autonome, zéro modification du cœur applicatif.
 */

(function initPerronLot3Plugin() {
  let lastCoordKey = "";
  let abortCtrl = null;

  async function fetchJsonSafe(url, timeoutMs = 3400, parentSignal = null) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    if (parentSignal) {
      parentSignal.addEventListener("abort", () => ctrl.abort(), { once: true });
    }
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  // Crée les conteneurs dédiés dans les onglets 1 (Marché), 2 (Immeuble) et 4 (Rue)
  function ensureLot3Slots() {
    const tabMarket = document.getElementById("tab-market");
    const tabBuilding = document.getElementById("tab-building");
    const tabEnv = document.getElementById("tab-env");

    if (tabMarket && !document.getElementById("slot-lot3-rpls")) {
      const box = document.createElement("div");
      box.id = "slot-lot3-rpls";
      box.className = "p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 mt-3";
      tabMarket.appendChild(box);
    }

    if (tabBuilding && !document.getElementById("slot-lot3-commerces")) {
      const box = document.createElement("div");
      box.id = "slot-lot3-commerces";
      box.className = "p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 mt-3";
      tabBuilding.appendChild(box);
    }

    if (tabEnv && !document.getElementById("slot-lot3-velib")) {
      const box = document.createElement("div");
      box.id = "slot-lot3-velib";
      box.className = "p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 mt-3";
      tabEnv.appendChild(box);
    }
  }

  // 1. COMMERCES & ACTIVITÉS EN RDC (API Officielle Recherche d'Entreprises - Base SIRENE INSEE)
  // Couvre Paris (75) + Petite Couronne (92, 93, 94)
  async function loadCommercesRDC(lat, lon, signal) {
    const el = document.getElementById("slot-lot3-commerces");
    if (!el) return;
    el.innerHTML = `<div class="text-[11px] font-mono text-slate-400 animate-pulse">🏪 Analyse des activités & commerces en RDC (Base SIRENE 45m)...</div>`;

    try {
      // Rayon de 0.045 km (45 mètres) autour de la parcelle
      const url = `https://recherche-entreprises.api.gouv.fr/near_point?lat=${lat}&long=${lon}&radius=0.045&per_page=12`;
      const data = await fetchJsonSafe(url, 3500, signal);
      const results = (data && data.results) ? data.results : [];

      // Filtrer uniquement les établissements actifs et identifier les commerces à risque de nuisance (bruit/odeur)
      const activeItems = [];
      let nuisanceCount = 0;

      const NUISANCE_NAF_PREFIXES = {
        "56.10A": "Restauration traditionnelle",
        "56.10C": "Restauration rapide / Take-away",
        "56.30Z": "Bar / Débit de boissons",
        "10.71C": "Boulangerie-Pâtisserie",
        "47.11": "Supérette / Alimentation",
        "96.01B": "Pressing / Laverie",
        "93.29Z": "Loisirs / Vie nocturne"
      };

      for (const ent of results) {
        if (ent.etat_administratif && ent.etat_administratif !== "A") continue;
        const naf = ent.activite_principale || "";
        // Écarter les SCI et holdings purement administratives en étage (68.20B, 64.20Z, 70.10Z)
        if (/^(68\.20|64\.20|64\.30|70\.10|70\.22)/.test(naf)) continue;

        const name = ent.nom_complet || ent.nom_raison_sociale || "Établissement";
        let nuisanceLabel = null;

        for (const [prefix, label] of Object.entries(NUISANCE_NAF_PREFIXES)) {
          if (naf.startsWith(prefix)) {
            nuisanceLabel = label;
            nuisanceCount++;
            break;
          }
        }

        const etab = (ent.matching_etablissements && ent.matching_etablissements[0]) || ent.siege || {};
        const addr = etab.libelle_voie ? `${etab.numero_voie || ""} ${etab.type_voie || ""} ${etab.libelle_voie}`.trim() : "";

        activeItems.push({
          name,
          naf,
          nuisanceLabel,
          addr
        });
      }

      if (activeItems.length === 0) {
        el.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-white">🏪 Commerces & RDC (Rayon 45m)</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Immeuble calme (0 commerce)</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Aucun commerce de bouche, bar ou activité commerciale active détecté au pied de l'immeuble (Source : INSEE SIRENE).</p>
        `;
        return;
      }

      // Trier pour afficher les bars/restaurants en premier
      activeItems.sort((a, b) => (b.nuisanceLabel ? 1 : 0) - (a.nuisanceLabel ? 1 : 0));

      const statusBadge = nuisanceCount > 0
        ? `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">⚠️ ${nuisanceCount} bar/resto/bouche</span>`
        : `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">${activeItems.length} activité(s)</span>`;

      const listHtml = activeItems.slice(0, 4).map(item => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border ${item.nuisanceLabel ? 'border-amber-500/30' : 'border-slate-800/80'} text-[11px]">
          <div class="truncate pr-2">
            <div class="font-semibold ${item.nuisanceLabel ? 'text-amber-300' : 'text-white'} truncate">${item.name}</div>
            <div class="text-[10px] font-mono text-slate-400 truncate">${item.addr || "À proximité immédiate"}</div>
          </div>
          <span class="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded ${item.nuisanceLabel ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'}">
            ${item.nuisanceLabel || ("NAF " + item.naf)}
          </span>
        </div>
      `).join("");

      el.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-white">🏪 Commerces & Nuisances RDC (45m)</span>
          ${statusBadge}
        </div>
        <div class="space-y-1.5">${listHtml}</div>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white">🏪 Commerces & Activités RDC</span>
          <span class="text-[10px] font-mono text-slate-400">API SIRENE temporairement indisponible</span>
        </div>
      `;
    }
  }

  // 2. LOGEMENTS SOCIAUX & BAILLEURS A PROXIMITÉ (70m)
  async function loadLogementsSociaux(lat, lon, isParis, signal) {
    const el = document.getElementById("slot-lot3-rpls");
    if (!el) return;

    if (!isParis) {
      el.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white">🏢 Parc Locatif Social (RPLS)</span>
          <span class="text-[10px] font-mono text-slate-500">Détail bailleurs disponible sur Paris (75)</span>
        </div>
      `;
      return;
    }

    el.innerHTML = `<div class="text-[11px] font-mono text-slate-400 animate-pulse">🏢 Vérification du parc locatif social (70m)...</div>`;

    try {
      const where = encodeURIComponent(`within_distance(geo_point_2d, geom'POINT(${lon} ${lat})', 70m)`);
      const url = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/logements-sociaux-finances-a-paris/records?where=${where}&order_by=annee_du_financement%20DESC&limit=4`;
      const data = await fetchJsonSafe(url, 3200, signal);
      const rows = (data && data.results) ? data.results : [];

      if (rows.length === 0) {
        el.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-white">🏢 Parc Locatif Social (Rayon 70m)</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">100% Parc Privé</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Aucun programme de logement social conventionné recensé sur la parcelle ou à moins de 70 m.</p>
        `;
        return;
      }

      const totalLogements = rows.reduce((acc, r) => acc + (Number(r.nb_total_logements_finances) || Number(r.nombre_total_de_logements) || 0), 0);

      const listHtml = rows.slice(0, 3).map(r => {
        const bailleur = r.bs_nom || r.bailleur || "Bailleur social";
        const nb = r.nb_total_logements_finances || r.nombre_total_de_logements || "—";
        const addr = r.adresse_programme || "À proximité";
        const yr = r.annee_du_financement || "";
        return `
          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">
            <div class="truncate pr-2">
              <div class="font-semibold text-indigo-300 truncate">${bailleur}</div>
              <div class="text-[10px] font-mono text-slate-400 truncate">${addr} ${yr ? "• " + yr : ""}</div>
            </div>
            <span class="text-[10px] font-mono shrink-0 px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">${nb} logts</span>
          </div>
        `;
      }).join("");

      el.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-white">🏢 Programmes Sociaux (Rayon 70m)</span>
          <span class="text-[10px] font-mono text-indigo-300">${totalLogements} logts recensés</span>
        </div>
        <div class="space-y-1.5">${listHtml}</div>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `<div class="text-xs text-slate-500">Données RPLS non disponibles.</div>`;
    }
  }

  // 3. MOBILITÉ DOUCE TEMPS RÉEL : VÉLIB' MÉTROPOLE (Couvre Paris 75 + 92 + 93 + 94)
  async function loadVelibTempsReel(lat, lon, signal) {
    const el = document.getElementById("slot-lot3-velib");
    if (!el) return;
    el.innerHTML = `<div class="text-[11px] font-mono text-slate-400 animate-pulse">🚲 Disponibilité Vélib' Métropole en temps réel (250m)...</div>`;

    try {
      const where = encodeURIComponent(`within_distance(coordonnees_geo, geom'POINT(${lon} ${lat})', 250m)`);
      const url = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/velib-disponibilite-en-temps-reel/records?where=${where}&limit=3`;
      const data = await fetchJsonSafe(url, 3200, signal);
      const stations = (data && data.results) ? data.results : [];

      if (stations.length === 0) {
        el.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-white">🚲 Stations Vélib' Métropole (250m)</span>
            <span class="text-[10px] font-mono text-slate-400">Aucune station < 250m</span>
          </div>
        `;
        return;
      }

      const listHtml = stations.map(st => {
        const name = st.name || "Station Vélib'";
        const ebike = Number(st.ebike) || 0;
        const mechanical = Number(st.mechanical) || 0;
        const docks = Number(st.numdocksavailable) || 0;
        return `
          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">
            <div class="truncate pr-2">
              <div class="font-semibold text-white truncate">${name}</div>
              <div class="text-[10px] font-mono text-slate-400">${docks} place(s) libre(s)</div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
              <span class="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30" title="Vélos électriques">⚡ ${ebike}</span>
              <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" title="Vélos mécaniques">🚲 ${mechanical}</span>
            </div>
          </div>
        `;
      }).join("");

      el.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-white">🚲 Mobilité Vélib' Temps Réel (250m)</span>
          <span class="text-[10px] font-mono text-emerald-400">${stations.length} station(s)</span>
        </div>
        <div class="space-y-1.5">${listHtml}</div>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `<div class="text-xs text-slate-500">Flux Vélib' Métropole momentanément indisponible.</div>`;
    }
  }

  // Déclencheur automatique à chaque changement de parcelle
  function triggerLot3() {
    ensureLot3Slots();
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

    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();
    const signal = abortCtrl.signal;

    const subtitle = subtitleEl ? subtitleEl.textContent : "";
    const isParis = subtitle.includes("750") || parcelText.startsWith("Parcelle 75");

    loadCommercesRDC(lat, lon, signal);
    loadLogementsSociaux(lat, lon, isParis, signal);
    loadVelibTempsReel(lat, lon, signal);
  }

  const observer = new MutationObserver(() => triggerLot3());

  window.addEventListener("load", () => {
    ensureLot3Slots();
    const target = document.getElementById("coord-badge");
    if (target) {
      observer.observe(target, { childList: true, characterData: true, subtree: true });
      setTimeout(triggerLot3, 1100);
    }
  });
})();
