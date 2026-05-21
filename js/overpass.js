// Requêtes OSM via Overpass
window.OTA = window.OTA || {};

OTA.overpass = {
  buildQuery: function (typesSelectionnes, portee, zoneRecherche) {
    const morceaux = [];
    const timeoutSeconds = portee === "country" ? 60 : 25;

    for (let i = 0; i < typesSelectionnes.length; i += 1) {
      const type = typesSelectionnes[i];
      morceaux.push(OTA.overpass.buildPart(type, portee, zoneRecherche));
    }

    // Include center so ways/relations can be displayed as points.
    return `[out:json][timeout:${timeoutSeconds}];(${morceaux.join("")});out body center;`;
  },

  buildPart: function (type, portee, zoneRecherche) {
    const config = OTA.config.configTypePoint[type];
    const pointTest = OTA.config.pointTest;
    let selecteur = "";

    if (portee === "single") {
      selecteur = `(around:${pointTest.rayonMetres},${pointTest.lat},${pointTest.lon})`;
    } else {
      selecteur = `(${OTA.geo.bboxToText(zoneRecherche.bbox)})`;
    }

    const inclureRelations = portee !== "country";

    const morceaux = [
      `node${selecteur}[${config.tag}];`,
      `way${selecteur}[${config.tag}];`,
    ];

    if (inclureRelations) {
      morceaux.push(`relation${selecteur}[${config.tag}];`);
    }

    return morceaux.join("");
  },

  loadWithRetry: async function (requeteOverpass) {
    const urls = OTA.config.urlsOverpass;
    const cfg = OTA.config.overpass;
    let derniereErreur = new Error("Erreur reseau inconnue.");

    for (let i = 0; i < urls.length; i += 1) {
      const endpoint = urls[i];

      for (let tentative = 1; tentative <= cfg.maxTentativesParEndpoint; tentative += 1) {
        try {
          const reponse = await OTA.overpass.fetchWithTimeout(
            endpoint,
            { method: "POST", body: requeteOverpass },
            cfg.timeoutMs
          );

          if (!reponse.ok) {
            const erreurHttp = new Error(`Erreur HTTP ${reponse.status}`);
            erreurHttp.status = reponse.status;
            throw erreurHttp;
          }

          return await reponse.json();
        } catch (erreur) {
          derniereErreur = erreur;

          const tentativeSuivanteExiste = tentative < cfg.maxTentativesParEndpoint;
          const endpointSuivantExiste = i < urls.length - 1;

          if (!tentativeSuivanteExiste && !endpointSuivantExiste) {
            break;
          }

          const attenteMs = cfg.backoffBaseMs * tentative;
          OTA.ui.showStatus(
            `API OSM lente (tentative ${tentative}). Nouvel essai dans ${Math.round(attenteMs / 1000)}s...`
          );
          await OTA.overpass.wait(attenteMs);
        }
      }
    }

    throw derniereErreur;
  },

  fetchWithTimeout: function (url, options, timeoutMs) {
    const controleur = new AbortController();
    const timeoutId = setTimeout(function () {
      controleur.abort();
    }, timeoutMs);

    return fetch(url, {
      ...options,
      signal: controleur.signal,
    }).finally(function () {
      clearTimeout(timeoutId);
    });
  },

  wait: function (ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  },

  errorMessage: function (erreur) {
    if (!erreur) {
      return "Erreur inconnue.";
    }

    if (erreur.name === "AbortError") {
      return "Timeout reseau. Les serveurs OSM sont peut-etre surcharges.";
    }

    if (typeof erreur.status === "number" && erreur.status === 504) {
      return "Erreur 504 (Gateway Timeout): le serveur OSM n'a pas repondu a temps.";
    }

    if (typeof erreur.status === "number") {
      return `Erreur HTTP ${erreur.status}.`;
    }

    return erreur.message || "Erreur reseau.";
  },
};
