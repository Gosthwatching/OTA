window.OTA = window.OTA || {};

OTA.etat = {
  listeDepartements: [],
  carte: null,
  couchePoints: null,
  coucheUtilisateur: null,
  coucheDepartement: null,
  dom: {},
};

OTA.main = {
  start: async function () {
    if (typeof L === "undefined") {
      document.getElementById("status").textContent =
        "Leaflet non charge.";
      return;
    }

    OTA.main.readDom();

    OTA.config.bunkersActivated = await fetch("./json/bunker/bunkers_all_with_activation.json")
      .then(r => r.json())
      .catch(() => []);

    OTA.carte.init();
    OTA.main.bindEvents();

    OTA.departements.init().catch(err => {
      OTA.ui.showStatus(`Erreur demarrage: ${err.message}`);
    });
  },


  readDom() {
    OTA.etat.dom = {
      champDepartement: document.getElementById("department"),
      champZone: document.getElementById("zone"),
      champActivation: document.getElementById("activation"),
      zoneStatut: document.getElementById("status"),
    };
  },

  bindEvents() {
    document.getElementById("loadBtn").addEventListener("click", OTA.main.loadPoints);
    const locateBtn = document.getElementById("locateBtn");
    if (locateBtn) {
      locateBtn.addEventListener("click", OTA.geolocalisation.locateMe);
    }
    OTA.etat.dom.champDepartement.addEventListener("change", OTA.main.onDepartmentChange);
  },

  onDepartmentChange: async function () {
    const dep = OTA.departements.findSelected();
    if (!dep) return;

    await OTA.departements.ensureGeometry(dep);

    if (dep.centre) {
      OTA.carte.goTo(dep.centre, dep.zoom || 9);
    }

    OTA.carte.drawDepartment(dep);

    if (!dep.bbox) {
      OTA.ui.showStatus("Ce departement n'a pas encore de bbox.");
    }
  },

  loadPointsFromType: async function (typeKey) {
    try {
      OTA.etat.couchePoints.clearLayers();

      const fileMap = OTA.pointsLoader.getTypeFileMap();

      const mapped = fileMap[typeKey];
      const urls = Array.isArray(mapped) ? mapped : [mapped];
      if (!urls.length || !urls[0]) {
        OTA.ui.showStatus("Type inconnu");
        return;
      }

      const dep = OTA.departements.findSelected();
      if (!dep) {
        OTA.ui.showStatus("Aucun département sélectionné");
        return;
      }

      const selectedTypes = new Set([typeKey]);
      const points = [];

      for (const url of urls) {
        const features = await OTA.pointsLoader.fetchFeaturesForUrl(url);

        for (let idx = 0; idx < features.length; idx++) {
          const feature = features[idx];

          const featureType = OTA.pointsLoader.resolveFeatureType(feature, url, selectedTypes);
          if (featureType !== typeKey) continue;

          const coords = OTA.pointsLoader.getFeatureCoordinates(feature);
          if (!coords) continue;
          if (!OTA.geo.isPointInDepartment(coords.lat, coords.lon, dep)) continue;

          const point = OTA.pointsLoader.toPoint(feature, featureType, idx, url);
          if (point) points.push(point);
        }
      }

      OTA.carte.showPoints(points, dep, "department");
      OTA.ui.showStatus(`${points.length} points affichés (${typeKey})`);
    } catch (err) {
      OTA.ui.showStatus(`Erreur chargement points: ${err.message}`);
    }
  },

  loadTestPoint: function () {
    OTA.etat.couchePoints.clearLayers();

    L.marker([48.8566, 2.3522])
      .addTo(OTA.etat.couchePoints)
      .bindPopup("Test : Paris centre")
      .openPopup();

    OTA.ui.showStatus("Point test affiché.");
  },

  loadGeoJSONPoint: async function () {
    OTA.etat.couchePoints.clearLayers();

    const geo = await fetch("./data/test-point.geojson").then(r => r.json());
    L.geoJSON(geo).addTo(OTA.etat.couchePoints);

    OTA.ui.showStatus("Point GeoJSON affiché.");
  },

  loadGeoJSONMulti: async function () {
    OTA.etat.couchePoints.clearLayers();

    const geo = await fetch("./data/test-multi.geojson").then(r => r.json());
    L.geoJSON(geo).addTo(OTA.etat.couchePoints);

    OTA.ui.showStatus("Points GeoJSON affichés.");
  },

  showNoResultStatus: function (types, filtreActivation, dep, zoneRecherche) {
    if (types.includes("beach")) {
      if (filtreActivation === "activated") {
        OTA.ui.showStatus(
          "Aucune plage active dans ce département. Mettez Activation sur « Tous » ou choisissez le Finistère (29)."
        );
      } else if (dep.code === "75") {
        OTA.ui.showStatus(
          "Paris n'a pas de plages. Choisissez un département côtier (ex. 29 - Finistère, 56 - Morbihan)."
        );
      } else if (zoneRecherche && zoneRecherche !== dep) {
        OTA.ui.showStatus("Aucune plage trouvée dans la zone sélectionnée.");
      } else {
        OTA.ui.showStatus(
          "Aucune plage trouvée pour ce département. Choisissez un département côtier (ex. 29 - Finistère)."
        );
      }
      return;
    }

    OTA.ui.showStatus("Aucun point trouvé pour les filtres sélectionnés.");
  },

  loadPoints: async function () {
    OTA.etat.couchePoints.clearLayers();

    const types = OTA.ui.readCheckedTypes();
    const filtreActivation = OTA.etat.dom.champActivation.value;

    if (types.length === 0) {
      OTA.ui.showStatus("Aucun type sélectionné.");
      return;
    }

    let dep = OTA.departements.findSelected();
    if (!dep) {
      OTA.ui.showStatus("Aucun département sélectionné.");
      return;
    }

    await OTA.departements.ensureGeometry(dep);
    const zoneRecherche = OTA.departements.chooseSearchZone(
      (OTA.etat.dom.champZone?.value || "department"),
      dep
    );

    const fileMap = OTA.pointsLoader.getTypeFileMap();
    const urlToTypes = OTA.pointsLoader.buildUrlToTypes(types, fileMap);

    let allPoints = [];

    for (const url in urlToTypes) {
      console.log("URL chargée :", url);
      try {
        const selectedTypes = urlToTypes[url];
        const pointsFiltres = await OTA.pointsLoader.collectPointsForUrl(
          url,
          selectedTypes,
          zoneRecherche,
          dep,
          filtreActivation
        );

        allPoints.push(...pointsFiltres);
      } catch (err) {
        OTA.ui.showStatus("Erreur chargement " + url + " : " + err.message);
      }
    }

    allPoints = OTA.main.mergePointsById(allPoints);

    if (allPoints.length === 0) {
      OTA.main.showNoResultStatus(types, filtreActivation, dep, zoneRecherche);
      return;
    }

    const nbActifs = allPoints.filter(point => point.estActif).length;
    const nbInactifs = allPoints.length - nbActifs;

    OTA.carte.showPoints(allPoints, zoneRecherche || dep, "department");
    OTA.ui.showStatus(
      `${allPoints.length} points affichés (${nbActifs} actifs, ${nbInactifs} inactifs).`
    );
  },

  mergePointsById: function (points) {
    const pointsParId = new Map();

    for (const point of points) {
      const sourceList = Array.isArray(point.sources)
        ? point.sources
        : point.source
          ? [point.source]
          : [];

      if (!pointsParId.has(point.id)) {
        pointsParId.set(point.id, {
          ...point,
          sources: [...new Set(sourceList)],
        });
        continue;
      }

      const courant = pointsParId.get(point.id);
      courant.sources = [...new Set([...(courant.sources || []), ...sourceList])];
      if (!courant.source && courant.sources.length > 0) {
        courant.source = courant.sources[0];
      }
    }

    return Array.from(pointsParId.values());
  },
};

OTA.main.start();
