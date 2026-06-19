import pdfplumber
import json
import re

PDF_PATH = "data/FBOTAV324Web.pdf"
OUTPUT = "json/bunkers_all.json"

LINE_REGEX = re.compile(
    r"(B/F-\d+)\s+([A-Z0-9]+)\s+-\s+(.+?)\s+([0-9]+\.[0-9]+)\s+([0-9]+\.[0-9]+)\s+([A-R]{2}\d{2}[A-X]{2})"
)

def extract_bunkers():
    bunkers = []

    with pdfplumber.open(PDF_PATH) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue

            for line in text.split("\n"):
                match = LINE_REGEX.search(line)
                if match:
                    bunker_id = match.group(1)
                    code = match.group(2)
                    name = match.group(3).strip()
                    lat = float(match.group(4))
                    lon = float(match.group(5))
                    qth = match.group(6)

                    bunkers.append({
                        "bunker": bunker_id,
                        "code": code,
                        "name": name,
                        "lat": lat,
                        "lon": lon,
                        "qth": qth
                    })

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(bunkers, f, indent=2, ensure_ascii=False)

    print(f"✅ Extraction terminée : {len(bunkers)} bunkers trouvés.")
    print(f"📄 Fichier généré : {OUTPUT}")


if __name__ == "__main__":
    extract_bunkers()
