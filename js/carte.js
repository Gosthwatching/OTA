// Carte Leaflet : tuiles, marqueurs, contour département
window.OTA = window.OTA || {};
OTA.carte = {
  init: function () {
    // Carte centrée sur Paris au démarrage
    OTA.etat.carte = L.map("map").setView([48.8566, 2.3522], 12);

    // Déplacement du zoom en haut à droite
    OTA.etat.carte.zoomControl.remove();
    L.control.zoom({
      position: 'topright'
    }).addTo(OTA.etat.carte);

    // Tuiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(OTA.etat.carte);

    // Couches
    OTA.etat.couchePoints = L.layerGroup().addTo(OTA.etat.carte);
    OTA.etat.coucheUtilisateur = L.layerGroup().addTo(OTA.etat.carte);
    OTA.etat.coucheDepartement = null;
  },

  goTo: function (centre, zoom) {
    OTA.etat.carte.setView(centre, zoom);
  },

  fitBbox: function (bbox) {
    OTA.etat.carte.fitBounds([
      [bbox[0], bbox[1]],
      [bbox[2], bbox[3]],
    ]);
  },

  showPoints: function (points, zoneRecherche, portee) {
    OTA.etat.couchePoints.clearLayers();

    // 🔥 Correction : ne recadre QUE si une bbox existe
    if (portee === "single") {
      const p = OTA.config.pointTest;
      OTA.etat.carte.setView([p.lat, p.lon], 13);
    } else if (zoneRecherche && zoneRecherche.bbox) {
      OTA.carte.fitBbox(zoneRecherche.bbox);
    }

    // Ajout des points
    for (let i = 0; i < points.length; i += 1) {
      const point = points[i];
      const config = OTA.config.configTypePoint[point.typePoint];

      const marqueur = L.circleMarker([point.lat, point.lon], {
        radius: 6,
        color: config.couleur,
        fillOpacity: 0.8,
      });

      const nomAffiche = OTA.ui.escapeHtml(point.nom || "(sans nom)");
      const texteActivation = point.estActif ? "active" : "pas active";

      marqueur.bindPopup(
        `
        <strong>${nomAffiche}</strong>
        <p class="popup-line">${config.nom}</p>
        <p class="popup-line">Statut: ${texteActivation}</p>
        <a target="_blank" href="https://www.openstreetmap.org/${point.id}">Voir sur OSM</a>
      `
      );

      marqueur.addTo(OTA.etat.couchePoints);
    }
  },

  drawDepartment: function (departement) {
    if (OTA.etat.coucheDepartement) {
      OTA.etat.carte.removeLayer(OTA.etat.coucheDepartement);
      OTA.etat.coucheDepartement = null;
    }

    const geoJson = OTA.geo.buildDepartmentGeoJson(departement);
    if (!geoJson) {
      return;
    }

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
