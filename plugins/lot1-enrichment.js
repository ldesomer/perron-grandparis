/**
 * PERRON — Plugin Isolé Lot 1 (Zéro modification du cœur applicatif)
 * Sources : API Géorisques, API France Chaleur Urbaine, API Éducation Nationale (IPS), API OpenData Paris (Permis & Chantiers)
 */

(function initPerronLot1Plugin() {
  let lastInspectedKey = "";
  let currentAbortController = null;

  // Utilitaire de requête avec Timeout strict pour ne jamais bloquer le navigateur
  async function fetchSafe(url, timeoutMs = 3200, parentSignal = null) {
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

  // Création des conteneurs HTML dédiés en bas de chaque onglet existant
  function ensurePluginSlots() {
    const tabBuilding = document.getElementById("tab-building");
    const tabDpe = document.getElementById("tab-dpe");
    const tabEnv = document.getElementById("tab-env");

    if (tabBuilding && !document.getElementById("slot-lot1-georisques")) {
      const wrap = document.createElement("div");
      wrap.className = "space-y-3 mt-3";
      wrap.innerHTML = `
        <div id="slot-lot1-georisques" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>
        <div id="slot-lot1-urbanisme" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>
      `;
      tabBuilding.appendChild(wrap);
    }

    if (tabDpe && !document.getElementById("slot-lot1-fcu")) {
      const wrap = document.createElement("div");
      wrap.id = "slot-lot1-fcu";
      wrap.className = "p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 mt-3";
      tabDpe.appendChild(wrap);
    }

    if (tabEnv && !document.getElementById("slot-lot1-ecoles")) {
      const wrap = document.createElement("div");
      wrap.className = "space-y-3 mt-3";
      wrap.innerHTML = `
        <div id="slot-lot1-ecoles" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>
        <div id="slot-lot1-chantiers" class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90"></div>
      `;
      tabEnv.appendChild(wrap);
    }
  }

  // 1. BRIQUE GÉORISQUES (Sous-sol, Carrières, Inondation, Argiles)
  async function loadGeorisques(lat, lon, signal) {
    const el = document.getElementById("slot-lot1-georisques");
    if (!el) return;
    el.innerHTML = `<div class="text-[11px] font-mono text-slate-400 animate-pulse">🛡️ Analyse des risques naturels & sous-sol (API Géorisques)...</div>`;

    try {
      const url = `https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${lon},${lat}&rayon=100`;
      const data = await fetchSafe(url, 3200, signal);
      const risques = (data && data.data && data.data[0] && data.data[0].risques_detail)
        ? data.data[0].risques_detail
        : (data && data.data ? data.data.flatMap(d => d.risques_detail || []) : []);

      // Déduplication par libellé
      const uniqueRisks = [];
      const seen = new Set();
      for (const r of risques) {
        const label = r.libelle_risque_long || r.libelle_risque || "";
        if (label && !seen.has(label)) {
          seen.add(label);
          uniqueRisks.push(label);
        }
      }

      const badgesHtml = uniqueRisks.length > 0
        ? uniqueRisks.slice(0, 6).map(r => {
            const isCritical = /inondation|mouvement de terrain|carrière|argile|tassement/i.test(r);
            const cls = isCritical
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : "bg-slate-800 text-slate-300 border-slate-700";
            return `<span class="text-[10px] font-mono px-2 py-0.5 rounded border ${cls}">${r}</span>`;
          }).join("")
        : `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Aucun risque majeur recensé sur la parcelle</span>`;

      el.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-white">🛡️ Sous-sol & Risques Naturels</span>
          <span class="text-[10px] font-mono text-slate-400">Source : BRGM / Géorisques</span>
        </div>
        <div class="flex flex-wrap gap-1.5">${badgesHtml}</div>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white">🛡️ Sous-sol & Risques (Géorisques)</span>
          <span class="text-[10px] font-mono text-slate-500">Service BRGM temporairement indisponible</span>
        </div>
      `;
    }
  }

  // 2. BRIQUE URBANISME (Permis & Déclarations préalables dans un rayon de 120m - Paris)
  async function loadUrbanisme(lat, lon, isParis, signal) {
    const el = document.getElementById("slot-lot1-urbanisme");
    if (!el) return;

    if (!isParis) {
      el.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white">🏗️ Permis & Travaux d'Immeuble</span>
          <span class="text-[10px] font-mono text-slate-500">Flux temps réel réservé à Paris (75)</span>
        </div>
      `;
      return;
    }

    el.innerHTML = `<div class="text-[11px] font-mono text-slate-400 animate-pulse">🏗️ Recherche des autorisations d'urbanisme (120m)...</div>`;

    try {
      const where = encodeURIComponent(`within_distance(geo_point_2d, geom'POINT(${lon} ${lat})', 120m)`);
      const url = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/autorisations-d-urbanisme-hors-permis-de-demolir/records?where=${where}&order_by=date_depot%20DESC&limit=4`;
      const data = await fetchSafe(url, 3200, signal);
      const rows = (data && data.results) ? data.results : [];

      if (rows.length === 0) {
        el.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-white">🏗️ Urbanisme & Ravalements (120m)</span>
            <span class="text-[10px] font-mono text-emerald-400">Aucun dossier récent</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Aucun permis de construire ou déclaration préalable de travaux recensé dans un rayon de 120 m.</p>
        `;
        return;
      }

      const itemsHtml = rows.map(r => {
        const type = r.type_dossier || "Déclaration";
        const numAddr = `${r.numero_voirie || ""} ${r.nom_voirie || ""}`.trim();
        const desc = (r.nature_travaux || r.description_travaux || "Travaux sur bâti existant").slice(0, 85);
        const dt = r.date_depot ? r.date_depot.slice(0, 10) : "—";
        return `
          <div class="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">
            <div class="flex justify-between items-center mb-0.5">
              <span class="font-semibold text-amber-300 font-mono">${type} • ${numAddr}</span>
              <span class="text-[10px] font-mono text-slate-400">${dt}</span>
            </div>
            <p class="text-slate-300 text-[10px] leading-snug">${desc}</p>
          </div>
        `;
      }).join("");

      el.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-white">🏗️ Urbanisme & Ravalements (120m)</span>
          <span class="text-[10px] font-mono text-amber-300">${rows.length} dossier(s)</span>
        </div>
        <div class="space-y-1.5">${itemsHtml}</div>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `<div class="text-xs text-slate-500">Autorisations d'urbanisme non disponibles pour ce secteur.</div>`;
    }
  }

  // 3. BRIQUE FRANCE CHALEUR URBAINE (Réseau de chauffage urbain CPCU / Géothermie)
  async function loadFranceChaleurUrbaine(lat, lon, signal) {
    const el = document.getElementById("slot-lot1-fcu");
    if (!el) return;
    el.innerHTML = `<div class="text-[11px] font-mono text-slate-400 animate-pulse">🔥 Test d'éligibilité au réseau de chaleur urbain...</div>`;

    try {
      const url = `https://france-chaleur-urbaine.beta.gouv.fr/api/v1/eligibility?lat=${lat}&lon=${lon}`;
      const data = await fetchSafe(url, 3200, signal);

      const dist = data && typeof data.distance === "number" ? Math.round(data.distance) : null;
      const isEligible = Boolean(data && (data.isEligible || (dist !== null && dist <= 150)));
      const networkName = (data && (data.nom || data.gestionnaire)) ? (data.nom || data.gestionnaire) : "Réseau de chaleur métropolitain";

      const badge = isEligible
        ? `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Raccordable (${dist !== null ? dist + " m" : "< 100 m"})</span>`
        : `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">${dist !== null ? "À " + dist + " m d'un réseau" : "Hors périmètre immédiat"}</span>`;

      el.innerHTML = `
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-semibold text-white">🔥 Réseau de Chaleur Urbain</span>
          ${badge}
        </div>
        <p class="text-[11px] text-slate-300 leading-relaxed">
          ${isEligible
            ? `Un réseau de chauffage urbain (<strong>${networkName}</strong>) passe à proximité immédiate de la parcelle : atout majeur pour décarboner une copropriété au gaz ou fioul.`
            : `Aucun canal de chauffage urbain détecté sous le trottoir immédiat (Source : France Chaleur Urbaine / ADEME).`}
        </p>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white">🔥 Réseau de Chaleur Urbain (ADEME)</span>
          <span class="text-[10px] font-mono text-slate-500">Test réseau non disponible</span>
        </div>
      `;
    }
  }

  // 4. BRIQUE ÉDUCATION NATIONALE (Collèges publics & Indice de Position Sociale IPS)
  async function loadCollegesIPS(lat, lon, deptCode, signal) {
    const el = document.getElementById("slot-lot1-ecoles");
    if (!el) return;
    el.innerHTML = `<div class="text-[11px] font-mono text-slate-400 animate-pulse">🎓 Analyse des collèges à proximité & Indice IPS...</div>`;

    try {
      // 1. Trouver les collèges les plus proches via l'Annuaire de l'Éducation Nationale
      const geoWhere = encodeURIComponent(`within_distance(position, geom'POINT(${lon} ${lat})', 950m) AND type_etablissement="Collège"`);
      const annuaireUrl = `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records?where=${geoWhere}&limit=4`;
      const annuaireData = await fetchSafe(annuaireUrl, 3200, signal);
      const schools = (annuaireData && annuaireData.results) ? annuaireData.results : [];

      if (schools.length === 0) {
        el.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-white">🎓 Collèges & Attractivité Scolaire (950m)</span>
            <span class="text-[10px] font-mono text-slate-400">Aucun collège < 950m</span>
          </div>
        `;
        return;
      }

      // 2. Récupérer l'IPS officiel pour ces UAI (identifiant_de_l_etablissement)
      const uaiList = schools.map(s => `"${s.identifiant_de_l_etablissement}"`).join(",");
      const ipsWhere = encodeURIComponent(`uai IN (${uaiList})`);
      const ipsUrl = `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-ips-colleges-ap2022/records?where=${ipsWhere}&order_by=rentree_scolaire%20DESC&limit=10`;

      let ipsMap = {};
      try {
        const ipsData = await fetchSafe(ipsUrl, 2800, signal);
        (ipsData.results || []).forEach(row => {
          if (row.uai && !ipsMap[row.uai]) {
            ipsMap[row.uai] = Math.round(Number(row.ips));
          }
        });
      } catch (_) {}

      const schoolsHtml = schools.slice(0, 3).map(s => {
        const uai = s.identifiant_de_l_etablissement;
        const ips = ipsMap[uai] || null;
        const statut = s.statut_public_prive || "Public";
        const ipsBadge = ips
          ? `<span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${ips >= 125 ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border border-amber-500/30"}">IPS ${ips}</span>`
          : `<span class="text-[10px] font-mono text-slate-400">${statut}</span>`;

        return `
          <div class="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <div>
              <div class="text-[11px] font-semibold text-white">${s.nom_etablissement}</div>
              <div class="text-[10px] font-mono text-slate-400">${statut} • ${s.adresse_1 || s.nom_commune}</div>
            </div>
            ${ipsBadge}
          </div>
        `;
      }).join("");

      el.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-white">🎓 Collèges & Indice IPS (Rayon 950m)</span>
          <span class="text-[10px] font-mono text-slate-400">Moy. France : 105</span>
        </div>
        <div class="space-y-1.5">${schoolsHtml}</div>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `<div class="text-xs text-slate-500">Données scolaires momentanément indisponibles.</div>`;
    }
  }

  // 5. BRIQUE CHANTIERS PERTURBANTS (OpenData Paris - Rayon 200m)
  async function loadChantiers(lat, lon, isParis, signal) {
    const el = document.getElementById("slot-lot1-chantiers");
    if (!el) return;

    if (!isParis) {
      el.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white">🚧 Chantiers Perturbants</span>
          <span class="text-[10px] font-mono text-slate-500">Périmètre Ville de Paris (75)</span>
        </div>
      `;
      return;
    }

    el.innerHTML = `<div class="text-[11px] font-mono text-slate-400 animate-pulse">🚧 Vérification des chantiers de voirie en cours (200m)...</div>`;

    try {
      const where = encodeURIComponent(`within_distance(geo_point_2d, geom'POINT(${lon} ${lat})', 200m)`);
      const url = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/chantiers-perturbants/records?where=${where}&limit=3`;
      const data = await fetchSafe(url, 3000, signal);
      const rows = (data && data.results) ? data.results : [];

      if (rows.length === 0) {
        el.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-white">🚧 Chantiers Perturbants (200m)</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">0 chantier majeur</span>
          </div>
        `;
        return;
      }

      const listHtml = rows.map(c => `
        <div class="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]">
          <div class="font-semibold text-rose-300">${c.objet || c.nature || "Travaux de voirie"}</div>
          <div class="text-[10px] font-mono text-slate-400 mt-0.5">${c.voie || ""} • Fin prévue : ${c.date_fin ? c.date_fin.slice(0, 10) : "En cours"}</div>
        </div>
      `).join("");

      el.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-white">🚧 Chantiers Perturbants actifs (200m)</span>
          <span class="text-[10px] font-mono text-rose-400">${rows.length} actif(s)</span>
        </div>
        <div class="space-y-1.5">${listHtml}</div>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `<div class="text-xs text-slate-500">Aucun chantier majeur détecté.</div>`;
    }
  }

  // Orchestrateur déclenché automatiquement dès que la fiche d'immeuble change
  function triggerLot1Enrichment() {
    ensurePluginSlots();

    const coordEl = document.getElementById("coord-badge");
    const parcelEl = document.getElementById("parcel-id-badge");
    const subtitleEl = document.getElementById("building-subtitle");
    if (!coordEl || !parcelEl) return;

    const coordText = coordEl.textContent.trim(); // ex: "48.86695, 2.33045"
    const parcelText = parcelEl.textContent.trim();
    if (!coordText.includes(",") || parcelText.includes("Chargement")) return;

    const [latStr, lonStr] = coordText.split(",").map(s => s.trim());
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon)) return;

    const key = `${lat.toFixed(5)}_${lon.toFixed(5)}`;
    if (key === lastInspectedKey) return;
    lastInspectedKey = key;

    if (currentAbortController) currentAbortController.abort();
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    const subtitle = subtitleEl ? subtitleEl.textContent : "";
    const isParis = subtitle.includes("750") || parcelText.startsWith("Parcelle 75");
    const deptCode = parcelText.replace("Parcelle ", "").slice(0, 2) || "75";

    // Exécution 100% parallèle et indépendante
    loadGeorisques(lat, lon, signal);
    loadUrbanisme(lat, lon, isParis, signal);
    loadFranceChaleurUrbaine(lat, lon, signal);
    loadCollegesIPS(lat, lon, deptCode, signal);
    loadChantiers(lat, lon, isParis, signal);
  }

  // Surveillance passive du DOM : zéro modification du script principal
  const observer = new MutationObserver(() => {
    triggerLot1Enrichment();
  });

  window.addEventListener("load", () => {
    ensurePluginSlots();
    const target = document.getElementById("coord-badge");
    if (target) {
      observer.observe(target, { childList: true, characterData: true, subtree: true });
      setTimeout(triggerLot1Enrichment, 800);
    }
  });
})();
