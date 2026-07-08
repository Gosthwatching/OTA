#!/usr/bin/env python3
"""Synchronise les donnees bunker FBOTA depuis les sources officielles qsl.net."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin

import pdfplumber
import requests


BASE_URL = "https://www.qsl.net/f1lpt/"
UPDATE_URL = urljoin(BASE_URL, "Update.html")

OUT_DIR = Path("json/bunker")
OUT_ALL = OUT_DIR / "bunkers_all.json"
OUT_ACTIVATED = OUT_DIR / "bunker_activated.json"
OUT_ACTIVATED_UNIQUE = OUT_DIR / "bunker_activated_unique.json"
OUT_ALL_WITH_ACTIVATION = OUT_DIR / "bunkers_all_with_activation.json"
OUT_STATS = OUT_DIR / "fbota_stats.json"


ID_RE = re.compile(r"B/F-\d{4,5}")
ID_LOOSE_RE = re.compile(r"B/F\s*-?\s*\d{4,5}")
COORD_RE = re.compile(r"-?\d{1,3}[\.,]\d+")
QTH_RE = re.compile(r"[A-X]{2}\d{2}[A-X]{2}")


@dataclass
class SourceLinks:
    list_pdf: str
    activation_pdf: str
    declared_total: int


def normalize_bunker_id(value: str) -> str:
    digits = "".join(ch for ch in value if ch.isdigit())
    return f"B/F-{int(digits):04d}"


def fetch_text(url: str) -> str:
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    return response.text


def fetch_pdf_bytes(url: str) -> bytes:
    response = requests.get(url, timeout=90)
    response.raise_for_status()
    return response.content


def find_sources() -> SourceLinks:
    html = fetch_text(UPDATE_URL)

    declared_match = re.search(
        r"Nous\s+avons\s+actuellement\s+(\d+)\s+bunkers\s+dans\s+la\s+base",
        html,
        flags=re.IGNORECASE,
    )
    if not declared_match:
        # Certains contenus qsl.net compactent ou encodent le HTML de maniere atypique.
        text = re.sub(r"<[^>]+>", " ", html)
        text = " ".join(text.split())
        declared_match = re.search(
            r"Nous\s+avons\s+actuellement\s+(\d+)\s+bunkers",
            text,
            flags=re.IGNORECASE,
        )
    if not declared_match:
        raise RuntimeError("Impossible de lire le total bunker declare sur Update.html")

    list_match = re.search(r"FBOTAV\d+Web\.pdf", html, flags=re.IGNORECASE)
    if not list_match:
        raise RuntimeError("Impossible de trouver le PDF liste FBOTAV sur Update.html")

    activation_match = re.search(r"ActivationFBOTAweb\d{8}\.pdf", html, flags=re.IGNORECASE)
    if not activation_match:
        raise RuntimeError("Impossible de trouver le PDF activations FBOTA sur Update.html")

    return SourceLinks(
        list_pdf=urljoin(BASE_URL, list_match.group(0)),
        activation_pdf=urljoin(BASE_URL, activation_match.group(0)),
        declared_total=int(declared_match.group(1)),
    )


def parse_bunker_list(pdf_bytes: bytes) -> dict[str, dict]:
    records: dict[str, dict] = {}

    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for raw_line in text.splitlines():
                id_match = ID_RE.search(raw_line)
                if not id_match:
                    continue

                bunker_id = normalize_bunker_id(id_match.group(0))
                line = " ".join(raw_line.split())

                qth_match = QTH_RE.search(line)
                qth = qth_match.group(0) if qth_match else None

                coord_matches = COORD_RE.findall(line)
                lat = None
                lon = None
                if len(coord_matches) >= 2:
                    # Les deux dernieres valeurs flottantes de la ligne sont les coordonnees.
                    lat_text = coord_matches[-2].replace(",", ".")
                    lon_text = coord_matches[-1].replace(",", ".")
                    try:
                        lat = float(lat_text)
                    except ValueError:
                        lat = None
                    try:
                        lon = float(lon_text)
                    except ValueError:
                        lon = None

                label = line[id_match.end():]
                if coord_matches:
                    first_coord = COORD_RE.search(label)
                    if first_coord:
                        label = label[: first_coord.start()]
                label = label.strip(" -;,")

                code = ""
                name = label
                if " - " in label:
                    maybe_code, maybe_name = label.split(" - ", 1)
                    if maybe_code and len(maybe_code) <= 24:
                        code = maybe_code.strip()
                        name = maybe_name.strip()

                records.setdefault(
                    bunker_id,
                    {
                        "bunker": bunker_id,
                        "code": code,
                        "name": name,
                        "lat": lat,
                        "lon": lon,
                        "qth": qth,
                    },
                )

    return records


def fill_missing_ids(records: dict[str, dict], declared_total: int) -> list[str]:
    existing_numbers = {int(item["bunker"].split("-")[1]) for item in records.values()}
    missing = [n for n in range(1, declared_total + 1) if n not in existing_numbers]

    for number in missing:
        bunker_id = f"B/F-{number:04d}"
        records[bunker_id] = {
            "bunker": bunker_id,
            "code": "",
            "name": "Reference reservee/supprimee",
            "lat": None,
            "lon": None,
            "qth": None,
        }

    return [f"B/F-{n:04d}" for n in missing]


def parse_activation_rows(pdf_bytes: bytes) -> tuple[list[dict], int | None]:
    rows: list[dict] = []
    declared_count = None

    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        first_text = pdf.pages[0].extract_text() or ""
        lines = [ln.strip() for ln in first_text.splitlines() if ln.strip()]
        for idx, line in enumerate(lines):
            if "Nombre de Bunker" in line and idx > 0:
                prev = lines[idx - 1].strip()
                if prev.isdigit():
                    declared_count = int(prev)

        for page in pdf.pages:
            tables = page.extract_tables() or []
            for table in tables:
                for raw_row in table:
                    if not raw_row:
                        continue
                    cells = [(cell or "").strip() for cell in raw_row]
                    joined = " ".join(cells)
                    match = ID_LOOSE_RE.search(joined)
                    if not match:
                        continue

                    bunker = normalize_bunker_id(match.group(0))
                    rows.append({"bunker": bunker})

    if not rows:
        # Fallback texte brut si l'extraction tabulaire echoue.
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            text = "\n".join((page.extract_text() or "") for page in pdf.pages)
        rows = [{"bunker": normalize_bunker_id(m)} for m in ID_LOOSE_RE.findall(text)]

    return rows, declared_count


def sorted_records(items: Iterable[dict]) -> list[dict]:
    return sorted(items, key=lambda x: int(str(x["bunker"]).split("-")[1]))


def main() -> None:
    sources = find_sources()

    list_pdf_bytes = fetch_pdf_bytes(sources.list_pdf)
    activation_pdf_bytes = fetch_pdf_bytes(sources.activation_pdf)

    records_by_id = parse_bunker_list(list_pdf_bytes)
    missing_ids = fill_missing_ids(records_by_id, sources.declared_total)
    all_records = sorted_records(records_by_id.values())

    activation_rows, declared_activated = parse_activation_rows(activation_pdf_bytes)
    activation_unique_ids = sorted({item["bunker"] for item in activation_rows}, key=lambda x: int(x.split("-")[1]))
    activation_unique = [{"bunker": bunker_id} for bunker_id in activation_unique_ids]
    activation_set = set(activation_unique_ids)

    all_with_activation = []
    for item in all_records:
        merged = dict(item)
        merged["activated"] = item["bunker"] in activation_set
        all_with_activation.append(merged)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_ALL.write_text(json.dumps(all_records, indent=2, ensure_ascii=False), encoding="utf-8")
    OUT_ACTIVATED.write_text(json.dumps(activation_rows, indent=2, ensure_ascii=False), encoding="utf-8")
    OUT_ACTIVATED_UNIQUE.write_text(json.dumps(activation_unique, indent=2, ensure_ascii=False), encoding="utf-8")
    OUT_ALL_WITH_ACTIVATION.write_text(json.dumps(all_with_activation, indent=2, ensure_ascii=False), encoding="utf-8")

    stats = {
        "updated_at": datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "sources": {
            "update_page": UPDATE_URL,
            "list_pdf": sources.list_pdf,
            "activation_pdf": sources.activation_pdf,
        },
        "declared": {
            "bunkers_total": sources.declared_total,
            "activated_rows": declared_activated,
        },
        "generated": {
            "bunkers_total": len(all_records),
            "bunkers_with_coordinates": sum(
                1 for x in all_records if isinstance(x.get("lat"), float) and isinstance(x.get("lon"), float)
            ),
            "activated_rows": len(activation_rows),
            "activated_unique": len(activation_unique),
            "all_with_activation_active": sum(1 for x in all_with_activation if x.get("activated") is True),
        },
        "missing_ids_filled": missing_ids,
    }
    OUT_STATS.write_text(json.dumps(stats, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Liste bunkers declaree: {sources.declared_total}")
    print(f"Liste bunkers generee : {len(all_records)}")
    print(f"Bunkers avec coordonnees : {stats['generated']['bunkers_with_coordinates']}")
    print(f"Actives declarees (PDF) : {declared_activated}")
    print(f"Actives lignes extraites : {len(activation_rows)}")
    print(f"Actives uniques : {len(activation_unique)}")
    if missing_ids:
        print("IDs manquants remplis :", ", ".join(missing_ids))


if __name__ == "__main__":
    main()
