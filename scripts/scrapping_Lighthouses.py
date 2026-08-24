import asyncio
import json
import re
from playwright.async_api import async_playwright

OUTPUT = "pb_department_29_139_507.geojson"

BASE_URL = "https://dplf.wlota.com/index.php?id={id}"

# -----------------------------
#  UTILITAIRES
# -----------------------------

def dms_to_decimal(dms):
    """
    Convertit une position DMS du type '47°52,5 N 004°06,9 W'
    en (lon, lat) en décimal.
    """
    m = re.search(r"(\d+)°(\d+,\d+)\s([NS])\s(\d+)°(\d+,\d+)\s([EW])", dms)
    if not m:
        return None, None

    lat_deg, lat_min, lat_dir, lon_deg, lon_min, lon_dir = m.groups()

    lat = float(lat_deg) + float(lat_min.replace(",", ".")) / 60
    lon = float(lon_deg) + float(lon_min.replace(",", ".")) / 60

    if lat_dir == "S":
        lat = -lat
    if lon_dir == "W":
        lon = -lon

    return lon, lat


def extract(label, text):
    """
    Extrait la valeur après 'label :' sur la ligne.
    Exemple : extract("Nom du phare", text)
    """
    m = re.search(rf"{label}\s*:\s*([^\n]+)", text)
    return m.group(1).strip() if m else ""


def clean_wlotta(raw):
    """
    Nettoie le champ WLOTA :
    - vide -> "?"
    - 'Non' -> 'Non'
    - contient un numéro -> 'Oui'
    - sinon -> '?'
    """
    if not raw:
        return "?"
    raw = raw.strip()

    if raw.lower() == "non":
        return "Non"

    if re.search(r"\d+", raw):
        return "Oui"

    return "?"


def clean_position_dms(raw):
    if not raw:
        return ""
    return raw.replace("Position Géographique :", "").strip()


# -----------------------------
#  SCRAPER D'UNE PAGE
# -----------------------------

async def scrape_page(page, id_value):
    url = BASE_URL.format(id=id_value)

    try:
        await page.goto(url, timeout=30000)
    except Exception as e:
        print(f"[!] Erreur de chargement pour id={id_value} : {e}")
        return None

    try:
        text = await page.inner_text("body")
    except Exception as e:
        print(f"[!] Erreur de lecture du body pour id={id_value} : {e}")
        return None

    # Extraction des champs
    dplf = extract("DPLF N° : ", text)
    access = extract("Accessibilité", text)
    nom = extract("Nom du phare", text)
    structure = extract("Structure", text)
    validation = extract("Validation expédition", text)
    departement = extract("Département", text)
    wlotta_raw = extract("WLOTA", text)
    position_dms_raw = extract("Position Géographique", text)
    recherche = extract("Recherché par les chasseurs de phare à", text)
    derniere = extract("Dernière activité", text)

    # Nettoyage
    wlotta = clean_wlotta(wlotta_raw)
    position_dms = clean_position_dms(position_dms_raw)
    lon, lat = dms_to_decimal(position_dms)

    # Si pas de nom de phare, on considère que la page n'est pas un phare utile
    if not nom:
        print(f"[i] Pas de 'Nom du phare' pour id={id_value}, page ignorée.")
        return None

    feature = {
        "type": "Feature",
        "id": f"ID{id_value}",
        "geometry": {
            "type": "Point",
            "coordinates": [
                round(lon, 4) if lon else 0.0000,
                round(lat, 4) if lat else 0.0000
            ]
        },
        "properties": {
            "idPage": id_value,
            "nom": nom,
            "dplf": dplf,
            "accessibilite": access,
            "structure": structure,
            "validationExpedition": validation,
            "departement": departement,
            "wlotta": wlotta,
            "positionDMS": position_dms,
            "recherchePourcentage": recherche,
            "derniereActivite": derniere,
            "typePoint": "lighthouse"
        }
    }

    print(f"[+] OK id={id_value} | {nom}")
    return feature


# -----------------------------
#  MAIN
# -----------------------------

async def main():
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # boucle sur tous les id de 139 à 507 inclus
        for id_value in range(1, 579):
            print(f"Scraping id={id_value}…")
            feature = await scrape_page(page, id_value)
            if feature:
                results.append(feature)

        await browser.close()

    # Tri par idPage croissant
    results = sorted(results, key=lambda f: f["properties"]["idPage"])

    geojson = {
        "type": "FeatureCollection",
        "features": results
    }

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)

    print(f"\n✔ Fichier généré : {OUTPUT}")
    print(f"✔ Pages valides (avec Nom du phare) : {len(results)}")


if __name__ == "__main__":
    asyncio.run(main())
