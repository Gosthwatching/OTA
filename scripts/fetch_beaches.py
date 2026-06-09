#!/usr/bin/env python3
"""Fetch beaches from Overpass and write json/beach.geojson."""

import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

QUERY = """
[out:json][timeout:120];
area["ISO3166-1"="FR"][admin_level=2]->.fr;
(
  node(area.fr)["natural"="beach"];
  way(area.fr)["natural"="beach"];
  relation(area.fr)["natural"="beach"];
  node(area.fr)["leisure"="beach"];
  way(area.fr)["leisure"="beach"];
);
out body center;
"""

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def element_to_feature(element):
    tags = element.get("tags", {})
    osm_type = element["type"]
    osm_id = element["id"]
    osm_ref = f"{osm_type}/{osm_id}"

    if osm_type == "node":
        lon, lat = element["lon"], element["lat"]
    else:
        center = element.get("center")
        if not center:
            return None
        lon, lat = center["lon"], center["lat"]

    properties = dict(tags)
    properties["@id"] = osm_ref
    if osm_type != "node":
        properties["@geometry"] = "center"

    return {
        "type": "Feature",
        "properties": properties,
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "id": osm_ref,
    }


def fetch_overpass():
    last_error = None
    for endpoint in ENDPOINTS:
        try:
            req = urllib.request.Request(
                endpoint,
                data=QUERY.encode("utf-8"),
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                return json.loads(resp.read())
        except Exception as exc:
            last_error = exc
            print(f"Failed {endpoint}: {exc}")
    raise SystemExit(f"All Overpass endpoints failed: {last_error}")


def main():
    data = fetch_overpass()
    features = []
    seen = set()

    for element in data.get("elements", []):
        feature = element_to_feature(element)
        if not feature:
            continue
        if feature["id"] in seen:
            continue
        seen.add(feature["id"])
        features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "generator": "scripts/fetch_beaches.py",
        "copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "features": features,
    }

    output = Path("json/beach.geojson")
    output.write_text(json.dumps(geojson, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(features)} beaches to {output}")


if __name__ == "__main__":
    main()
