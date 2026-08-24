import asyncio
import json
import re
from playwright.async_api import async_playwright

OUTPUT = "lighthouses_29.geojson"
BASE_URL = "https://dplf.wlota.com/index.php/dplf-lists/departments-27-to-35/department-29?id={id}"

def extract(label, text):
    m = re.search(rf"{label}\s*:\s*([^\n]+)", text)
    return m.group(1).strip() if m else ""

def clean_position_dms(raw):
    if not raw:
        return ""
    return raw.replace("Position Géographique :", "").strip()

def dms_to_decimal(dms):
    m = re.search(r"(\d+)°(\d+[,\.]\d+)\s([NS])\s(\d+)°(\d+[,\.]\d+)\s([EW])", dms)
    if not m:
        return None, None

    lat_deg, lat_min, lat_dir, lon_deg, lon_min, lon_dir = m.groups()

    lat = float(lat_deg) + float(lat_min.replace(",", ".").replace(" ", "")) / 60
    lon = float(lon_deg) + float(lon_min.replace(",", ".").replace(" ", "")) / 60

    if lat_dir == "S":
        lat = -lat
    if lon_dir == "W":
        lon = -lon

    return lon, lat

async def scrape(page, id_value):
    url = BASE_URL.format(id=id_value)

    try:
        await page.goto(url, timeout=30000)
        text = await page.inner_text("body")
    except:
        print(f"[!] Erreur id={id_value}")
        return None

    nom = extract("Nom du phare", text)
    if not nom:
        return None

    access = extract("Accessibilité", text)
    structure = extract("Structure", text)
    validation = extract("Validation expédition", text)
    departement = extract("Département", text)
    wlotta = extract("WLOTA", text)
    position_raw = extract("Position Géographique", text)
    recherche = extract("Recherché par les chasseurs de phare à", text)
    derniere = extract("Dernière activité", text)

    position_dms = clean_position_dms(position_raw)
    lon, lat = dms_to_decimal(position_dms)

    feature = {
        "type": "Feature",
        "id": f"ID{id_value}",
        "geometry": {
            "type": "Point",
            "coordinates": [
                round(lon, 4) if lon else 0.0,
                round(lat, 4) if lat else 0.0
            ]
        },
        "properties": {
            "id": id_value,
            "nom": nom,
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

async def main():
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        for id_value in range(139, 508):
            feature = await scrape(page, id_value)
            if feature:
                results.append(feature)

        await browser.close()

    geojson = {
        "type": "FeatureCollection",
        "features": results
    }

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)

    print(f"\n✔ Fichier généré : {OUTPUT}")
    print(f"✔ Phares trouvés : {len(results)}")

if __name__ == "__main__":
    asyncio.run(main())
    