// Calculs géographiques : bbox, contours GeoJSON
window.OTA = window.OTA || {};

OTA.geo = {
  bboxToText(bbox) {
    return `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
  },

  bboxCenter(bbox) {
    return [
      (bbox[0] + bbox[2]) / 2,
      (bbox[1] + bbox[3]) / 2,
    ];
  },

  contourToBbox(contour) {
    if (!contour || !Array.isArray(contour.coordinates)) return null;

    let minLat = Infinity, minLon = Infinity;
    let maxLat = -Infinity, maxLon = -Infinity;

    let polygons = contour.type === "Polygon"
      ? [contour.coordinates]
      : contour.coordinates;

    for (let polygon of polygons) {
      for (let ring of polygon) {
        for (let point of ring) {
          if (!Array.isArray(point) || point.length < 2) continue;

          const lon = point[0];
          const lat = point[1];

          if (lat < minLat) minLat = lat;
          if (lon < minLon) minLon = lon;
          if (lat > maxLat) maxLat = lat;
          if (lon > maxLon) maxLon = lon;
        }
      }
    }

    if (!Number.isFinite(minLat)) return null;

    return [minLat, minLon, maxLat, maxLon];
  },

  centerToBbox(centre, rayonDeg) {
    const point = OTA.geo.extractLonLat(centre);
    if (!point) return null;

    const r = rayonDeg ?? OTA.config.departementRayonBboxDeg;
    return [point.lat - r, point.lon - r, point.lat + r, point.lon + r];
  },

  extractLonLat(centre) {
    if (!centre) return null;

    if (Array.isArray(centre)) {
      return { lon: centre[0], lat: centre[1] };
    }

    if (centre.coordinates) {
      return { lon: centre.coordinates[0], lat: centre.coordinates[1] };
    }

    if (typeof centre.lon === "number" && typeof centre.lat === "number") {
      return { lon: centre.lon, lat: centre.lat };
    }

    return null;
  },

  isPointInRing(lat, lon, ring) {
    let dedans = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];

      const intersecte =
        yi > lat !== yj > lat &&
        lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersecte) dedans = !dedans;
    }

    return dedans;
  },

  isPointInPolygon(lat, lon, polygon) {
    if (!polygon.length) return false;

    if (!OTA.geo.isPointInRing(lat, lon, polygon[0])) return false;

    for (let i = 1; i < polygon.length; i++) {
      if (OTA.geo.isPointInRing(lat, lon, polygon[i])) return false;
    }

    return true;
  },

  isPointInContour(lat, lon, contour) {
    if (!contour?.coordinates) return false;

    if (contour.type === "Polygon") {
      return OTA.geo.isPointInPolygon(lat, lon, contour.coordinates);
    }

    if (contour.type === "MultiPolygon") {
      return contour.coordinates.some(poly =>
        OTA.geo.isPointInPolygon(lat, lon, poly)
      );
    }

    return false;
  },

  isPointInDepartment(lat, lon, departement) {
    if (departement.contour) {
      return OTA.geo.isPointInContour(lat, lon, departement.contour);
    }

    if (!departement.bbox) return false;

    return (
      lat >= departement.bbox[0] &&
      lat <= departement.bbox[2] &&
      lon >= departement.bbox[1] &&
      lon <= departement.bbox[3]
    );
  },

  buildDepartmentGeoJson(departement) {
    if (departement.contour) {
      return {
        type: "Feature",
        properties: { code: departement.code, nom: departement.nom },
        geometry: departement.contour,
      };
    }

    if (!departement.bbox) return null;

    const [minLat, minLon, maxLat, maxLon] = departement.bbox;

    return {
      type: "Feature",
      properties: { code: departement.code, nom: departement.nom },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ]],
      },
    };
  },
};
