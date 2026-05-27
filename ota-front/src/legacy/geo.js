export function bboxToText(bbox) {
  return `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
}

export function bboxCenter(bbox) {
  const latCentre = (bbox[0] + bbox[2]) / 2;
  const lonCentre = (bbox[1] + bbox[3]) / 2;
  return [latCentre, lonCentre];
}

export function contourToBbox(contour) {
  if (!contour || !Array.isArray(contour.coordinates)) return null;

  let minLat = Infinity;
  let minLon = Infinity;
  let maxLat = -Infinity;
  let maxLon = -Infinity;

  let polygons = contour.coordinates;
  if (contour.type === "Polygon") polygons = [contour.coordinates];
  else if (contour.type === "MultiPolygon") polygons = contour.coordinates;

  for (let i = 0; i < polygons.length; i += 1) {
    const polygon = polygons[i];
    for (let j = 0; j < polygon.length; j += 1) {
      const ring = polygon[j];
      for (let k = 0; k < ring.length; k += 1) {
        const point = ring[k];
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
}

export function centerToBbox(centre, rayonDeg) {
  const point = extractLonLat(centre);
  if (!point) return null;
  const r = typeof rayonDeg === "number" ? rayonDeg : 0.42;
  return [point.lat - r, point.lon - r, point.lat + r, point.lon + r];
}

export function extractLonLat(centre) {
  if (!centre) return null;
  if (Array.isArray(centre) && centre.length >= 2) return { lon: centre[0], lat: centre[1] };
  if (centre.coordinates && Array.isArray(centre.coordinates)) return { lon: centre.coordinates[0], lat: centre.coordinates[1] };
  if (typeof centre.lon === "number" && typeof centre.lat === "number") return { lon: centre.lon, lat: centre.lat };
  return null;
}

export function isPointInRing(lat, lon, ring) {
  let dedans = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersecte = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersecte) dedans = !dedans;
  }
  return dedans;
}

export function isPointInPolygon(lat, lon, polygon) {
  if (!Array.isArray(polygon) || polygon.length === 0) return false;
  const ringExterieur = polygon[0];
  if (!isPointInRing(lat, lon, ringExterieur)) return false;
  for (let i = 1; i < polygon.length; i += 1) {
    if (isPointInRing(lat, lon, polygon[i])) return false;
  }
  return true;
}

export function isPointInContour(lat, lon, contour) {
  if (!contour || !Array.isArray(contour.coordinates)) return false;
  if (contour.type === "Polygon") return isPointInPolygon(lat, lon, contour.coordinates);
  if (contour.type === "MultiPolygon") {
    for (let i = 0; i < contour.coordinates.length; i += 1) {
      if (isPointInPolygon(lat, lon, contour.coordinates[i])) return true;
    }
  }
  return false;
}

export function isPointInDepartment(lat, lon, departement) {
  if (departement.contour) return isPointInContour(lat, lon, departement.contour);
  if (!departement.bbox) return false;
  return lat >= departement.bbox[0] && lat <= departement.bbox[2] && lon >= departement.bbox[1] && lon <= departement.bbox[3];
}

export function buildDepartmentGeoJson(departement) {
  if (departement.contour && departement.contour.coordinates) {
    return {
      type: "Feature",
      properties: { code: departement.code, nom: departement.nom },
      geometry: departement.contour,
    };
  }
  if (!departement.bbox) return null;
  const minLat = departement.bbox[0];
  const minLon = departement.bbox[1];
  const maxLat = departement.bbox[2];
  const maxLon = departement.bbox[3];
  return {
    type: "Feature",
    properties: { code: departement.code, nom: departement.nom },
    geometry: {
      type: "Polygon",
      coordinates: [[[minLon, minLat], [maxLon, minLat], [maxLon, maxLat], [minLon, maxLat], [minLon, minLat]]],
    },
  };
}
