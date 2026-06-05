#!/usr/bin/env python3
"""Parse a QSL bunker update text file and compare bunker references to activated bunker data."""

import argparse
import json
import re
from pathlib import Path

BUNKER_ID_RE = re.compile(r"B/F-\d{4}")
LAT_RE = re.compile(r"\s(-?\d{1,2}[.,]\d{4,})\s")
QTH_RE = re.compile(r"[A-X]{2}[0-9]{2}[A-X]{2}")


def normalize_bunker_id(value):
    if not value:
        return None
    return value.strip().upper()


def parse_update_text(path):
    entries = []
    with open(path, "r", encoding="utf-8", errors="ignore") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip("\n")
            bunker_match = BUNKER_ID_RE.search(line)
            if not bunker_match:
                continue

            bunker_id = normalize_bunker_id(bunker_match.group(0))
            lat_match = LAT_RE.search(line)
            qth_match = QTH_RE.search(line)

            name = ""
            lon = None
            lat = None
            qth = None

            if lat_match:
                lat_raw = lat_match.group(1).replace(",", ".")
                try:
                    lat = float(lat_raw)
                except ValueError:
                    lat = None

                name = line[bunker_match.end(): lat_match.start()].strip(" ,;")

            if qth_match:
                qth = qth_match.group(0)
                if lat_match:
                    lon_text = line[lat_match.end(): qth_match.start()].strip(" ,;")
                    lon_text = lon_text.replace(",", ".")
                    try:
                        lon = float(lon_text)
                    except ValueError:
                        lon = None

            entries.append({
                "bunker": bunker_id,
                "name": name,
                "lat": lat,
                "lon": lon,
                "qth": qth,
                "line_number": line_number,
                "raw": line,
            })
    return entries


def load_activated(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as handle:
        data = json.load(handle)

    activated = set()
    for item in data:
        bunker = item.get("Bunker") or item.get("bunker")
        bunker = normalize_bunker_id(bunker)
        if bunker:
            activated.add(bunker)
    return activated


def main():
    parser = argparse.ArgumentParser(
        description="Parse a QSL bunker update text file and compare it to activated bunkers."
    )
    parser.add_argument("input", help="Input QSL text file to parse.")
    parser.add_argument(
        "--activated",
        default="json/bunker_activated.json",
        help="Activated bunker JSON file (default: json/bunker_activated.json).",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Optional output JSON file path for parsed bunker data.",
    )
    parser.add_argument(
        "--show-missing",
        action="store_true",
        help="Show bunker IDs present in the text file but missing from activated data.",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    activated_path = Path(args.activated)

    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")
    if not activated_path.exists():
        raise SystemExit(f"Activated JSON file not found: {activated_path}")

    entries = parse_update_text(input_path)
    activated = load_activated(activated_path)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as handle:
            json.dump(entries, handle, indent=2, ensure_ascii=False)
        print(f"Parsed {len(entries)} entries and wrote JSON to {output_path}")

    all_bunkers = {entry["bunker"] for entry in entries if entry["bunker"]}
    missing = sorted(all_bunkers - activated)
    common = sorted(all_bunkers & activated)
    activated_only = sorted(activated - all_bunkers)

    print(f"Parsed bunker references: {len(all_bunkers)}")
    print(f"Activated bunkers in file: {len(common)}")
    print(f"Missing from activated list: {len(missing)}")
    print(f"Activated only (not seen in text file): {len(activated_only)}")

    if args.show_missing and missing:
        print("\nBunker refs not found in activated data:")
        for bunker in missing:
            print(bunker)

    if missing:
        print("\nUse --show-missing to list the missing bunker IDs.")


if __name__ == "__main__":
    main()
