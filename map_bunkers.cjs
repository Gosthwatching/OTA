const fs = require("fs");

// Charger les fichiers
const bunkersOSM = JSON.parse(fs.readFileSync("./json/bunkers.geojson", "utf8"));
const bunkersFBOTA = JSON.parse(fs.readFileSync("./json/bunker_activated.json", "utf8"));

// Fonction distance simple (Haversine)
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // mètres
  const toRad = x => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Extraire les bunkers OSM sous forme simple
const osmList = bunkersOSM.features
  .filter(f => f.geometry && f.geometry.type === "Polygon")
  .map(f => {
    const coords = f.geometry.coordinates[0][0]; // premier point du polygone
    return {
      osmId: f.id,
      lat: coords[1],
      lon: coords[0]
    };
  });

// Faire le mapping
const result = [];

for (const fb of bunkersFBOTA) {
  let best = null;
  let bestDist = Infinity;

  for (const osm of osmList) {
    const d = distance(fb.lat, fb.lon, osm.lat, osm.lon);
    if (d < bestDist) {
      bestDist = d;
      best = osm;
    }
  }

  // Si distance < 80m → on considère que c'est le même bunker
  if (best && bestDist < 80) {
    result.push({
      osmId: best.osmId,
      bunker: fb.bunker,
      lat: best.lat,
      lon: best.lon,
      activated: true
    });
  }
}

// Sauvegarder le résultat
fs.writeFileSync("./json/bunkers_mapped.json", JSON.stringify(result, null, 2));

console.log("Mapping terminé :", result.length, "bunkers associés.");
