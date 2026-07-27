import asyncio
import json
import re
from playwright.async_api import async_playwright

BASE = "https://dplf.wlota.com/index.php/dplf-lists"

GROUPS = [
    ("departments-06-to-22", range(6, 23)),
    ("departments-27-to-35", range(27, 36)),
    ("departments-40-to-62", range(40, 63)),
    ("departments-64-to-85", range(64, 86)),
]

OUTPUT = "lighthouses_final.geojson"


def dms_to_decimal(dms):
    m = re.search(r"(\d+)°(\d+,\d+)\s([NS])\s(\d+)°(\d+,\d+)\s([EW])", dms)
    if not m:
        return None, None
    lat_deg, lat_min, lat_dir, lon_deg, lon_min, lon_dir = m.groups()
    lat = float(lat_deg) + float(lat_min.replace(",", ".") )/60
    lon = float(lon_deg) + float(lon_min.replace(",", ".") )/60
    if lat_dir == "S": lat = -lat
    if lon_dir == "W": lon = -lon
    return lon, lat


async def discover_departments(page):
    deps = []
    for group, numbers in GROUPS:
        for num in numbers:
            url = f"{BASE}/{group}/department-{num}"
            try:
                await page.goto(url, timeout=15000)
                body = await page.inner_text("body")
                if "DPLF" in body or "Phare" in body:
                    deps.append(url)
                    print(f"Département valide : {url}")
            except:
                pass
    return deps


async def discover_pbs(page, dep_url):
    await page.goto(dep_url, timeout=30000)
    links = await page.query_selector_all("a[href*='?id=']")
    pbs = set()
    for link in links:
        href = await link.get_attribute("href")
        if not href:
            continue
        if "?id=" in href:
            try:
                pb = int(href.split("id=")[1])
                pbs.add(pb)
            except:
                pass
    return sorted(pbs)


async def fetch_pb(page, dep_url, pb):
    url = f"{dep_url}?id={pb}"
    await page.goto(url, timeout=30000)
    text = await page.inner_text("body")

    if "Accessibilité" not in text:
        return None

    def extract(label):
        m = re.search(rf"{label}\s*:\s*([^\n]+)", text)
        return m.group(1).strip() if m else ""

    nom = extract("Nom du phare")
    access = extract("Accessibilité")
    ville = extract("Ville Proche")
    structure = extract("Structure")
    validation = extract("Validation expédition")
    departement = extract("Département")
    wlotta = extract("WLOTA")
    position_dms = extract("Position Géographique")
    recherche = extract("Recherché par les chasseurs de phare à")
    derniere = extract("Dernière activité")

    lon, lat = dms_to_decimal(position_dms)

    return {
        "type": "Feature",
        "id": f"PB{pb}",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": {
            "pb": pb,
            "nom": nom,
            "departement": departement,
            "wlotta": wlotta,
            "accessibilite": access,
            "villeProche": ville,
            "structure": structure,
            "validationExpedition": validation,
            "positionDMS": position_dms,
            "recherchePourcentage": recherche,
            "derniereActivite": derniere,
            "typePoint": "lighthouse"
        }
    }


async def main():
    final = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("Découverte automatique des départements…")
        deps = await discover_departments(page)
        print(f"{len(deps)} départements trouvés.")

        all_pbs = {}

        for dep in deps:
            print(f"\nScan PB du département : {dep}")
            pbs = await discover_pbs(page, dep)
            print(f"{len(pbs)} PB trouvés")
            for pb in pbs:
                all_pbs[pb] = dep

        print(f"\nTotal PB trouvés : {len(all_pbs)}")

        for pb, dep_url in sorted(all_pbs.items()):
            print(f"Scraping PB{pb}…")
            data = await fetch_pb(page, dep_url, pb)
            if data:
                final.append(data)
            else:
                print(f"⚠ PB{pb} introuvable")

        await browser.close()

    geojson = {"type": "FeatureCollection", "features": final}

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)

    print(f"\n✔ Fichier généré : {OUTPUT}")
    print(f"✔ Total phares : {len(final)}")


if __name__ == "__main__":
    asyncio.run(main())
