// Transformation des données OSM en points affichables
window.OTA = window.OTA || {};

OTA.pointsOsm = {
  extractCoordinates(element) {
    if (typeof element.lat === "number" && typeof element.lon === "number") {
      return { lat: element.lat, lon: element.lon };
    }

    if (element.center) {
      return { lat: element.center.lat, lon: element.center.lon };
    }

    return null;
  },

  transform(elementsOsm, typesSelectionnes) {
    const points = [];

    for (let element of elementsOsm) {
      const typePoint = OTA.pointsOsm.findType(element);
      if (!typePoint || !typesSelectionnes.includes(typePoint)) continue;

      const coord = OTA.pointsOsm.extractCoordinates(element);
      if (!coord) continue;

      const id = `${element.type}/${element.id}`;
      let nom = element.tags?.name || element.tags?.ref || "";

      points.push({
        id,
        lat: coord.lat,
        lon: coord.lon,
        nom,
        typePoint,
        estActif: OTA.config.idsActifsDemo.has(id),
      });
    }

    return points;
  },

  findType(element) {
    const tags = element.tags || {};

    if (tags.man_made === "lighthouse") return "lighthouse";
    if (tags.natural === "beach") return "beach";
    if (tags.military === "bunker") return "military_bunker";
    if (tags.building === "bunker") return "civil_bunker";

    return null;
  },

  filterByActivation(points, filtreActivation) {
    if (filtreActivation === "activated") {
      return points.filter(p => p.estActif);
    }

    if (filtreActivation === "not-activated") {
      return points.filter(p => !p.estActif);
    }

    return points;
  },
};
