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

  loadPointsFromType: async function (typeKey) {
    try {
      OTA.etat.couchePoints.clearLayers();

      const fileMap = {
        lighthouse: "./json/lighthouse.geojson",
        beach: "./json/beach.geojson",
        bunkers: "./json/bunkers.geojson",
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
    // test possible
    // OTA.main.loadTestPoint();
    // OTA.main.loadGeoJSONPoint();
    // OTA.main.loadGeoJSONMulti();

    // Exemple : charger les phares filtrés par département
    OTA.main.loadPointsFromType("lighthouse");
  },

  
};

OTA.main.start();
