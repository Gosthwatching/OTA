#!/usr/bin/env python3
"""
Script (simplifié): vérifie seulement si l'URL du PDF sur la page a changé.

Usage:
  - Installer dépendances: pip install -r scripts/requirements.txt
  - Lancer: python scripts/check_new_activations.py

Comportement:
  - Télécharge la page Update.html
  - Trouve le premier lien .pdf
  - Compare l'URL au dernier enregistrement dans `scripts/.last_pdf`
  - Si différente, POST vers l'API locale et met à jour `scripts/.last_pdf`
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

import requests


UPDATE_PAGE_URL = "https://www.qsl.net/fl1pt/Update.html"
API_URL = "http://127.0.0.1:3000/api/check-new-activations"
WORKDIR = Path(__file__).resolve().parent
LAST_PDF_FILE = WORKDIR / ".last_pdf"


def fetch_text(url: str, timeout: int = 15) -> str:
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    return r.text


def find_first_pdf_link(html: str, base_url: str) -> Optional[str]:
    m = re.search(r'href\s*=\s*"([^"]+?\.pdf)"', html, flags=re.IGNORECASE)
    if m:
        return urljoin(base_url, m.group(1))
    m = re.search(r"href\s*=\s*'([^']+?\.pdf)'", html, flags=re.IGNORECASE)
    if m:
        return urljoin(base_url, m.group(1))
    return None


def read_last_pdf() -> Optional[str]:
    if not LAST_PDF_FILE.exists():
        return None
    return LAST_PDF_FILE.read_text(encoding="utf-8").strip()


def write_last_pdf(url: str) -> None:
    LAST_PDF_FILE.write_text(url, encoding="utf-8")


def notify_api(pdf_url: str) -> None:
    payload = {"pdf_url": pdf_url}
    try:
        r = requests.post(API_URL, json=payload, timeout=10)
        r.raise_for_status()
        print("Notified API:", r.status_code)
    except Exception as e:
        print("Failed to notify API:", e, file=sys.stderr)


def main() -> int:
    try:
        html = fetch_text(UPDATE_PAGE_URL)
    except Exception as e:
        print(f"Échec téléchargement page: {e}", file=sys.stderr)
        return 2

    pdf_link = find_first_pdf_link(html, UPDATE_PAGE_URL)
    if not pdf_link:
        print("Aucun lien PDF trouvé.")
        return 3

    last = read_last_pdf()
    if last == pdf_link:
        print("Pas de changement.")
        return 0

    print("Nouveau PDF détecté:", pdf_link)
    notify_api(pdf_link)
    try:
        write_last_pdf(pdf_link)
    except Exception as e:
        print("Impossible d'écrire dernier PDF:", e, file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
