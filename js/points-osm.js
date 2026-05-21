// Transformation des données OSM en points affichables
window.OTA = window.OTA || {};

OTA.pointsOsm = {
  transform: function (elementsOsm, typesSelectionnes) {
    const points = [];

    for (let i = 0; i < elementsOsm.length; i += 1) {
      const element = elementsOsm[i];
      const typePoint = OTA.pointsOsm.findType(element);

      if (!typePoint || !typesSelectionnes.includes(typePoint)) {
        continue;
      }

      if (typeof element.lat !== "number" || typeof element.lon !== "number") {
        continue;
      }

      const id = `${element.type}/${element.id}`;
      let nom = "";

      if (element.tags) {
        if (element.tags.name) {
          nom = element.tags.name;
        } else if (element.tags.ref) {
          nom = element.tags.ref;
        }
      }

      points.push({
        id: id,
        lat: element.lat,
        lon: element.lon,
        nom: nom,
        typePoint: typePoint,
        estActif: OTA.config.idsActifsDemo.has(id),
      });
    }

    return points;
  },

  findType: function (element) {
    const tags = element.tags || {};

    if (tags.man_made === "lighthouse") return "lighthouse";
    if (tags.natural === "beach") return "beach";
    if (tags.military === "bunker") return "military_bunker";
    if (tags.building === "bunker") return "civil_bunker";

    return null;
  },

  filterByActivation: function (points, filtreActivation) {
    if (filtreActivation === "activated") {
      return points.filter(function (point) {
        return point.estActif;
      });
    }

    if (filtreActivation === "not-activated") {
      return points.filter(function (point) {
        return !point.estActif;
      });
    }

    return points;
  },
};
