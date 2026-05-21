// Constantes et réglages de l'application
window.OTA = window.OTA || {};

OTA.config = {
  urlsOverpass: [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
  ],
  urlApiDepartements:
    "https://geo.api.gouv.fr/departements?fields=code,nom,centre",
  urlApiDepartementParCodeBase: "https://geo.api.gouv.fr/departements",
  urlDepartementsJson: "./json/departements.geojson",
  // GeoJSON France avec vraies géométries (bbox calculées automatiquement)
  urlGeojsonFranceBbox:
    "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson",
  departementRayonBboxDeg: 0.42,
  overpass: {
    timeoutMs: 30000,
    maxTentativesParEndpoint: 2,
    backoffBaseMs: 1200,
  },
  
  zoneFrance: {
    id: "france",
    nom: "France entière",
    bbox: [41.3, -5.3, 51.1, 9.6],
    centre: [46.5, 2.5],
    zoom: 5,
  },

  zoneAtlantique: {
    id: "atlantic",
    nom: "Facade atlantique (FR)",
    bbox: [42.9, -5.3, 48.95, -0.8],
    centre: [46.2, -2.5],
    zoom: 6,
  },
  pointTest: {
    lat: 47.323,
    lon: -2.506,
    rayonMetres: 2500,
  },
  idsActifsDemo: new Set(["node/3999631495", "way/15252233"]),
  configTypePoint: {
    lighthouse: { nom: "Phare", couleur: "#921e28", tag: '"man_made"="lighthouse"' },
    beach: { nom: "Plage", couleur: "#d3d60c", tag: '"natural"="beach"' },
    military_bunker: { nom: "Military Bunker", couleur: "#5a865d", tag: '"military"="bunker"' },
    civil_bunker: { nom: "Civil Bunker", couleur: "#2cf8f8", tag: '"building"="bunker"' },
  },
};
