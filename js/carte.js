window.OTA = window.OTA || {};

OTA.carte = {
  sourceLabels: {
    OSM: { label: "OSM", color: "#3b82f6" },
    FBOTA: { label: "FBOTA", color: "#f59e0b" },
  },

  init() {
    OTA.etat.carte = L.map("map").setView([48.8566, 2.3522], 13);

    OTA.etat.carte.zoomControl.remove();
    L.control.zoom({ position: "topright" }).addTo(OTA.etat.carte);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { attribution: "&copy; OpenStreetMap contributors" }
    ).addTo(OTA.etat.carte);

    OTA.etat.couchePoints = OTA.carte.createClusterGroup();
    OTA.etat.couchePoints.addTo(OTA.etat.carte);
    OTA.etat.coucheUtilisateur = L.layerGroup().addTo(OTA.etat.carte);
    OTA.etat.coucheDepartement = null;

    // Légende
    OTA.carte.addLegendControl();

    // Panneau de stats
    OTA.carte.addStatsControl();
  },

  getPointSources(point) {
    if (Array.isArray(point.sources) && point.sources.length > 0) {
      return [...new Set(point.sources)];
    }

    if (point.source) {
      return [point.source];
    }

    return [];
  },

  getPointSourceLabel(point) {
    const sources = OTA.carte.getPointSources(point);
    if (sources.length === 0) return "Inconnue";
    return sources.map(source => OTA.carte.sourceLabels[source]?.label || source).join(" + ");
  },

  getPointSourceColor(point) {
    const sources = OTA.carte.getPointSources(point);

    if (sources.includes("OSM") && sources.includes("FBOTA")) {
      return "#8b5cf6";
    }

    const firstSource = sources[0];
    return OTA.carte.sourceLabels[firstSource]?.color || "#94a3b8";
  },

  renderSourceBadges(point) {
    const sources = OTA.carte.getPointSources(point);

    if (sources.length === 0) {
      return '<span class="ota-source-badge ota-source-unknown">Inconnue</span>';
    }

    return sources
      .map(source => {
        const meta = OTA.carte.sourceLabels[source] || { label: source, color: "#94a3b8" };
        return `<span class="ota-source-badge" style="background:${meta.color};">${meta.label}</span>`;
      })
      .join("");
  },

  renderActivationBadge(point) {
    if (point.estActif === true) {
      return '<span class="ota-activation-badge ota-activation-badge-active">Activé</span>';
    }

    if (point.estActif === false) {
      return '<span class="ota-activation-badge ota-activation-badge-inactive">Non activé</span>';
    }

    return '<span class="ota-activation-badge ota-activation-badge-unknown">Activation inconnue</span>';
  },

  createClusterGroup() {
    if (typeof L.markerClusterGroup !== "function") {
      return L.layerGroup();
    }

    return L.markerClusterGroup({
      maxClusterRadius: 60,
      disableClusteringAtZoom: 18,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        let size = "small";

        if (count >= 100) size = "large";
        else if (count >= 50) size = "medium";

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `ota-cluster ota-cluster-${size}`,
          iconSize: L.point(42, 42),
        });
      },
    });
  },

  addLegendControl() {
    const LegendControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd: function () {
        const div = L.DomUtil.create("div", "legend-control");
        div.innerHTML = `
          <div class="legend-box">
            <p class="legend-title">Légende</p>
            <div class="legend-item">
              <span class="legend-dot" style="background: #22c55e;"></span>
              <span>Activé</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot" style="background: #ef4444;"></span>
              <span>Non activé</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot" style="background: #64748b;"></span>
              <span>Inconnu</span>
            </div>
          </div>
        `;
        return div;
      }
    });

    new LegendControl().addTo(OTA.etat.carte);
  },

  // Nouveau : panneau de stats
  addStatsControl() {
    OTA.carte.statsControl = L.control({ position: "topleft" });

    OTA.carte.statsControl.onAdd = function () {
      const div = L.DomUtil.create("div", "ota-stats-box");
      div.id = "ota-stats";
      div.innerHTML = "0 point affiché";
      return div;
    };

    OTA.carte.statsControl.addTo(OTA.etat.carte);
  },

  goTo(centre, zoom) {
    OTA.etat.carte.setView(centre, zoom);
  },

  fitBbox(bbox) {
    OTA.etat.carte.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      {
        maxZoom: 15,
        padding: [20, 20],
      }
    );
  },

  showPoints(points, zoneRecherche, portee) {
    OTA.etat.couchePoints.clearLayers();

    if (portee === "single") {
      const p = OTA.config.pointTest;
      OTA.etat.carte.setView([p.lat, p.lon], 13);
    } else if (zoneRecherche?.bbox) {
      OTA.carte.fitBbox(zoneRecherche.bbox);
    }

    const sortedPoints = [...points].sort((a, b) => {
      if (a.typePoint === "lighthouse" && b.typePoint !== "lighthouse") return 1;
      if (b.typePoint === "lighthouse" && a.typePoint !== "lighthouse") return -1;
      return 0;
    });

    for (let point of sortedPoints) {
      const marqueur = L.marker([point.lat, point.lon], {
        icon: OTA.icons.create(point.typePoint, point.estActif),
      });

      const popupHtml = point.typePoint === "bunker"
        ? `
        <strong>${OTA.ui.escapeHtml(point.nom || "(sans nom)")}</strong>
        <p class="ota-popup-source">${OTA.carte.renderSourceBadges(point)} ${OTA.carte.renderActivationBadge(point)}</p>
        <a target="_blank" href="https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=18/${point.lat}/${point.lon}">Voir sur OSM</a>
      `
        : `
        <strong>${OTA.ui.escapeHtml(point.nom || "(sans nom)")}</strong>
        <p>${OTA.config.configTypePoint[point.typePoint]?.nom || point.typePoint}</p>
        <p class="ota-popup-activation">Statut: ${OTA.carte.renderActivationBadge(point)}</p>
        <a target="_blank" href="https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=18/${point.lat}/${point.lon}">Voir sur OSM</a>
      `;

      marqueur.bindPopup(popupHtml);

      OTA.etat.couchePoints.addLayer(marqueur);
    }

    // Mise à jour du panneau de stats
    const total = points.length;
    const actifs = points.filter(p => p.estActif).length;
    const inactifs = total - actifs;

    document.getElementById("ota-stats").innerHTML =
      `${total} points affichés (${actifs} actifs, ${inactifs} inactifs)`;
  },

  drawDepartment(departement) {
    if (OTA.etat.coucheDepartement) {
      OTA.etat.carte.removeLayer(OTA.etat.coucheDepartement);
    }

    const geoJson = OTA.geo.buildDepartmentGeoJson(departement);
    if (!geoJson) return;

    OTA.etat.coucheDepartement = L.geoJSON(geoJson, {
      style: {
        color: "#0ea5e9",
        weight: 2,
        fillColor: "#7dd3fc",
        fillOpacity: 0.15,
      },
    }).addTo(OTA.etat.carte);
  },
};

OTA.carte.tagActivatedBunkers = function (points) {
  const activated = OTA.config.bunkersActivated || [];

  for (let p of points) {
    if (p.typePoint === "bunker") {
      p.estActif = activated.some(a => a.bunker === p.bunker);
    }
  }
};
