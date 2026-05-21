// Point d'entrée : démarrage et événements
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
  start: function () {
    if (typeof L === "undefined") {
      document.getElementById("status").textContent =
        "Leaflet non charge. Verifie ta connexion internet.";
      return;
    }

    OTA.main.readDom();
    OTA.carte.init();
    OTA.main.bindEvents();

    OTA.departements.init().catch(function (erreur) {
      OTA.ui.showStatus(`Erreur demarrage: ${erreur.message}`);
    });
  },

  readDom: function () {
    OTA.etat.dom = {
      champPortee: document.getElementById("scope"),
      champDepartement: document.getElementById("department"),
      champZone: document.getElementById("zone"),
      champActivation: document.getElementById("activation"),
      zoneStatut: document.getElementById("status"),
    };
  },

  bindEvents: function () {
    document.getElementById("loadBtn").addEventListener("click", OTA.main.loadPoints);
    document.getElementById("locateBtn").addEventListener("click", OTA.geolocalisation.locateMe);
    OTA.etat.dom.champDepartement.addEventListener("change", OTA.main.onDepartmentChange);
  },

  onDepartmentChange: async function () {
    const dep = OTA.departements.findSelected();
    if (!dep) {
      return;
    }

    await OTA.departements.ensureGeometry(dep);

    if (dep.centre) {
      OTA.carte.goTo(dep.centre, dep.zoom || 9);
    }

    OTA.carte.drawDepartment(dep);

    if (!dep.bbox) {
      OTA.ui.showStatus("Ce departement n'a pas encore de bbox.");
    }
  },

  loadPoints: async function () {
    const portee = OTA.etat.dom.champPortee.value;
    let departementChoisi = OTA.departements.findSelected();

    if (portee === "department" && !departementChoisi) {
      OTA.ui.showStatus("Departement indisponible.");
      return;
    }

    if (portee === "department" && OTA.etat.dom.champZone.value !== OTA.config.zoneAtlantique.id) {
      departementChoisi = await OTA.departements.ensureGeometry(departementChoisi);

      if (!departementChoisi.bbox) {
        OTA.ui.showStatus(
          "Geometrie du departement indisponible. Verifie la connexion ou choisis la zone Atlantique."
        );
        return;
      }
    }

    const zoneRecherche = OTA.departements.chooseSearchZone(portee, departementChoisi);

    if (!zoneRecherche) {
      OTA.ui.showStatus("Zone de recherche indisponible pour ce departement.");
      return;
    }

    const typesSelectionnes = OTA.ui.readCheckedTypes();

    if (typesSelectionnes.length === 0) {
      OTA.ui.showStatus("Selectionne au moins un type.");
      return;
    }

    const requeteOverpass = OTA.overpass.buildQuery(typesSelectionnes, portee, zoneRecherche);

    OTA.ui.showStatus("Chargement OSM en cours...");

    try {
      const donnees = await OTA.overpass.loadWithRetry(requeteOverpass);
      const elements = donnees.elements || [];

      const points = OTA.pointsOsm.transform(elements, typesSelectionnes);
      const pointsFiltres = OTA.pointsOsm.filterByActivation(
        points,
        OTA.etat.dom.champActivation.value
      );

      let pointsAffiches = pointsFiltres;

      const estZoneDepartement =
        portee === "department" &&
        departementChoisi &&
        zoneRecherche &&
        zoneRecherche.code === departementChoisi.code;

      if (estZoneDepartement) {
        pointsAffiches = pointsFiltres.filter(function (point) {
          return OTA.geo.isPointInDepartment(point.lat, point.lon, departementChoisi);
        });
      }

      OTA.carte.showPoints(pointsAffiches, zoneRecherche, portee);
      OTA.ui.showStatus(`${pointsAffiches.length} points affiches (${points.length} recuperes).`);
    } catch (erreur) {
      OTA.ui.showStatus(`Echec de chargement: ${OTA.overpass.errorMessage(erreur)}`);
    }
  },
};

OTA.main.start();
