// Calculs géographiques : bbox, contours GeoJSON
window.OTA = window.OTA || {};

OTA.geo = {
  bboxToText: function (bbox) {
    return `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
  },

  bboxCenter: function (bbox) {
    const latCentre = (bbox[0] + bbox[2]) / 2;
    const lonCentre = (bbox[1] + bbox[3]) / 2;
    return [latCentre, lonCentre];
  },

  contourToBbox: function (contour) {
    if (!contour || !Array.isArray(contour.coordinates)) {
      return null;
    }

    let minLat = Infinity;
    let minLon = Infinity;
    let maxLat = -Infinity;
    let maxLon = -Infinity;

    let polygons = contour.coordinates;

    if (contour.type === "Polygon") {
      polygons = [contour.coordinates];
    } else if (contour.type === "MultiPolygon") {
      polygons = contour.coordinates;
    }

    for (let i = 0; i < polygons.length; i += 1) {
      const polygon = polygons[i];

      for (let j = 0; j < polygon.length; j += 1) {
        const ring = polygon[j];

        for (let k = 0; k < ring.length; k += 1) {
          const point = ring[k];

          if (!Array.isArray(point) || point.length < 2) {
            continue;
          }

          const lon = point[0];
          const lat = point[1];

          if (lat < minLat) minLat = lat;
          if (lon < minLon) minLon = lon;
          if (lat > maxLat) maxLat = lat;
          if (lon > maxLon) maxLon = lon;
        }
      }
    }

    if (!Number.isFinite(minLat)) {
      return null;
    }

    return [minLat, minLon, maxLat, maxLon];
  },

  centerToBbox: function (centre, rayonDeg) {
    const point = OTA.geo.extractLonLat(centre);
    if (!point) {
      return null;
    }

    const r = typeof rayonDeg === "number" ? rayonDeg : OTA.config.departementRayonBboxDeg;
    return [point.lat - r, point.lon - r, point.lat + r, point.lon + r];
  },

  extractLonLat: function (centre) {
    if (!centre) {
      return null;
    }

    if (Array.isArray(centre) && centre.length >= 2) {
      return { lon: centre[0], lat: centre[1] };
    }

    if (centre.coordinates && Array.isArray(centre.coordinates)) {
      return { lon: centre.coordinates[0], lat: centre.coordinates[1] };
    }

    if (typeof centre.lon === "number" && typeof centre.lat === "number") {
      return { lon: centre.lon, lat: centre.lat };
    }

    return null;
  },

  buildDepartmentGeoJson: function (departement) {
    if (departement.contour && departement.contour.coordinates) {
      return {
        type: "Feature",
        properties: {
          code: departement.code,
          nom: departement.nom,
        },
        geometry: departement.contour,
      };
    }

    if (!departement.bbox) {
      return null;
    }

    const minLat = departement.bbox[0];
    const minLon = departement.bbox[1];
    const maxLat = departement.bbox[2];
    const maxLon = departement.bbox[3];

    return {
      type: "Feature",
      properties: {
        code: departement.code,
        nom: departement.nom,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [minLon, minLat],
            [maxLon, minLat],
            [maxLon, maxLat],
            [minLon, maxLat],
            [minLon, minLat],
          ],
        ],
      },
    };
  },
};
