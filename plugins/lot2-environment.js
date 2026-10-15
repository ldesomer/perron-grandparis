/**
 * PERRON — Plugin Isolé Lot 2 : Environnement, Antennes ANFR, Fraîcheur Urbaine & Calque Bruit
 * Fonctionne de manière 100% autonome sans modifier index.html
 */

(function initPerronLot2Plugin() {
  let lastCoordKey = "";
  let abortCtrl = null;

  async function fetchJsonSafe(url, timeoutMs = 3200, parentSignal = null) {
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

  // Crée les emplacements dans les onglets 2 (Immeuble) et 4 (Rue)
  function ensureLot2Slots() {
    const tabBuilding = document.getElementById("tab-building");
    const tabEnv = document.getElementById("tab-env");

    if (tabBuilding && !document.getElementById("slot-lot2-antennes")) {
      const box = document.createElement("div");
      box.id = "slot-lot2-antennes";
      box.className = "p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 mt-3";
      tabBuilding.appendChild(box);
    }

    if (tabEnv && !document.getElementById("slot-lot2-fraicheur")) {
      const box = document.createElement("div");
      box.id = "slot-lot2-fraicheur";
      box.className = "p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 mt-3";
      tabEnv.appendChild(box);
    }
  }

  // 1. ANTENNES RELAIS 4G/5G SUR LE TOIT OU A PROXIMITÉ (Rayon 180m)
  async function loadAntennesANFR(lat, lon, signal) {
    const el = document.getElementById("slot-lot2-antennes");
    if (!el) return;
    el.innerHTML = `<div class="text-[11px] font-mono text-slate-400 animate-pulse">📡 Recherche des antennes-relais 4G/5G (ANFR 180m)...</div>`;

    try {
      const where = encodeURIComponent(`within_distance(coordonnees, geom'POINT(${lon} ${lat})', 180m)`);
      const url = `https://data.opendatasoft.com/api/explore/v2.1/catalog/datasets/onde-anfr-supports-antennes@public/records?where=${where}&limit=10`;
      const data = await fetchJsonSafe(url, 3200, signal);
      const records = (data && data.results) ? data.results : [];

      if (records.length === 0) {
        el.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-white">📡 Antennes-Relais 4G/5G (ANFR)</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Aucune < 180m</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Aucun support d'antenne macro-cellulaire recensé sur le toit ou dans un rayon de 180 m.</p>
        `;
        return;
      }

      const operators = [...new Set(records.map(r => r.nom_op || r.operateur || "Opérateur").filter(Boolean))];
      const badgeColor = records.length >= 3
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
        : "bg-sky-500/15 text-sky-300 border-sky-500/30";

      el.innerHTML = `
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-semibold text-white">📡 Antennes-Relais 4G/5G (180m)</span>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${badgeColor}">${records.length} support(s) ANFR</span>
        </div>
        <p class="text-[11px] text-slate-300 leading-snug">
          Opérateurs présents à proximité immédiate : <strong class="text-white">${operators.slice(0, 4).join(", ")}</strong>.
        </p>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white">📡 Antennes-Relais 4G/5G (ANFR)</span>
          <span class="text-[10px] font-mono text-slate-400">Données Cartoradio non disponibles</span>
        </div>
      `;
    }
  }

  // 2. ÎLOTS DE FRAÎCHEUR & CONFORT D'ÉTÉ (Rayon 300m)
  async function loadIlotsFraicheur(lat, lon, isParis, signal) {
    const el = document.getElementById("slot-lot2-fraicheur");
    if (!el) return;

    if (!isParis) {
      el.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white">🌳 Îlots de Fraîcheur & Canopée</span>
          <span class="text-[10px] font-mono text-slate-500">Cartographie OpenData Paris (75)</span>
        </div>
      `;
      return;
    }

    el.innerHTML = `<div class="text-[11px] font-mono text-slate-400 animate-pulse">🌳 Analyse des îlots de fraîcheur urbains (300m)...</div>`;

    try {
      const where = encodeURIComponent(`within_distance(geo_point_2d, geom'POINT(${lon} ${lat})', 300m)`);
      const url = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/ilots-de-fraicheur-espaces-verts-frais/records?where=${where}&limit=4`;
      const data = await fetchJsonSafe(url, 3200, signal);
      const rows = (data && data.results) ? data.results : [];

      if (rows.length === 0) {
        el.innerHTML = `
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold text-white">🌳 Confort d'Été & Îlots Frais (300m)</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">Zone minérale dense</span>
          </div>
          <p class="text-[11px] text-slate-400">Aucun espace vert classé "îlot de fraîcheur" à moins de 300 m. Vigilance surchauffe estivale sous combles.</p>
        `;
        return;
      }

      const listHtml = rows.slice(0, 3).map(r => `
        <div class="flex items-center justify-between p-1.5 rounded bg-slate-950/70 border border-slate-800/80 text-[11px]">
          <span class="text-emerald-300 font-medium truncate pr-2">${r.nom || r.type || "Espace vert frais"}</span>
          <span class="text-[10px] font-mono text-slate-400 shrink-0">${r.ouvert_24h === "Oui" ? "24h/24" : (r.categorie || "Parc/Square")}</span>
        </div>
      `).join("");

      el.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-white">🌳 Confort d'Été & Îlots Frais (300m)</span>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">${rows.length} îlot(s) proche(s)</span>
        </div>
        <div class="space-y-1">${listHtml}</div>
      `;
    } catch (e) {
      if (signal.aborted) return;
      el.innerHTML = `<div class="text-xs text-slate-500">Données îlots de fraîcheur non disponibles.</div>`;
    }
  }

  // Surveillance passive des clics sur la carte
  function triggerLot2() {
    ensureLot2Slots();
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

    loadAntennesANFR(lat, lon, signal);
    loadIlotsFraicheur(lat, lon, isParis, signal);
  }

  const observer = new MutationObserver(() => triggerLot2());

  window.addEventListener("load", () => {
    ensureLot2Slots();
    const target = document.getElementById("coord-badge");
    if (target) {
      observer.observe(target, { childList: true, characterData: true, subtree: true });
      setTimeout(triggerLot2, 1000);
    }
  });
})();
