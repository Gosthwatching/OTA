import asyncio
import json
import re
from playwright.async_api import async_playwright

LIST_URL = "https://dplf.wlota.com/index.php/dplf-lists/departments-27-to-35/department-29"
OUTPUT = "pb_filled_templates.json"

# -----------------------------
#  UTILITAIRES
# -----------------------------

def extract_department(url):
    m = re.search(r"department-(\d+)", url)
    return m.group(1) if m else ""

def dms_to_decimal(dms):
    m = re.search(r"(\d+)°(\d+,\d+)\s*([NS])\s*(\d+)°(\d+,\d+)\s*([EW])", dms)
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
    m = re.search(rf"{label}\s*:\s*([^\n]+)", text)
    return m.group(1).strip() if m else ""

def clean_wlotta(raw):
    if not raw:
        return "Non"
    raw = raw.strip()
    if raw.lower() == "non":
        return "Non"
    if re.search(r"\d+", raw):
        return "Oui"
    return "Non"

def clean_position_dms(raw):
    if not raw:
        return ""
    return raw.replace("Position Géographique :", "").strip()

# -----------------------------
#  SCRAPER LISTE PB -> mapping nom → PB
# -----------------------------

async def scrape_pb_list(page):
    await page.goto(LIST_URL, timeout=30000)
    text = await page.inner_text("body")

    # On récupère les lignes du tableau "N° PB / Nom du Phare / WLOTA"
    # Format dans le texte : "001 \t\tLa Pyramide \t\tNon"
    lines = []
    for line in text.splitlines():
        # On cherche les lignes qui ressemblent à "NNN   Nom   ..."
        if re.search(r"\b\d{1,4}\s+\S", line):
            lines.append(line.strip())

    mapping = {}  # nom -> PB

    for line in lines:
        # Exemple : "001 \t\tLa Pyramide \t\tNon"
        parts = re.split(r"\s{2,}|\t+", line)
        parts = [p.strip() for p in parts if p.strip()]
        if len(parts) >= 2 and parts[0].isdigit():
            pb_num = int(parts[0])
            nom = parts[1]
            mapping[nom] = pb_num

    return mapping

# -----------------------------
#  SCRAPER PB (détail)
# -----------------------------

async def scrape_pb(page, url, name_to_pb):
    await page.goto(url, timeout=30000)
    text = await page.inner_text("body")

    departement = extract_department(url)

    nom = extract("Nom du phare", text)
    access = extract("Accessibilité", text)
    ville = extract("Ville Proche", text)
    structure = extract("Structure", text)
    validation = extract("Validation expédition", text)
    wlotta_raw = extract("WLOTA", text)
    position_dms_raw = extract("Position Géographique", text)
    recherche = extract("Recherché par les chasseurs de phare à", text)
    derniere = extract("Dernière activité", text)

    wlotta = clean_wlotta(wlotta_raw)
    position_dms = clean_position_dms(position_dms_raw)

    lon, lat = dms_to_decimal(position_dms)

    # Ici on utilise le NOM pour retrouver le vrai N° PB
    pb_num = name_to_pb.get(nom, None)

    return {
        "type": "Feature",
        "id": f"PB{pb_num if pb_num is not None else 'UNKNOWN'}",
        "geometry": {
            "type": "Point",
            "coordinates": [
                round(lon, 4) if lon else 0.0000,
                round(lat, 4) if lat else 0.0000
            ]
        },
        "properties": {
            "pb": pb_num,
            "nom": nom,
            "accessibilite": access,
            "villeProche": ville,
            "structure": structure,
            "validationExpedition": validation,
            "departement": departement,
            "wlotta": wlotta,
            "positionDMS": position_dms,
            "recherchePourcentage": recherche,
            "derniereActivite": derniere,
            "typePoint": "lighthouse",
            "urlId": int(url.split("id=")[1])  # pour debug si besoin
        }
    }

# -----------------------------
#  MAIN
# -----------------------------

async def main():
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # 1. On récupère le mapping nom → PB depuis la page de liste
        print("Scraping liste département 29…")
        name_to_pb = await scrape_pb_list(page)
        print(f"Mapping nom→PB trouvé pour {len(name_to_pb)} phares")

        # 2. On génère les URLs de détail (139 à 507)
        urls = [
            f"https://dplf.wlota.com/index.php/dplf-lists/departments-27-to-35/department-29?id={i}"
            for i in range(139, 508)
        ]

        # 3. On scrape chaque URL et on assigne le bon PB via le nom
        for url in urls:
            print(f"Scraping {url}…")
            data = await scrape_pb(page, url, name_to_pb)
            results.append(data)

        await browser.close()

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": results}, f, indent=2, ensure_ascii=False)

    print(f"\n✔ Fichier généré : {OUTPUT}")
    print(f"✔ Phares scrapés : {len(results)}")


if __name__ == "__main__":
    asyncio.run(main())
