#!/usr/bin/env python3
"""Simple script pour produire un JSON des bunkers non activés."""

import json
import re
from pathlib import Path

bunker_re = re.compile(r"B/F-\d{4,5}")
coord_re = re.compile(r"\s(-?\d{1,2}[.,]\d+)\s+(-?\d{1,3}[.,]\d+)\s+([A-X]{2}\d{2}[A-X]{2})")
qth_re = re.compile(r"[A-X]{2}[0-9]{2}[A-X]{2}")

demo_path = Path("scripts/demo.txt")
activated_path = Path("json/bunker_activated.json")
output_path = Path("json/bunkers_non_activates.json")

if not demo_path.exists():
    raise SystemExit(f"Fichier introuvable: {demo_path}")
if not activated_path.exists():
    raise SystemExit(f"Fichier introuvable: {activated_path}")

with demo_path.open("r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

with activated_path.open("r", encoding="utf-8") as f:
    activated_data = json.load(f)

activated_codes = set()
for item in activated_data:
    code = item.get("Bunker") or item.get("bunker")
    if code:
        activated_codes.add(code.strip().upper())

missing = {}
for line_number, line in enumerate(lines, start=1):
    bunker_match = bunker_re.search(line)
    if not bunker_match:
        continue

    bunker_code = bunker_match.group(0).upper()
    if bunker_code in activated_codes:
        continue

    lat = None
    lon = None
    qth = None
    name = ""

    coord_match = coord_re.search(line)
    if coord_match:
        lat_text = coord_match.group(1).replace(",", ".")
        try:
            lat = float(lat_text)
        except ValueError:
            lat = None
        lon_text = coord_match.group(2).replace(",", ".")
        try:
            lon = float(lon_text)
        except ValueError:
            lon = None
        qth = coord_match.group(3)
        name = line[bunker_match.end(): coord_match.start()].strip(" ,;")
    else:
        qth_match = qth_re.search(line)
        if qth_match:
            qth = qth_match.group(0)

    if bunker_code not in missing:
        missing[bunker_code] = {
            "bunker": bunker_code,
            "name": name,
            "lat": lat,
            "lon": lon,
            "qth": qth,
            "line_number": line_number,
        }

missing_list = list(missing.values())
output_path.parent.mkdir(parents=True, exist_ok=True)
with output_path.open("w", encoding="utf-8") as f:
    json.dump(missing_list, f, indent=2, ensure_ascii=False)

print(f"Écrit {len(missing_list)} bunkers non activés dans {output_path}")
