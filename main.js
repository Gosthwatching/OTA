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

  OTA.config.bunkersActivated = await fetch("./assets/json/bunkers_mapped.json")
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

  getGeoJSONPointType: function (feature) {
    const props = feature.properties || {};

    if (props.man_made === "lighthouse") return "lighthouse";
    if (props.natural === "beach" || props.leisure === "beach") return "beach";
    if (props.military === "bunker" || props.building === "bunker") return "bunker";

    return null;
  },

  isBeachFeatureByText: function (feature) {
    const props = feature.properties || {};
    const text = Object.values(props)
      .filter(value => typeof value === "string")
      .join(" ")
      .toLowerCase();

    return /\b(plage|beach)\b/.test(text);
  },

  getFeatureOsmId: function (feature) {
    const props = feature.properties || {};
    return String(feature.id || props["@id"] || props.id || "");
  },

  isFeatureActif: function (feature) {
    if (feature.activated === true) return true;
    if (feature.activated === false) return false;

    const props = feature.properties || {};
    if (props.activated === true) return true;
    if (props.activated === false) return false;

    return OTA.config.isIdActif(OTA.main.getFeatureOsmId(feature));
  },

  loadPointsFromType: async function (typeKey) {
    try {
      OTA.etat.couchePoints.clearLayers();

      const fileMap = {
        lighthouse: "./json/lighthouse.geojson",
        beach: "./json/beach.geojson",
        bunker: "./json/bunkers.geojson",
      };

      const url = fileMap[typeKey];
      if (!url) {
        OTA.ui.showStatus("Type inconnu");
        return;
      }

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const geo = await resp.json();

      const dep = OTA.departements.findSelected();
      if (!dep) {
        OTA.ui.showStatus("Aucun département sélectionné");
        return;
      }

      const features = (geo.features || []).filter(f => {
        let pointType = OTA.main.getGeoJSONPointType(f);
        if (pointType !== typeKey) {
          if (typeKey === "beach" && (OTA.main.isBeachFeatureByText(f) || url.endsWith("beach.geojson"))) {
            pointType = "beach";
          } else {
            return false;
          }
        }

        if (!f.geometry || f.geometry.type !== "Point") return false;
        const lon = f.geometry.coordinates[0];
        const lat = f.geometry.coordinates[1];
        return OTA.geo.isPointInDepartment(lat, lon, dep);
      });

      const points = features.map((f, idx) => {
        const coords = f.geometry.coordinates;
        return {
          id: OTA.main.getFeatureOsmId(f) || `${typeKey}/${idx}`,
          lat: coords[1],
          lon: coords[0],
          nom: f.properties?.name || f.properties?.nom || "",
          typePoint: typeKey,
          estActif: OTA.main.isFeatureActif(f),
        };
      });

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

  const fileMap = {
    lighthouse: "./json/lighthouse.geojson",
    beach: "./json/beach.geojson",
    bunker: "./json/bunkers.geojson",
  };

  const urlToTypes = {};
  for (let typeKey of types) {
    const url = fileMap[typeKey];
    if (!url) continue;
    urlToTypes[url] = urlToTypes[url] || new Set();
    urlToTypes[url].add(typeKey);
  }

  let allPoints = [];

  for (const url in urlToTypes) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erreur HTTP " + response.status);

      let features;
      if (url.includes("bunkers_all.json")) {
        // Format spécial pour bunkers_all.json
        const bunkersData = await response.json();
        features = bunkersData.map((b, idx) => ({
          id: b.bunker || `bunker/${idx}`,
          geometry: { coordinates: [b.lon, b.lat], type: "Point" },
          properties: {
            name: b.name || b.bunker,
            building: "bunker",
          },
          activated: b.activated,
        }));
      } else {
        const geojson = await response.json();
        features = geojson.features || [];
      }

      const selectedTypes = urlToTypes[url];
      const filtered = [];

      for (let j = 0; j < features.length; j++) {
        const f = features[j];
        if (!f.geometry) continue;

      let featureType = OTA.main.getGeoJSONPointType(f);
      if (selectedTypes.has("beach") && url.endsWith("beach.geojson")) {
        const props = f.properties || {};
        if (
          props.natural === "beach" ||
          props.leisure === "beach" ||
          OTA.main.isBeachFeatureByText(f) ||
          !featureType
        ) {
          featureType = "beach";
        }
      } else if (!featureType && selectedTypes.has("beach") && OTA.main.isBeachFeatureByText(f)) {
        featureType = "beach";
      }

      if (!featureType || !selectedTypes.has(featureType)) continue;

      let lon, lat;

      if (f.geometry.type === "Point") {
        lon = f.geometry.coordinates[0];
        lat = f.geometry.coordinates[1];
      } else if (f.geometry.type === "Polygon") {
          const ring = f.geometry.coordinates[0];
          lon = ring[0][0];
          lat = ring[0][1];
        } else if (f.geometry.type === "MultiPolygon") {
          const ring = f.geometry.coordinates[0][0];
          lon = ring[0][0];
          lat = ring[0][1];
        } else {
          continue;
        }

        if (!OTA.geo.isPointInDepartment(lat, lon, zoneRecherche || dep)) continue;

        filtered.push({
          id: OTA.main.getFeatureOsmId(f) || `${featureType}/${j}`,
          lat: lat,
          lon: lon,
          nom: f.properties?.name || f.properties?.nom || "",
          typePoint: featureType,
          estActif: OTA.main.isFeatureActif(f),
        });
      }

      const pointsFiltres = OTA.pointsOsm.filterByActivation(filtered, filtreActivation);
      allPoints.push(...pointsFiltres);
    } catch (err) {
      OTA.ui.showStatus("Erreur chargement " + url + " : " + err.message);
    }
  }

  if (allPoints.length === 0) {
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
    } else {
      OTA.ui.showStatus("Aucun point trouvé pour les filtres sélectionnés.");
    }
    return;
  }

  const nbActifs = allPoints.filter(point => point.estActif).length;
  const nbInactifs = allPoints.length - nbActifs;

  OTA.carte.showPoints(allPoints, zoneRecherche || dep, "department");
  OTA.ui.showStatus(
    `${allPoints.length} points affichés (${nbActifs} actifs, ${nbInactifs} inactifs).`
  );
},
};

OTA.main.start();
