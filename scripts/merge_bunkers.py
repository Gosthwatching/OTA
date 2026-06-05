#!/usr/bin/env python3
"""Fusionner bunkers activés et non-activés dans un seul fichier."""

import json
from pathlib import Path

activated_path = Path("json/bunker_activated.json")
non_activated_path = Path("json/bunkers_non_activates.json")
output_path = Path("json/bunkers_all.json")

with activated_path.open("r", encoding="utf-8") as f:
    activated_data = json.load(f)

with non_activated_path.open("r", encoding="utf-8") as f:
    non_activated_data = json.load(f)

# Ajouter le statut à chaque bunker
all_bunkers = []

for bunker in activated_data:
    all_bunkers.append({
        "bunker": bunker.get("Bunker", ""),
        "activated": True,
        "nb_activations": bunker.get("'Nb Activations'", 0),
        "date": bunker.get("Date", ""),
        "call": bunker.get("Call", ""),
        "lat": None,
        "lon": None,
        "qth": None,
        "name": "",
    })

for bunker in non_activated_data:
    all_bunkers.append({
        "bunker": bunker.get("bunker", ""),
        "activated": False,
        "lat": bunker.get("lat"),
        "lon": bunker.get("lon"),
        "qth": bunker.get("qth"),
        "name": bunker.get("name", ""),
        "line_number": bunker.get("line_number"),
    })

output_path.parent.mkdir(parents=True, exist_ok=True)
with output_path.open("w", encoding="utf-8") as f:
    json.dump(all_bunkers, f, indent=2, ensure_ascii=False)

print(f"Écrit {len(all_bunkers)} bunkers dans {output_path}")
print(f"  - Activés: {len(activated_data)}")
print(f"  - Non-activés: {len(non_activated_data)}")
