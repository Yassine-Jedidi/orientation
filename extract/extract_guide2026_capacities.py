"""Extract capacity data (طاقة الاستيعاب) from guide_2026_tp.pdf.

Each page has a table with columns at specific x-positions.
For each program code, capacity values are arranged by bac type vertically.
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "pdfs" / "guide_2026_tp.pdf"
OUT_JSON = ROOT / "programs_capacity.json"
OUT_CSV = ROOT / "programs_capacity.csv"
SCORES_JSON = ROOT / "public" / "data" / "scores.json"

# Canonical visual-order bac types (as used in capacity files)
CANONICAL_BAC_TYPES = [
    "بادآ",
    "تايضاير",
    "ةيبيرجت مولع",
    "فرصتو داصتقإ",
    "ةيملعلا مولع",
    "ةينقتلا مولعلا",
    "ةضاير",
]

# Map any PDF text representation to canonical visual-order key
BAC_NORMALIZE = {
    "آداب": "بادآ",
    "(+)آداب": "بادآ",
    "(+)ﺁﺩﺍﺏ": "بادآ",
    "ﺁﺩﺍﺏ": "بادآ",
    "رياضيات": "تايضاير",
    "(+)رياضيات": "تايضاير",
    "ﺭﻳﺎﺿﻴﺎﺕ": "تايضاير",
    "علوم تجريبية": "ةيبيرجت مولع",
    "(+)علوم تجريبية": "ةيبيرجت مولع",
    "ﻋﻠﻮﻡ ﺗﺠﺮﻳﺒﻴﺔ": "ةيبيرجت مولع",
    "إقتصاد وتصرف": "فرصتو داصتقإ",
    "اقتصاد وتصرف": "فرصتو داصتقإ",
    "(+)اقتصاد وتصرف": "فرصتو داصتقإ",
    "ﺇﻗﺘﺼﺎﺩ ﻭﺗﺼﺮﻑ": "فرصتو داصتقإ",
    "علوم الإعلامية": "ةيملعلا مولع",
    "(+)علوم الإعلامية": "ةيملعلا مولع",
    "ﻋﻠﻮﻡ ﺍﻹﻋﻼﻣﻴﺔ": "ةيملعلا مولع",
    "العلوم التقنية": "ةينقتلا مولعلا",
    "علوم تقنية": "ةينقتلا مولعلا",
    "(+)علوم تقنية": "ةينقتلا مولعلا",
    "ﺍﻟﻌﻠﻮﻡ ﺍﻟﺘﻘﻨﻴﺔ": "ةينقتلا مولعلا",
    "رياضة": "ةضاير",
    "(+)رياضة": "ةضاير",
    "ﺭﻳﺎﺿﺔ": "ةضاير",
}

# Visual-order (capacity files) -> Logical-order (scores.json)
VISUAL_TO_LOGICAL = {
    "بادآ": "آداب",
    "تايضاير": "رياضيات",
    "ةيبيرجت مولع": "علوم تجريبية",
    "فرصتو داصتقإ": "إقتصاد وتصرف",
    "ةيملعلا مولع": "علوم الإعلامية",
    "ةينقتلا مولعلا": "العلوم التقنية",
    "ةضاير": "رياضة",
}

# Logical-order -> Visual-order
LOGICAL_TO_VISUAL = {v: k for k, v in VISUAL_TO_LOGICAL.items()}


def extract_page_rows(page) -> list[dict]:
    """Extract positioned text items from a page, classified by column."""
    blocks = page.get_text("dict")["blocks"]
    items = []
    for b in blocks:
        if b["type"] != 0:
            continue
        for line in b["lines"]:
            text = "".join(span["text"] for span in line["spans"]).strip()
            if not text:
                continue
            bbox = line["bbox"]
            x_center = (bbox[0] + bbox[2]) / 2
            y_center = (bbox[1] + bbox[3]) / 2

            col = "other"
            if x_center < 40:
                col = "score"
            elif x_center < 65:
                col = "capacity"
            elif x_center < 140:
                col = "formula"
            elif x_center < 230:
                col = "bac_type"
            elif x_center < 260:
                col = "code"
            elif x_center < 390:
                col = "specialty"
            elif x_center < 530:
                col = "institution"
            else:
                col = "degree"

            items.append({
                "text": text,
                "x": x_center,
                "y": y_center,
                "y0": bbox[1],
                "y1": bbox[3],
                "col": col,
            })
    return items


def group_by_code(items: list[dict]) -> dict[str, dict[str, int]]:
    """Group items by code and extract capacity per bac type.

    Returns {code: {bac_type_canonical: capacity_int}}
    """
    code_items = sorted(
        [it for it in items if it["col"] == "code" and re.match(r"^\d{5}$", it["text"])],
        key=lambda x: x["y"],
    )

    cap_items = sorted(
        [it for it in items if it["col"] == "capacity" and re.match(r"^\d+$", it["text"])],
        key=lambda x: x["y"],
    )

    bac_items = sorted(
        [it for it in items if it["col"] == "bac_type" and it["text"] in BAC_NORMALIZE],
        key=lambda x: x["y"],
    )

    if not code_items:
        return {}

    result = {}
    for i, code_it in enumerate(code_items):
        code = code_it["text"]
        code_y = code_it["y0"]
        next_y = code_items[i + 1]["y0"] if i + 1 < len(code_items) else float("inf")

        # Get caps and bac types within this code's y-range
        caps_here = [c for c in cap_items if code_y <= c["y0"] < next_y]
        bacs_here = [b for b in bac_items if code_y <= b["y0"] < next_y]

        if not caps_here:
            continue

        # Map each capacity to the closest bac type
        capacities = {}
        for cap in caps_here:
            cap_val = int(cap["text"])
            cap_y = cap["y"]

            best_bac = None
            best_dist = float("inf")
            for bac in bacs_here:
                dist = abs(cap_y - bac["y"])
                if dist < best_dist:
                    best_dist = dist
                    best_bac = bac["text"]

            if best_bac and best_dist < 25:
                canonical = BAC_NORMALIZE[best_bac]
                capacities[canonical] = cap_val

        if capacities:
            result[code] = capacities

    return result


def extract_metadata(items: list[dict]) -> dict[str, dict[str, str]]:
    """Extract institution, specialty, degree info per code."""
    code_items = sorted(
        [it for it in items if re.match(r"^\d{5}$", it["text"]) and 220 < it["x"] < 260],
        key=lambda x: x["y0"],
    )

    metadata = {}
    for i, ci in enumerate(code_items):
        code = ci["text"]
        code_y = ci["y0"]
        next_y = code_items[i + 1]["y0"] if i + 1 < len(code_items) else float("inf")

        meta = metadata.setdefault(code, {"institution": "", "specialty": "", "degree": ""})
        for it in items:
            if it["y0"] < code_y or it["y0"] >= next_y:
                continue
            x = it["x"]
            t = it["text"]

            # Skip header text
            if any(h in t for h in ["التخصصات", "المؤسسة", "الجامعة", "الإجازة", "الشعبة",
                                     "مجموع", "موجه", "صيغة", "نوع الباكالوريا", "الرمز",
                                     "طاقة", "الاستيعاب",
                                     "علوم الحياة", "إجبارية", "تربية بدنية",
                                     "شعبة مخصصة", "اختبار", "التنفيل", "الجغرافي",
                                     "اختيارات"]) or t in BAC_NORMALIZE:
                continue
            # Skip page number (single digit at top right)
            if re.match(r"^\d+$", t) and len(t) <= 3 and x > 300 and it["y0"] < 50:
                continue
            # Skip 5-digit codes
            if re.match(r"^\d{5}$", t):
                continue

            if 280 < x < 390:
                meta["specialty"] += t + " "
            elif 390 < x < 530:
                meta["institution"] += t + " "
            elif x >= 540:
                meta["degree"] += t + " "

    for code in metadata:
        for key in ["institution", "specialty", "degree"]:
            val = metadata[code][key].strip()
            val = re.sub(r"\s+", " ", val)
            metadata[code][key] = val

    return metadata


def main():
    sys.stdout.reconfigure(encoding="utf-8")

    doc = fitz.open(str(PDF))
    total_pages = doc.page_count
    print(f"Processing {total_pages} pages...")

    all_capacities = {}  # code -> {bac_type_visual: capacity}
    all_metadata = {}

    for page_idx in range(total_pages):
        page = doc[page_idx]
        items = extract_page_rows(page)

        page_caps = group_by_code(items)
        for code, caps in page_caps.items():
            if code in all_capacities:
                all_capacities[code].update(caps)
            else:
                all_capacities[code] = caps

        page_meta = extract_metadata(items)
        for code, meta in page_meta.items():
            if code not in all_metadata:
                all_metadata[code] = meta
            else:
                for key in ["institution", "specialty", "degree"]:
                    if meta.get(key) and not all_metadata[code].get(key):
                        all_metadata[code][key] = meta[key]

        if (page_idx + 1) % 20 == 0:
            print(f"  Processed page {page_idx + 1}/{total_pages}")

    doc.close()

    print(f"\nTotal codes extracted: {len(all_capacities)}")

    # Find all PDF codes for verification
    doc = fitz.open(str(PDF))
    all_pdf_codes = set()
    for page_idx in range(total_pages):
        page = doc[page_idx]
        text = page.get_text()
        for c in re.findall(r"\b(\d{5})\b", text):
            all_pdf_codes.add(c)
    doc.close()

    extracted_codes = set(all_capacities.keys())
    missing_codes = all_pdf_codes - extracted_codes
    if missing_codes:
        print(f"WARNING: {len(missing_codes)} codes not extracted: {sorted(missing_codes)}")
    else:
        print(f"All {len(all_pdf_codes)} PDF codes successfully extracted!")

    # Build output JSON (visual-order keys)
    output = []
    for code in sorted(all_capacities.keys()):
        # Sort by canonical order
        sorted_caps = {}
        for bt in CANONICAL_BAC_TYPES:
            if bt in all_capacities[code]:
                sorted_caps[bt] = all_capacities[code][bt]
        for bt, val in sorted(all_capacities[code].items()):
            if bt not in sorted_caps:
                sorted_caps[bt] = val

        meta = all_metadata.get(code, {})
        output.append({
            "code": code,
            "institution": meta.get("institution", ""),
            "specialty": meta.get("specialty", ""),
            "degree": meta.get("degree", ""),
            "bac_capacities": sorted_caps,
        })

    # Write JSON
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"Wrote {OUT_JSON} ({len(output)} records)")

    # Write CSV
    csv_headers = ["بادآ", "تايضاير", "ةيبيرجت مولع", "ةيملعلا مولع", "ةينقتلا مولعلا", "فرصتو داصتقإ", "ةضاير"]
    with open(OUT_CSV, "w", encoding="utf-8-sig") as f:
        f.write("code,institution,specialty,degree," + ",".join(csv_headers) + "\n")
        for rec in output:
            row = [
                rec["code"],
                f'"{rec["institution"]}"',
                f'"{rec["specialty"]}"',
                f'"{rec["degree"]}"',
            ]
            for bt in csv_headers:
                row.append(str(rec["bac_capacities"].get(bt, "")))
            f.write(",".join(row) + "\n")
    print(f"Wrote {OUT_CSV}")

    total_records = sum(len(caps) for caps in all_capacities.values())
    print(f"Total capacity records (code x bac_type): {total_records}")

    # Update scores.json
    print("\nUpdating scores.json...")
    with open(SCORES_JSON, "r", encoding="utf-8") as f:
        scores = json.load(f)

    # Build lookup: (code, logical_bacType) -> capacity
    cap_lookup = {}
    for rec in output:
        code = rec["code"]
        for bt_visual, cap in rec["bac_capacities"].items():
            bt_logical = VISUAL_TO_LOGICAL.get(bt_visual, bt_visual)
            cap_lookup[(code, bt_logical)] = cap

    updated = 0
    filled = 0
    for s in scores:
        key = (s["code"], s["bacType"])
        if key in cap_lookup:
            expected = cap_lookup[key]
            current = s.get("capacity")
            if current != expected:
                s["capacity"] = expected
                updated += 1
                if current is None:
                    filled += 1

    with open(SCORES_JSON, "w", encoding="utf-8") as f:
        json.dump(scores, f, ensure_ascii=False)
    print(f"Updated {updated} capacity values in scores.json ({filled} newly filled)")

    still_missing = sum(1 for s in scores if s.get("capacity") is None)
    print(f"Records still missing capacity: {still_missing}")
    if still_missing > 0:
        mc = sorted(set(s["code"] for s in scores if s.get("capacity") is None))
        print(f"Missing codes ({len(mc)}): {mc}")


if __name__ == "__main__":
    main()
