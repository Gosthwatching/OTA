// Chargement et sélection des départements
window.OTA = window.OTA || {};

OTA.departements = {
  sortByCode: function (liste) {
    liste.sort(function (a, b) {
      return String(a.code).localeCompare(String(b.code), "fr", { numeric: true });
    });
  },

  createFromApi: function (depApi) {
    let bbox = OTA.geo.contourToBbox(depApi.contour);

    if (!bbox) {
      bbox = OTA.geo.centerToBbox(depApi.centre, OTA.config.departementRayonBboxDeg);
    }

    let centre = null;
    if (bbox) {
      centre = OTA.geo.bboxCenter(bbox);
    }

    const point = OTA.geo.extractLonLat(depApi.centre);
    if (point) {
      centre = [point.lat, point.lon];
    }

    return {
      code: String(depApi.code),
      nom: depApi.nom,
      bbox: bbox,
      centre: centre,
      zoom: 9,
      contour: depApi.contour || null,
    };
  },

  createFromLocal: function (depLocal) {
    let bbox = depLocal.bbox || null;
    let contour = depLocal.contour || depLocal.geometry || null;

    if (!bbox && contour) {
      bbox = OTA.geo.contourToBbox(contour);
    }

    let centre = null;
    if (bbox) {
      centre = OTA.geo.bboxCenter(bbox);
    }

    return {
      code: String(depLocal.code),
      nom: depLocal.nom,
      bbox: bbox,
      centre: centre,
      zoom: 9,
      contour: contour,
    };
  },

  init: async function () {
    OTA.ui.showStatus("Chargement des departements...");

    let liste = [];
    const protocol = window.location.protocol;
    const canLoadLocal = protocol === "http:" || protocol === "https:";

    if (canLoadLocal) {
      try {
        liste = await OTA.departements.loadLocalList();
      } catch (erreur) {
        OTA.ui.showStatus(`Erreur liste locale: ${erreur.message}`);
      }
    } else {
      OTA.ui.showStatus("Navigation en file:// détectée, chargement des départements depuis l'API distante...");
    }

    if (liste.length === 0) {
      try {
        liste = await OTA.departements.loadRemoteList();
      } catch (erreur) {
        OTA.ui.showStatus(`Erreur liste distante: ${erreur.message}`);
      }
    }

    if (liste.length === 0) {
      liste = OTA.departements.loadConfigList();
    }

    let nbBbox = await OTA.departements.mergeBboxFromFranceGeojson(liste);

    if (nbBbox === 0) {
      nbBbox = await OTA.departements.mergeBboxFromApi(liste);
    }

    OTA.etat.listeDepartements = liste;
    OTA.departements.fillSelect(liste);
    await OTA.departements.chooseDefault();

    const nbSansBbox = OTA.departements.countWithoutBbox(liste);

    if (nbSansBbox > 0) {
      OTA.ui.showStatus(
        `${liste.length} departements (${nbBbox} bbox). ${nbSansBbox} sans bbox: lance le site avec "python -m http.server 8080".`
      );
      return;
    }

    OTA.ui.showStatus(`${liste.length} departements charges avec bbox.`);
  },

  loadLocalList: async function () {
    const brut = await OTA.departements.loadFromJson();
    const listeBrute = OTA.departements.normalizeDepartmentsJson(brut);
    const resultat = [];

    for (let i = 0; i < listeBrute.length; i += 1) {
      resultat.push(OTA.departements.createFromLocal(listeBrute[i]));
    }

    OTA.departements.sortByCode(resultat);
    return resultat;
  },

  normalizeDepartmentsJson: function (brut) {
    if (Array.isArray(brut)) {
      return brut;
    }

    if (brut && brut.type === "FeatureCollection" && Array.isArray(brut.features)) {
      const resultat = [];

      for (let i = 0; i < brut.features.length; i += 1) {
        const feature = brut.features[i];
        const props = feature.properties || {};

        resultat.push({
          code: props.code,
          nom: props.nom,
          geometry: feature.geometry,
        });
      }

      return resultat;
    }

    return [];
  },

  loadConfigList: function () {
    const resultat = [];
    const liste = OTA.config.departementsFallback || [];

    for (let i = 0; i < liste.length; i += 1) {
      resultat.push(OTA.departements.createFromLocal(liste[i]));
    }

    return resultat;
  },

  loadRemoteList: async function () {
    const reponse = await fetch(OTA.config.urlApiDepartements);
    if (!reponse.ok) {
      throw new Error(`Erreur HTTP ${reponse.status}`);
    }

    const listeApi = await reponse.json();
    const resultat = [];

    for (let i = 0; i < listeApi.length; i += 1) {
      resultat.push(OTA.departements.createFromApi(listeApi[i]));
    }

    OTA.departements.sortByCode(resultat);
    return resultat;
  },

  mergeBboxFromFranceGeojson: async function (liste) {
    try {
      const reponse = await fetch(OTA.config.urlGeojsonFranceBbox);
      if (!reponse.ok) {
        throw new Error(`HTTP ${reponse.status}`);
      }

      const geo = await reponse.json();
      if (!geo.features || !Array.isArray(geo.features)) {
        return 0;
      }

      const parCode = {};

      for (let i = 0; i < geo.features.length; i += 1) {
        const feature = geo.features[i];
        const props = feature.properties || {};
        const code = String(props.code || "").trim();

        if (!code) continue;

        const bbox = OTA.geo.contourToBbox(feature.geometry);
        if (!bbox) continue;

        parCode[code] = {
          bbox: bbox,
          centre: OTA.geo.bboxCenter(bbox),
          contour: feature.geometry,
          nom: props.nom,
        };
      }

      return OTA.departements.applyBboxByCode(liste, parCode);
    } catch (_erreur) {
      return 0;
    }
  },

  mergeBboxFromApi: async function (liste) {
    try {
      const reponse = await fetch(OTA.config.urlApiDepartements);
      if (!reponse.ok) {
        return 0;
      }

      const listeApi = await reponse.json();
      const parCode = {};

      for (let i = 0; i < listeApi.length; i += 1) {
        const dep = OTA.departements.createFromApi(listeApi[i]);
        if (dep.bbox) {
          parCode[dep.code] = {
            bbox: dep.bbox,
            centre: dep.centre,
            contour: dep.contour,
            nom: dep.nom,
          };
        }
      }

      return OTA.departements.applyBboxByCode(liste, parCode);
    } catch (_erreur) {
      return 0;
    }
  },

  applyBboxByCode: function (liste, parCode) {
    let nb = 0;

    for (let i = 0; i < liste.length; i += 1) {
      const dep = liste[i];
      const enrichi = parCode[dep.code];

      if (!enrichi) continue;

      dep.bbox = enrichi.bbox;
      dep.centre = enrichi.centre;
      dep.contour = enrichi.contour;

      if (enrichi.nom) {
        dep.nom = enrichi.nom;
      }

      nb += 1;
    }

    if (dep.code === "75") {
      dep.bbox = [48.80, 2.25, 48.92, 2.42]; // bbox propre de Paris
    }

    return nb;
  },

  countWithoutBbox: function (liste) {
    let nb = 0;

    for (let i = 0; i < liste.length; i += 1) {
      if (!liste[i].bbox) {
        nb += 1;
      }
    }

    return nb;
  },

  loadFromJson: async function () {
    const reponse = await fetch(OTA.config.urlDepartementsJson);
    if (!reponse.ok) {
      throw new Error(`Erreur HTTP ${reponse.status}`);
    }
    return reponse.json();
  },

  loadDetailFromApi: async function (codeDepartement) {
    const url = `${OTA.config.urlApiDepartementParCodeBase}/${encodeURIComponent(codeDepartement)}?fields=code,nom,centre,contour`;
    const reponse = await fetch(url);

    if (!reponse.ok) {
      throw new Error(`Erreur HTTP ${reponse.status}`);
    }

    const dep = await reponse.json();
    return OTA.departements.createFromApi(dep);
  },

  ensureGeometry: async function (departement) {
    if (!departement || departement.bbox) {
      return departement;
    }

    OTA.ui.showStatus(`Chargement geometrie ${departement.code}...`);

    await OTA.departements.mergeBboxFromFranceGeojson([departement]);

    if (departement.bbox) {
      return departement;
    }

    try {
      const depEnrichi = await OTA.departements.loadDetailFromApi(departement.code);

      departement.nom = depEnrichi.nom;
      departement.bbox = depEnrichi.bbox;
      departement.centre = depEnrichi.centre;
      departement.contour = depEnrichi.contour;
    } catch (_erreur) {
      OTA.ui.showStatus(
        "Impossible de charger la bbox. Utilise un serveur local: python -m http.server 8080"
      );
    }

    return departement;
  },

  fillSelect: function (liste) {
    const select = OTA.etat.dom.champDepartement;
    select.innerHTML = "";

    for (let i = 0; i < liste.length; i += 1) {
      const dep = liste[i];
      const option = document.createElement("option");
      option.value = dep.code;
      option.textContent = `${dep.code} - ${dep.nom}`;
      select.appendChild(option);
    }

    const event = new CustomEvent('dropdown:optionsChanged', { bubbles: true });
    select.dispatchEvent(event);
  },

  chooseDefault: async function () {
    const liste = OTA.etat.listeDepartements;

    if (liste.length === 0) {
      OTA.ui.showStatus("Aucun departement disponible.");
      return;
    }

    let depParDefaut = liste[0];

    for (let i = 0; i < liste.length; i += 1) {
      if (liste[i].code === "75") {
        depParDefaut = liste[i];
        break;
      }
    }


    OTA.etat.dom.champDepartement.value = depParDefaut.code;
    await OTA.departements.ensureGeometry(depParDefaut);

    if (depParDefaut.code === "75") {
        OTA.carte.goTo([48.8566, 2.3522], 12);
    } else if (depParDefaut.centre) {
        OTA.carte.goTo(depParDefaut.centre, depParDefaut.zoom || 9);
    } else if (depParDefaut.bbox) {
        OTA.carte.fitBbox(depParDefaut.bbox);
    }
    OTA.carte.drawDepartment(depParDefaut);
  },

  findSelected: function () {
    const code = OTA.etat.dom.champDepartement.value;
    const liste = OTA.etat.listeDepartements;

    for (let i = 0; i < liste.length; i += 1) {
      if (liste[i].code === code) {
        return liste[i];
      }
    }

    return null;
  },

  chooseSearchZone: function (portee, departementChoisi) {
    if (portee === "single") {
      return OTA.config.pointTest;
    }

    if (portee === "country") {
      return OTA.config.zoneFrance;
    }

    if (portee === OTA.config.zoneAtlantique.id) {
      return OTA.config.zoneAtlantique;
    }

    if (!departementChoisi || !departementChoisi.bbox) {
      return null;
    }

    return departementChoisi;
  },
};
