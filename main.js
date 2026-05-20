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
  demarrer: function () {
    OTA.main.lireDom();
    OTA.carte.init();
    OTA.main.brancherEvenements();
    OTA.departements.initialiser();
  },

  lireDom: function () {
    OTA.etat.dom = {
      champPortee: document.getElementById("scope"),
      champDepartement: document.getElementById("department"),
      champZone: document.getElementById("zone"),
      champActivation: document.getElementById("activation"),
      zoneStatut: document.getElementById("status"),
    };
  },

  brancherEvenements: function () {
    document.getElementById("loadBtn").addEventListener("click", OTA.main.chargerPoints);
    document.getElementById("locateBtn").addEventListener("click", OTA.geolocalisation.meLocaliser);
    OTA.etat.dom.champDepartement.addEventListener("change", OTA.main.onChangementDepartement);
  },

  onChangementDepartement: function () {
    const dep = OTA.departements.trouverChoisi();
    if (dep) {
      OTA.carte.dessinerDepartement(dep);
    }
  },

  chargerPoints: async function () {
    const portee = OTA.etat.dom.champPortee.value;
    const departementChoisi = OTA.departements.trouverChoisi();

    if (!departementChoisi) {
      OTA.ui.afficherStatut("Departement indisponible.");
      return;
    }

    const zoneRecherche = OTA.departements.choisirZoneRecherche(portee, departementChoisi);
    const typesSelectionnes = OTA.ui.lireTypesCoches();

    if (typesSelectionnes.length === 0) {
      OTA.ui.afficherStatut("Selectionne au moins un type.");
      return;
    }

    const requeteOverpass = OTA.overpass.construireRequete(typesSelectionnes, portee, zoneRecherche);

    OTA.ui.afficherStatut("Chargement OSM en cours...");

    try {
      const donnees = await OTA.overpass.chargerAvecReprise(requeteOverpass);
      const elements = donnees.elements || [];

      const points = OTA.pointsOsm.transformer(elements, typesSelectionnes);
      const pointsFiltres = OTA.pointsOsm.filtrerParActivation(
        points,
        OTA.etat.dom.champActivation.value
      );

      OTA.carte.afficherPoints(pointsFiltres, zoneRecherche, portee);
      OTA.ui.afficherStatut(`${pointsFiltres.length} points affiches (${points.length} recuperes).`);
    } catch (erreur) {
      OTA.ui.afficherStatut(`Echec de chargement: ${OTA.overpass.messageErreur(erreur)}`);
    }
  },
};

OTA.main.demarrer();
