import json

ALL = "json/bunker/bunkers_all.json"
ACTIVATED = "json/bunker/bunker_activated.json"
OUTPUT = "json/bunker/bunkers_all_with_activation.json"

def mark():
    with open(ALL, "r", encoding="utf-8") as f:
        all_bunkers = json.load(f)

    with open(ACTIVATED, "r", encoding="utf-8") as f:
        activated = {b["bunker"] for b in json.load(f)}

    result = []

    for b in all_bunkers:
        result.append({
            "bunker": b["bunker"],
            "name": b["name"],
            "code": b["code"],
            "lat": b["lat"],
            "lon": b["lon"],
            "qth": b["qth"],
            "activated": b["bunker"] in activated
        })

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"✅ Fichier généré : {OUTPUT}")
    print(f"🟢 Bunkers activés : {len(activated)}")
    print(f"⚪ Total bunkers : {len(all_bunkers)}")


if __name__ == "__main__":
    mark()
