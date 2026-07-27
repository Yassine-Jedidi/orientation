"""Extract programs from the new 25 July 2026 PDF and compare with scores.json."""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

import pdfplumber

ARABIC_RE = re.compile(r"[\u0600-\u06ff\ufb50-\ufdff\ufe70-\ufeff]")
CODE_RE = re.compile(r"^\d{5}$")
SCORE_RE = re.compile(r"^\d{2,3}(?:\.\d{1,4})?$")

ROOT = Path(__file__).resolve().parents[1]
NEW_PDF = ROOT / "pdfs" / "guide_2026_tp 25juillet.pdf"
OLD_PDF = ROOT / "pdfs" / "guide_2026_tp.pdf"
SCORES_JSON = ROOT / "public" / "data" / "scores.json"
NEW_SCORES_JSON = ROOT / "public" / "data" / "scores_25juillet.json"
DIFF_JSON = ROOT / "public" / "data" / "diff_25juillet.json"


def clean_visual_arabic(value: str) -> str:
    if ARABIC_RE.search(value):
        value = value[::-1]
    value = unicodedata.normalize("NFKC", value)
    return " ".join(value.split())


def grouped_rows(page):
    clustered = []
    for word in sorted(page.extract_words(keep_blank_chars=False), key=lambda w: w["top"]):
        if not clustered or abs(word["top"] - clustered[-1][0]) > 1.0:
            clustered.append((word["top"], [word]))
        else:
            clustered[-1][1].append(word)
    result = []
    for y, words in clustered:
        words.sort(key=lambda w: w["x0"])
        result.append({"y": y, "words": words})
    return result


def column_text(words: list[dict], low: float, high: float) -> str:
    return " ".join(w["text"] for w in words if low <= w["x0"] < high)


def is_header(row: dict) -> bool:
    normalized = unicodedata.normalize("NFKC", " ".join(w["text"] for w in row["words"]))
    return all(marker in normalized for marker in ("عومجملا", "ايرولاكابلا", "ةبعشلا"))


def logical_line(row: dict) -> str:
    return clean_visual_arabic(" ".join(w["text"] for w in row["words"]))


def metadata_lines(rows: list[dict]) -> list[str]:
    candidates = []
    for row in rows:
        raw = " ".join(w["text"] for w in row["words"])
        if re.search(r"\d{2,}", raw) or is_header(row):
            continue
        text = logical_line(row)
        if ARABIC_RE.search(text) and len(text) >= 4:
            candidates.append(text)
    return candidates


def is_university_heading(text: str) -> bool:
    return text.startswith("جامعة ") or text == "الإدارة العامة للدراسات التكنولوجية"


def extract(pdf_path: Path, label: str) -> list[dict]:
    """Extract structured score/program rows from a guide PDF."""
    records: list[dict] = []
    current_university = ""

    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages, 1):
            rows = grouped_rows(page)
            header_indexes = [i for i, row in enumerate(rows) if is_header(row)]
            if not header_indexes:
                continue

            for section_index, header_index in enumerate(header_indexes):
                previous_header = header_indexes[section_index - 1] if section_index else -1
                meta_start = previous_header + 1 if section_index else 0
                metadata = metadata_lines(rows[meta_start:header_index])

                university_candidates = [text for text in metadata if is_university_heading(text)]
                if university_candidates:
                    current_university = university_candidates[-1]

                institution_candidates = [text for text in metadata if not is_university_heading(text)]
                institution = institution_candidates[-1] if institution_candidates else ""

                end = header_indexes[section_index + 1] if section_index + 1 < len(header_indexes) else len(rows)
                active: dict | None = None
                for row in rows[header_index + 1 : end]:
                    words = row["words"]
                    score_raw = column_text(words, 35, 130).strip()
                    bac_raw = column_text(words, 110, 270).strip()
                    license_raw = column_text(words, 270, 500).strip()
                    code_raw = column_text(words, 495, 560).strip()

                    code_match = CODE_RE.search(code_raw)
                    score_match = SCORE_RE.search(score_raw)

                    if code_match:
                        active = {
                            "code": code_match.group(),
                            "license": clean_visual_arabic(license_raw),
                        }
                    elif license_raw and active and not active["license"]:
                        active["license"] = clean_visual_arabic(license_raw)

                    if active and score_match and bac_raw:
                        records.append({
                            "page": page_number,
                            "university": current_university,
                            "institution": institution,
                            "code": active["code"],
                            "license": active["license"],
                            "bacType": clean_visual_arabic(bac_raw),
                            "score": float(score_match.group()),
                        })

    unique = []
    seen = set()
    for record in records:
        key = tuple(record.values())
        if key not in seen:
            seen.add(key)
            unique.append(record)
    
    print(f"{label}: {len(unique)} rows, {len({r['code'] for r in unique})} unique codes")
    return unique


