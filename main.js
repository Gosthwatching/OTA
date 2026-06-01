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
  start() {
    if (typeof L === "undefined") {
      document.getElementById("status").textContent =
        "Leaflet non charge.";
      return;
    }

    OTA.main.readDom();
    OTA.carte.init();
    OTA.main.bindEvents();

    OTA.departements.init().catch(err => {
      OTA.ui.showStatus(`Erreur demarrage: ${err.message}`);
    });
  },

  readDom() {
    OTA.etat.dom = {
      champPortee: document.getElementById("scope"),
      champDepartement: document.getElementById("department"),
      champZone: document.getElementById("zone"),
      champActivation: document.getElementById("activation"),
      zoneStatut: document.getElementById("status"),
    };
  },

  bindEvents() {
    document.getElementById("loadBtn").addEventListener("click", OTA.main.loadPoints);
    document.getElementById("locateBtn").addEventListener("click", OTA.geolocalisation.locateMe);
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
    if (props.natural === "beach") return "beach";
    if (props.military === "bunker") return "military_bunker";
    if (props.building === "bunker") return "civil_bunker";

    return null;
  },

  loadPointsFromType: async function (typeKey) {
    try {
      OTA.etat.couchePoints.clearLayers();

      const fileMap = {
        lighthouse: "./json/lighthouse.geojson",
        beach: "./json/beach.geojson",
        military_bunker: "./json/bunkers.geojson",
        civil_bunker: "./json/bunkers.geojson",
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
        const pointType = OTA.main.getGeoJSONPointType(f);
        if (pointType !== typeKey) return false;
        if (!f.geometry || f.geometry.type !== "Point") return false;
        const lon = f.geometry.coordinates[0];
        const lat = f.geometry.coordinates[1];
        return OTA.geo.isPointInDepartment(lat, lon, dep);
      });

      const points = features.map((f, idx) => {
        const coords = f.geometry.coordinates;
        return {
          id: f.id || `${typeKey}/${idx}`,
          lat: coords[1],
          lon: coords[0],
          nom: f.properties?.name || f.properties?.nom || "",
          typePoint: typeKey,
          estActif: OTA.config.idsActifsDemo.has(f.id || ""),
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

  const dep = OTA.departements.findSelected();
  if (!dep) {
    OTA.ui.showStatus("Aucun département sélectionné.");
    return;
  }

  const fileMap = {
    lighthouse: "./json/lighthouse.geojson",
    beach: "./json/beach.geojson",
    military_bunker: "./json/bunkers.geojson",
    civil_bunker: "./json/bunkers.geojson",
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

      const geojson = await response.json();
      const features = geojson.features || [];
      const selectedTypes = urlToTypes[url];
      const filtered = [];

      for (let j = 0; j < features.length; j++) {
        const f = features[j];
        if (!f.geometry) continue;

        const featureType = OTA.main.getGeoJSONPointType(f);
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

        if (!OTA.geo.isPointInDepartment(lat, lon, dep)) continue;

        filtered.push({
          id: f.id || `${featureType}/${j}`,
          lat: lat,
          lon: lon,
          nom: f.properties?.name || f.properties?.nom || "",
          typePoint: featureType,
          estActif: OTA.config.idsActifsDemo.has(f.id || ""),
        });
      }

      const pointsFiltres = OTA.pointsOsm.filterByActivation(filtered, filtreActivation);
      allPoints.push(...pointsFiltres);
    } catch (err) {
      OTA.ui.showStatus("Erreur chargement " + url + " : " + err.message);
    }
  }

  OTA.carte.showPoints(allPoints, dep, "department");
  OTA.ui.showStatus(allPoints.length + " points affichés.");
},
};

OTA.main.start();
