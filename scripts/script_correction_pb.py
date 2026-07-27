import json

# TABLE DE CORRESPONDANCE PB OFFICIELS DPLF
PB_MAP = {
    "La Pyramide": 1,
    "Ile aux Moutons": 3,
    "Ile Louet": 5,
    "Ile Vierge": 7,
    "Le Four": 11,
    "Ar Men": 12,
    "Tevennec": 13,
    "Men Tensel - Kereon": 14,
    "La Jument": 22,
    "La Vieille": 26,
    "Les Pierres Noires": 33,
    "Ile de Penfret": 38,
    "Ile Wrac'h": 40,
    "Nividic": 42,
    "Ile Noire": 61,
    "Ile Tristan": 63,
    "Corn Carhai": 65,
    "La Lande": 93,
    "Ile de Batz": 94,
    "Roscoff Rear": 95,
    "Pontusval - Pointe de Beg Pol": 96,
    "Pointe de Creac'h": 97,
    "Le Stiff": 99,
    "Saint Mathieu": 100,
    "Lochrist": 101,
    "Trezien": 102,
    "Kermorvan": 103,
    "Pointe de Morgat": 104,
    "Pointe du Millier": 105,
    "Ile de Sein - Grand Phare": 106,
    "Trevignon Jetée": 108,
    "Pointe du Toulinguet": 109,
    "Pointe du Petit Minou": 110,
    "Pointe du Portzic": 111,
    "Pointe de Lervily": 112,
    "Pointe de Penmarc'h": 114,
    "Le Guilvinec - Rear": 116,
    "Pointe de Langoz": 117,
    "La Croix": 120,
    "Lanvaon - Rear": 150,
    "Bloscon - Jetée": 153,
    "Aber Ildut": 157,
    "Pointe de Corsen": 162,
    "Kergadec": 165,
    "Doelan Aval": 191,
    "Doelan Amont": 203,
    "Men Brial": 218,
    "Port Manec'h - Beg Ar Vechen": 268,
    "Raoulic - Jetée - Audierne": 276,
    "Pors Poulhan": 277,
    "Lost Moan": 279,
    "Guilvinec - Entrée Nord - Môle en Epi": 280,
    "Trescadec - Audierne": 281,
    "Pointe de Combrit": 295,
    "Port du Stiff - Môle Est": 296,
    "Mogueriec - Front": 340,
    "Beuzec": 347,
    "Baie de Pouldohan": 382,
    "Lanriec": 393,
    "Pointe du Coq": 401,
    "Men Guen Bras": 410,
    "Trevignon - Shelter": 412,
    "Leading light - Aber Wrac'h": 413,
    "Portsall": 414,
    "Men Korn": 415,
    "Les Trois Pierres": 416,
    "Ile Molene - jetée": 417,
    "Saint Mathieu - Feu Auxilliaire": 418,
    "Camaret sur Mer - Môle Nord": 419,
    "Roche Mengam": 420,
    "Brest Range Front": 422,
    "Brest Range Rear": 424,
    "Le Chat": 425,
    "La Plate": 426,
    "Mole de Lechiagat - Entrance range Front": 428,
    "locarec Rocher": 429,
    "Mole de Lechiagat - Middle": 431,
    "Men Ar Groas - Lesconil": 432,
    "Le Cochon": 435,
    "Ile Pigued - Ar Chaden": 436,
    "Brigneau": 437,
    "Passage de Lanriec - Ville close": 443,
    "Ile d'Ouessant": 1002,
    "Ile de Sein": 1003,
    "Ile de Batz": 1010,
    "Ile Molene": 1016
}

# CHARGER TON GEOJSON
with open("department_29.geojson", "r", encoding="utf-8") as f:
    data = json.load(f)

# CORRIGER CHAQUE FEATURE
for feature in data["features"]:
    nom = feature["properties"]["nom"]
    if nom in PB_MAP:
        pb_correct = PB_MAP[nom]
        feature["properties"]["pb"] = pb_correct
        feature["id"] = f"PB{pb_correct}"

# SAUVEGARDER LE GEOJSON CORRIGÉ
with open("department_29_corrected.geojson", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("✔ GeoJSON corrigé généré : department_29_corrected.geojson")