def compare(old_records: list[dict], new_records: list[dict]) -> dict:
    """Compare two extracted datasets."""
    old_by_key = {}
    for r in old_records:
        key = (r["code"], r["bacType"])
        old_by_key[key] = r

    new_by_key = {}
    for r in new_records:
        key = (r["code"], r["bacType"])
        new_by_key[key] = r

    old_keys = set(old_by_key.keys())
    new_keys = set(new_by_key.keys())

    added = new_keys - old_keys
    removed = old_keys - new_keys
    common = old_keys & new_keys

    score_changes = []
    for key in common:
        o = old_by_key[key]
        n = new_by_key[key]
        if o.get("score") != n.get("score") or o.get("university") != n.get("university") or o.get("institution") != n.get("institution") or o.get("license") != n.get("license"):
            score_changes.append({
                "code": key[0],
                "bacType": key[1],
                "old": {"university": o.get("university"), "institution": o.get("institution"), "license": o.get("license"), "score": o.get("score")},
                "new": {"university": n.get("university"), "institution": n.get("institution"), "license": n.get("license"), "score": n.get("score")},
            })

    return {
        "oldRows": len(old_records),
        "newRows": len(new_records),
        "oldCodes": len({r["code"] for r in old_records}),
        "newCodes": len({r["code"] for r in new_records}),
        "addedKeys": sorted(added),
        "removedKeys": sorted(removed),
        "scoreChanges": score_changes,
        "addedCount": len(added),
        "removedCount": len(removed),
        "changedCount": len(score_changes),
    }


def main():
    print("Extracting old PDF...")
    old_records = extract(OLD_PDF, "Old PDF")
    print("Extracting new PDF...")
    new_records = extract(NEW_PDF, "New PDF")

    # Save new extraction
    with open(NEW_SCORES_JSON, "w", encoding="utf-8") as f:
        json.dump(new_records, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Saved new extraction to {NEW_SCORES_JSON}")

    # Compare
    diff = compare(old_records, new_records)

    # Also compare with scores.json
    scores_data = json.loads(SCORES_JSON.read_text(encoding="utf-8"))
    diff_with_app = compare(old_records, scores_data)

    result = {
        "oldVsNew": diff,
        "scoresJson": {
            "rows": len(scores_data),
            "codes": len({r["code"] for r in scores_data}),
        },
    }

    with open(DIFF_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Saved diff to {DIFF_JSON}")

    print("\n=== OLD vs NEW PDF ===")
    print(f"  Added (code+bacType): {diff['addedCount']}")
    print(f"  Removed (code+bacType): {diff['removedCount']}")
    print(f"  Changed fields: {diff['changedCount']}")
    print(f"\n  Added entries (first 20):")
    for key in sorted(diff['addedKeys'])[:20]:
        print(f"    + {key[0]} / {key[1]}")
    print(f"\n  Removed entries (first 20):")
    for key in sorted(diff['removedKeys'])[:20]:
        print(f"    - {key[0]} / {key[1]}")


if __name__ == "__main__":
    main()
