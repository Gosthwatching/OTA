import json

FILE_A = "C:\\Users\\Zed\\Desktop\\OTA\\json\\LighthouseWLOTA.json"   # ton ancien fichier
FILE_B = "C:\\Users\\Zed\\Desktop\\OTA\\lighthouses_final.geojson"   # ton nouveau fichier

def load_geojson(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)["features"]

def index_by_pb(features):
    return {f["properties"]["pb"]: f for f in features}

def compare_features(fA, fB):
    """Compare deux features PB identiques et retourne les différences."""
    diffs = {}

    propsA = fA["properties"]
    propsB = fB["properties"]

    for key in propsA:
        if key not in propsB:
            continue
        if propsA[key] != propsB[key]:
            diffs[key] = (propsA[key], propsB[key])

    # Comparaison des coordonnées
    coordsA = fA["geometry"]["coordinates"]
    coordsB = fB["geometry"]["coordinates"]

    if coordsA != coordsB:
        diffs["coordinates"] = (coordsA, coordsB)

    return diffs


def main():
    A = load_geojson(FILE_A)
    B = load_geojson(FILE_B)

    A_index = index_by_pb(A)
    B_index = index_by_pb(B)

    pb_A = set(A_index.keys())
    pb_B = set(B_index.keys())

    missing_in_B = pb_A - pb_B
    new_in_B = pb_B - pb_A
    common = pb_A & pb_B

    print("\n=== PB présents dans A mais absents dans B ===")
    for pb in sorted(missing_in_B):
        print(f" - PB{pb}")

    print("\n=== PB présents dans B mais absents dans A ===")
    for pb in sorted(new_in_B):
        print(f" + PB{pb}")

    print("\n=== PB modifiés ===")
    for pb in sorted(common):
        diffs = compare_features(A_index[pb], B_index[pb])
        if diffs:
            print(f"\nPB{pb} modifié :")
            for field, (old, new) in diffs.items():
                print(f"  * {field} :")
                print(f"      ancien = {old}")
                print(f"      nouveau = {new}")

    print("\n✔ Comparaison terminée.")


if __name__ == "__main__":
    main()
