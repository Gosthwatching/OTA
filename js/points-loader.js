window.OTA = window.OTA || {};

OTA.pointsLoader = {
  getTypeFileMap: function () {
    return {
      lighthouse: "./json/lighthouse.geojson",
      beach: "./json/beach.geojson",
      bunker: "./json/bunker/bunkers_all_with_activation.json",
    };
  },

  buildUrlToTypes: function (types, fileMap) {
    const urlToTypes = {};

    for (const typeKey of types) {
      const url = fileMap[typeKey];
      if (!url) continue;
      urlToTypes[url] = urlToTypes[url] || new Set();
      urlToTypes[url].add(typeKey);
    }

    return urlToTypes;
  },

  getGeoJSONPointType: function (feature) {
    const props = feature.properties || {};

    if (props.man_made === "lighthouse") return "lighthouse";
    if (props.natural === "beach" || props.leisure === "beach") return "beach";
    if (props.military === "bunker" || props.building === "bunker") return "bunker";

    return null;
  },

  isBeachFeatureByText: function (feature) {
    const props = feature.properties || {};
    const text = Object.values(props)
      .filter(value => typeof value === "string")
      .join(" ")
      .toLowerCase();

    return /\b(plage|beach)\b/.test(text);
  },

  getFeatureOsmId: function (feature) {
    const props = feature.properties || {};
    return String(feature.id || props["@id"] || props.id || "");
  },

  isFeatureActif: function (feature) {
    if (feature.activated === true) return true;
    if (feature.activated === false) return false;

    const props = feature.properties || {};
    if (props.activated === true) return true;
    if (props.activated === false) return false;

    return OTA.config.isIdActif(OTA.pointsLoader.getFeatureOsmId(feature));
  },

  fetchFeaturesForUrl: async function (url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erreur HTTP " + response.status);

    if (url.includes("bunkers_all_with_activation.json")) {
      const bunkersData = await response.json();
      return bunkersData.map((b, idx) => ({
        id: b.bunker || `bunker/${idx}`,
        geometry: { coordinates: [b.lon, b.lat], type: "Point" },
        properties: {
          name: b.name || b.bunker,
          building: "bunker",
        },
        activated: b.activated,
      }));
    }

    const geojson = await response.json();
    return geojson.features || [];
  },

  resolveFeatureType: function (feature, url, selectedTypes) {
    let featureType = OTA.pointsLoader.getGeoJSONPointType(feature);

    if (url.includes("bunkers_all_with_activation.json")) {
      featureType = "bunker";
    }

    if (selectedTypes.has("beach") && url.endsWith("beach.geojson")) {
      const props = feature.properties || {};
      if (
        props.natural === "beach" ||
        props.leisure === "beach" ||
        OTA.pointsLoader.isBeachFeatureByText(feature) ||
        !featureType
      ) {
        featureType = "beach";
      }
    } else if (!featureType && selectedTypes.has("beach") && OTA.pointsLoader.isBeachFeatureByText(feature)) {
      featureType = "beach";
    }

    return featureType;
  },

  getFeatureCoordinates: function (feature) {
    if (!feature.geometry) return null;

    if (feature.geometry.type === "Point") {
      return {
        lon: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1],
      };
    }

    if (feature.geometry.type === "Polygon") {
      const ring = feature.geometry.coordinates[0];
      return {
        lon: ring[0][0],
        lat: ring[0][1],
      };
    }

    if (feature.geometry.type === "MultiPolygon") {
      const ring = feature.geometry.coordinates[0][0];
      return {
        lon: ring[0][0],
        lat: ring[0][1],
      };
    }

    return null;
  },

  toPoint: function (feature, featureType, index) {
    const coords = OTA.pointsLoader.getFeatureCoordinates(feature);
    if (!coords) return null;

    return {
      id: OTA.pointsLoader.getFeatureOsmId(feature) || `${featureType}/${index}`,
      lat: coords.lat,
      lon: coords.lon,
      nom: feature.properties?.name || feature.properties?.nom || "",
      typePoint: featureType,
      estActif: OTA.pointsLoader.isFeatureActif(feature),
    };
  },

  collectPointsForUrl: async function (url, selectedTypes, zoneRecherche, dep, filtreActivation) {
    const features = await OTA.pointsLoader.fetchFeaturesForUrl(url);
    const filtered = [];

    for (let j = 0; j < features.length; j++) {
      const feature = features[j];
      const featureType = OTA.pointsLoader.resolveFeatureType(feature, url, selectedTypes);
      if (!featureType || !selectedTypes.has(featureType)) continue;

      const coords = OTA.pointsLoader.getFeatureCoordinates(feature);
      if (!coords) continue;

      if (!OTA.geo.isPointInDepartment(coords.lat, coords.lon, zoneRecherche || dep)) continue;

      const point = OTA.pointsLoader.toPoint(feature, featureType, j);
      if (!point) continue;

      filtered.push(point);
    }

    return OTA.pointsOsm.filterByActivation(filtered, filtreActivation);
  },
};
