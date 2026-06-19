import json

ALL = "json/bunkers_all.json"
ACTIVATED = "json/bunker_activated.json"
OUTPUT = "json/bunkers_merged.json"

def merge():
    with open(ALL, "r", encoding="utf-8") as f:
        all_bunkers = {b["bunker"]: b for b in json.load(f)}

    with open(ACTIVATED, "r", encoding="utf-8") as f:
        activated = json.load(f)

    merged = []

    for act in activated:
        bid = act["bunker"]

        if bid in all_bunkers:
            base = all_bunkers[bid]

            merged.append({
                "bunker": bid,
                "name": base["name"],
                "code": base["code"],
                "lat": base["lat"],
                "lon": base["lon"],
                "qth": base["qth"],
                "activated": True,  # <-- FIX ICI
                "nb_activations": act.get("nb_activations", 0),
                "date": act.get("date", None),
                "call": act.get("call", None)
            })
        else:
            print(f"⚠️ Bunker activé introuvable dans la liste complète : {bid}")

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    print(f"✅ Fusion terminée : {len(merged)} bunkers activés enrichis.")
    print(f"📄 Fichier généré : {OUTPUT}")


if __name__ == "__main__":
    merge()
