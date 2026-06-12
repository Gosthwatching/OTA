#!/usr/bin/env python3
"""
Script fiable : teste tous les PDF FBOTA possibles et détecte le plus récent.
"""

import sys
from pathlib import Path
import requests
from datetime import datetime, timedelta

BASE_URL = "https://www.qsl.net/f1lpt/"
API_URL = "http://127.0.0.1:3000/api/check-new-activations"
WORKDIR = Path(__file__).resolve().parent
LAST_PDF_FILE = WORKDIR / ".last_pdf"


def pdf_exists(url: str) -> bool:
    try:
        r = requests.head(url, timeout=10)
        return r.status_code == 200
    except:
        return False


def find_latest_pdf():
    """Teste les PDF des 60 derniers jours et retourne le plus récent."""
    today = datetime.today()
    found = []

    for i in range(60):
        date = today - timedelta(days=i)
        name = date.strftime("ActivationFBOTAweb%d%m%Y.pdf")
        url = BASE_URL + name

        if pdf_exists(url):
            found.append(url)

    if not found:
        return None

    return sorted(found)[-1]


def read_last_pdf():
    if LAST_PDF_FILE.exists():
        return LAST_PDF_FILE.read_text().strip()
    return None


def write_last_pdf(url: str):
    LAST_PDF_FILE.write_text(url)


def notify_api(pdf_url: str):
    try:
        r = requests.post(API_URL, json={"pdf_url": pdf_url}, timeout=10)
        r.raise_for_status()
        print("API notifiée :", r.status_code)
    except Exception as e:
        print("Erreur API :", e, file=sys.stderr)


def main():
    latest = find_latest_pdf()

    if not latest:
        print("Aucun PDF FBOTA trouvé sur les 60 derniers jours.")
        return 3

    print("Dernier PDF trouvé :", latest)

    last = read_last_pdf()

    if last == latest:
        print("Pas de changement.")
        return 0

    print("NOUVEAU PDF détecté :", latest)
    notify_api(latest)
    write_last_pdf(latest)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
