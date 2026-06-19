const fs = require("fs");

// Charger les fichiers
const bunkersOSM = JSON.parse(fs.readFileSync("./json/bunkers.geojson", "utf8"));
const bunkersFBOTA = JSON.parse(fs.readFileSync("./json/bunker_activated.json", "utf8"));

// Fonction pour normaliser les IDs (garde uniquement les chiffres)
function normalize(id) {
  return id.replace(/[^0-9]/g, "");
}

// Extraire les bunkers OSM sous forme simple
const osmList = bunkersOSM.features
  .filter(f => f.geometry && f.geometry.type === "Polygon")
  .map(f => {
    const coords = f.geometry.coordinates[0][0]; // premier point du polygone
    return {
      osmId: f.id,
      bunkerId: normalize(f.id), // normalisation de l'ID OSM
      lat: coords[1],
      lon: coords[0]
    };
  });

// Faire le mapping par ID
const result = [];

for (const fb of bunkersFBOTA) {
  const fbId = normalize(fb.bunker);

  const match = osmList.find(o => o.bunkerId === fbId);

  if (match) {
    result.push({
      osmId: match.osmId,
      bunker: fb.bunker,
      lat: match.lat,
      lon: match.lon,
      activated: true
    });
  }
}

// Sauvegarder le résultat
fs.writeFileSync("./json/bunkers_mapped.json", JSON.stringify(result, null, 2));

console.log("Mapping terminé :", result.length, "bunkers associés.");
