import json

# ---------------------------------------------------------
# 1. TABLE DE CORRESPONDANCE : DPLF → Nom du phare
# ---------------------------------------------------------
DPLF_MAP = {
    "La Pyramide": "001",
    "Ile aux Moutons": "003",
    "Ile Louet": "005",
    "Ile Vierge": "007",
    "Le Four": "011",
    "Ar Men": "012",
    "Tevennec": "013",
    "Men Tensel - Kereon": "014",
    "La Jument": "022",
    "La Vieille": "026",
    "Les Pierres Noires": "033",
    "Ile de Penfret": "038",
    "Ile Wrac'h": "040",
    "Nividic": "042",
    "Ile Noire": "061",
    "Ile Tristan": "063",
    "Corn Carhai": "065",
    "La Lande": "093",
    "Ile de Batz": "094",
    "Roscoff Rear": "095",
    "Pontusval - Pointe de Beg Pol": "096",
    "Pointe de Creac'h": "097",
    "Le Stiff": "099",
    "Saint Mathieu": "100",
    "Lochrist": "101",

    # --- Ajout de ta liste complète ---
    "Trezien": "102",
    "Kermorvan": "103",
    "Pointe de Morgat": "104",
    "Pointe du Millier": "105",
    "Ile de Sein - Grand Phare": "106",
    "Trévignon Jetée": "108",
    "Pointe du Toulinguet": "109",
    "Pointe du Petit Minou": "110",
    "Pointe du Portzic": "111",
    "Pointe de Lervily": "112",
    "Pointe de Penmarc'h": "114",
    "Le Guilvinec - Rear": "116",
    "Pointe de Langoz": "117",
    "La Croix": "120",
    "Lanvaon - Rear": "150",
    "Bloscon - Jetée": "153",
    "Aber Ildut": "157",
    "Pointe de Corsen": "162",
    "Kergadec": "165",
    "Doelan Aval": "191",
    "Doelan Amont": "203",
    "Men Brial": "218",
    "Port Manec'h - Beg Ar Vechen": "268",
    "Raoulic - Jetée - Audierne": "276",
    "Pors Poulhan": "277",
    "Lost Moan": "279",
    "Guilvinec - Entrée Nord - Môle en Epi": "280",
    "Trescadec - Audierne": "281",
    "Pointe de Combrit": "295",
    "Port du Stiff - Môle Est": "296",
    "Mogueriec - Front": "340",
    "Beuzec": "347",
    "Baie de Pouldohan": "382",
    "Lanriec": "393",
    "Pointe du Coq": "401",
    "Men Guen Bras": "410",
    "Trevignon - Shelter": "412",
    "Leading light - Aber Wrac'h": "413",
    "Portsall": "414",
    "Men Korn": "415",
    "Les Trois Pierres": "416",
    "Ile Molene - jetée": "417",
    "Saint Mathieu - Feu Auxilliaire": "418",
    "Camaret sur Mer - Môle Nord": "419",
    "Roche Mengam": "420",
    "Brest Range Front": "422",
    "Brest Range Rear": "424",
    "Le Chat": "425",
    "La Plate": "426",
    "Mole de Lechiagat - Entrance range Front": "428",
    "locarec Rocher": "429",
    "Mole de Lechiagat - Middle": "431",
    "Men Ar Groas - Lesconil": "432",
    "Le Cochon": "435",
    "Ile Pigued - Ar Chaden": "436",
    "Brigneau": "437",
    "Passage de Lanriec - Ville close": "443",
    "Ile d'Ouessant": "1002",
    "Ile de Sein": "1003",
    "Ile de Batz": "1010",
    "Ile Molene": "1016"
}

# ---------------------------------------------------------
# 2. CHARGEMENT DU FICHIER À CORRIGER
# ---------------------------------------------------------
INPUT_FILE = "lighthouses_29.geojson"          # Ton fichier ID139 → ID184
OUTPUT_FILE = "phare_dplf.json"    # Fichier corrigé

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

# ---------------------------------------------------------
# 3. REMPLACEMENT DES IDs
# ---------------------------------------------------------
for feature in data["features"]:
    nom = feature["properties"]["nom"]

    if nom in DPLF_MAP:
        dplf = DPLF_MAP[nom]

        feature["id"] = f"PB{dplf}"
        feature["properties"]["id"] = int(dplf)

        print(f"✔ {nom} → PB{dplf}")

    else:
        print(f"⚠ Aucun DPLF trouvé pour : {nom}")

# ---------------------------------------------------------
# 4. SAUVEGARDE
# ---------------------------------------------------------
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n✔ Fichier mis à jour :", OUTPUT_FILE)
