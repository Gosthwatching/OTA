window.OTA = window.OTA || {};

OTA.carte = {
  init() {
    OTA.etat.carte = L.map("map").setView([48.8566, 2.3522], 12);

    OTA.etat.carte.zoomControl.remove();
    L.control.zoom({ position: "topright" }).addTo(OTA.etat.carte);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { attribution: "&copy; OpenStreetMap contributors" }
    ).addTo(OTA.etat.carte);

    OTA.etat.couchePoints = L.layerGroup().addTo(OTA.etat.carte);
    OTA.etat.coucheUtilisateur = L.layerGroup().addTo(OTA.etat.carte);
    OTA.etat.coucheDepartement = null;

    // Add legend as custom control in top-left
    OTA.carte.addLegendControl();
  },

  addLegendControl() {
    const LegendControl = L.Control.extend({
      options: {
        position: "topleft"
      },
      onAdd: function (map) {
        const div = L.DomUtil.create("div", "legend-control");
        div.innerHTML = `
          <div class="legend-box">
            <p class="legend-title">Légende</p>
            <div class="legend-item">
              <span class="legend-dot" style="background: #ef4444;"></span>
              <span>Phare</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot" style="background: #22c55e;"></span>
              <span>Bunker activé</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot" style="background: #6b7280;"></span>
              <span>Bunker non-activé</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot" style="background: #facc15;"></span>
              <span>Plage</span>
            </div>
          </div>
        `;
        return div;
      }
    });

    new LegendControl().addTo(OTA.etat.carte);
  },

  goTo(centre, zoom) {
    OTA.etat.carte.setView(centre, zoom);
  },

  fitBbox(bbox) {
    OTA.etat.carte.fitBounds([
      [bbox[0], bbox[1]],
      [bbox[2], bbox[3]],
    ]);
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

      marqueur.bindPopup(`
        <strong>${OTA.ui.escapeHtml(point.nom || "(sans nom)")}</strong>
        <p>${point.typePoint === "bunker" ? "Bunker" : OTA.config.configTypePoint[point.typePoint]?.nom || point.typePoint}</p>
        <p>Statut: ${point.estActif ? "✓ Activé" : "✗ Non-activé"}</p>
        <a target="_blank" href="https://www.openstreetmap.org/${point.id}">Voir sur OSM</a>
      `);

      marqueur.addTo(OTA.etat.couchePoints);
    }
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
