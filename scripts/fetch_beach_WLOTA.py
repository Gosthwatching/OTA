import os
import json
import re
import time
import requests
from bs4 import BeautifulSoup

BASE = "https://dplf.wlota.com/"
CACHE_DIR = "cache_dplf_pb"
os.makedirs(CACHE_DIR, exist_ok=True)

def dms_to_decimal(coord):
    match = re.match(r"(\d+)°(\d+)[,.](\d+)\s*([NSEW])", coord)
    if not match:
        return None
    deg, minutes, decimal, direction = match.groups()
    value = float(deg) + float(minutes)/60 + float(decimal)/600
    if direction in ["S", "W"]:
        value = -value
    return value

def fetch_cached(url, name):
    path = os.path.join(CACHE_DIR, name)
    if os.path.exists(path):
        return open(path, "r", encoding="utf-8").read()
    print("GET", url)
    r = requests.get(url)
    if r.status_code != 200:
        print("⚠️ Page introuvable :", url)
        return ""
    html = r.text
    open(path, "w", encoding="utf-8").write(html)
    time.sleep(0.3)
    return html

def parse_fiche_pb(html):
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)

    def extract(label):
        m = re.search(label + r"\s*:\s*([^:\n]+)", text)
        return m.group(1).strip() if m else None

    nom_span = soup.find("span", string=re.compile("Phare"))
    nom = nom_span.text.replace("Phare ", "").strip() if nom_span else None

    pb = extract("DPLF N°")
    access = extract("Accessibilité")
    ville = extract("Ville Proche")
    structure = extract("Structure")
    validation = extract("Validation expédition")
    departement = extract("Département")
    wlotta = extract("WLOTA")
    recherche = extract("Recherché par les chasseurs de phare à")
    derniere = extract("Dernière activité")
    pos = extract("Position Géographique")

    lat = lon = None
    if pos:
        lat_raw, lon_raw = pos.split(" ")
        lat = dms_to_decimal(lat_raw)
        lon = dms_to_decimal(lon_raw)

    return {
        "nom": nom,
        "pb": pb,
        "accessibilite": access,
        "villeProche": ville,
        "structure": structure,
        "validationExpedition": validation,
        "departement": departement,
        "wlotta": wlotta,
        "position": {"lat": lat, "lon": lon},
        "recherchePourcentage": recherche,
        "derniereActivite": derniere
    }

# --- 1) Trouver automatiquement les pages département PB ---
index_html = fetch_cached(BASE, "index.html")
index_soup = BeautifulSoup(index_html, "html.parser")

dept_pages = set()

for a in index_soup.select("a[href*='index.php?option=com_content'][href*='id=']"):
    href = a.get("href")
    if "PB" in a.text or "Phare" in a.text:
        dept_pages.add(BASE + href.lstrip("/"))

print("✔ Pages département PB trouvées :", len(dept_pages))

# --- 2) Scraper tous les PB ---
features = []

for dept_url in dept_pages:
    dept_html = fetch_cached(dept_url, "dept_" + re.sub(r"\W+", "_", dept_url) + ".html")
    soup = BeautifulSoup(dept_html, "html.parser")

    links = soup.select("a[href*='index.php?option=com_content'][href*='view=article']")

    for a in links:
        name = a.text.strip()

        if not re.search(r"PB\s*\d+", name):
            continue

        href = a.get("href")
        detail_url = BASE + href.lstrip("/")
        detail_html = fetch_cached(detail_url, "pb_" + re.sub(r"\W+", "_", name) + ".html")

        data = parse_fiche_pb(detail_html)

        features.append({
            "type": "Feature",
            "id": data["pb"],
            "geometry": {
                "type": "Point",
                "coordinates": [
                    data["position"]["lon"],
                    data["position"]["lat"]
                ]
            },
            "properties": {
                **data,
                "source": detail_url,
                "typePoint": "lighthouse"
            }
        })

# --- 3) Export GeoJSON ---
geojson = {"type": "FeatureCollection", "features": features}
open("dplf_lighthouses.geojson", "w", encoding="utf-8").write(
    json.dumps(geojson, indent=2, ensure_ascii=False)
)

print("✔ GeoJSON généré :", len(features), "phares")
