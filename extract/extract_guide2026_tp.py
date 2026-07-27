"""Extract 2026 guide table data from PDF using pdfplumber.
Columns adapted for the 2026 TP guide layout.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

import pdfplumber

ARABIC_RE = re.compile(r"[\u0600-\u06ff\ufb50-\ufdff\ufe70-\ufeff]")
CODE_RE = re.compile(r"^\d{5}$")
SCORE_RE = re.compile(r"^\d{2,3}(?:\.\d{1,4})?$")

ROOT = Path(__file__).resolve().parents[1]
OLD_PDF = ROOT / "pdfs" / "guide_2026_tp.pdf"
NEW_PDF = ROOT / "pdfs" / "guide_2026_tp 25juillet.pdf"
SCORES_JSON = ROOT / "public" / "data" / "scores.json"
DIFF_OUT = ROOT / "public" / "data" / "diff_25juillet.json"


def clean_visual_arabic(value: str) -> str:
    if ARABIC_RE.search(value):
        value = value[::-1]
    value = unicodedata.normalize("NFKC", value)
    return " ".join(value.split())


def grouped_rows(page):
    clustered = []
    for w in sorted(page.extract_words(keep_blank_chars=False), key=lambda w: w["top"]):
        if not clustered or abs(w["top"] - clustered[-1][0]) > 1.0:
            clustered.append((w["top"], [w]))
        else:
            clustered[-1][1].append(w)
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


# 2026 TP guide column ranges (determined from PDF analysis)
# [0-50]: score + capacity (e.g., "102.7 4" or "- 1")
# [50-150]: formula (e.g., "FG+M")
# [150-200]: bac type (e.g., "رياضيات")
# [200-250]: code (5-digit)
# [250-650]: license/institution
COL_SCORE = (0, 100)
COL_FORMULA = (50, 155)
COL_BAC = (155, 200)
COL_CODE = (200, 260)
COL_LICENSE = (250, 700)
COL_INSTITUTION = (250, 500)


def extract(pdf_path: Path, label: str) -> list[dict]:
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
                active = None

                for row in rows[header_index + 1: end]:
                    words = row["words"]
                    score_raw = column_text(words, COL_SCORE[0], COL_SCORE[1]).strip()
                    formula_raw = column_text(words, COL_FORMULA[0], COL_FORMULA[1]).strip()
                    bac_raw = column_text(words, COL_BAC[0], COL_BAC[1]).strip()
                    code_raw = column_text(words, COL_CODE[0], COL_CODE[1]).strip()
                    license_raw = column_text(words, COL_LICENSE[0], COL_LICENSE[1]).strip()

                    code_match = CODE_RE.search(code_raw)

                    if code_match:
                        active = {
                            "code": code_match.group(),
                            "license": clean_visual_arabic(license_raw) if license_raw.strip() else "",
                        }
                    elif license_raw.strip() and active and not active.get("license"):
                        active["license"] = clean_visual_arabic(license_raw)

                    bac_clean = clean_visual_arabic(bac_raw) if bac_raw.strip() else ""

                    if active and bac_clean:
                        score_val = None
                        score_match = SCORE_RE.search(score_raw)
                        if score_match:
                            try:
                                score_val = float(score_match.group())
                            except ValueError:
                                score_val = None

                        records.append({
                            "page": page_number,
                            "university": current_university,
                            "institution": institution,
                            "code": active["code"],
                            "license": clean_visual_arabic(column_text(words, 250, 700)),
                            "bacType": bac_clean,
                            "score": score_val,
                            "formula_raw": formula_raw,
                        })

    unique = []
    seen = set()
    for record in records:
        key = (record["code"], record["bacType"], record["score"])
        if key not in seen:
            seen.add(key)
            unique.append(record)

    codes = {r["code"] for r in unique}
    print(f"{label}: {len(unique)} rows, {len(codes)} unique codes")
    return unique


def main():
    old_records = extract(OLD_PDF, "Old PDF")
    new_records = extract(NEW_PDF, "New PDF")

    # Build lookup keys
    def to_key(r):
        return (r["code"], r["bacType"])

    old_by_key = {to_key(r): r for r in old_records}
    new_by_key = {to_key(r): r for r in new_records}

    old_keys = set(old_by_key.keys())
    new_keys = set(new_by_key.keys())

    added = new_keys - old_keys
    removed = old_keys - new_keys
    common = old_keys & new_keys

    # Score changes
    score_changes = []
    for key in sorted(common):
        o = old_by_key[key]
        n = new_by_key[key]
        if o["score"] != n["score"] or o["institution"] != n["institution"] or o["university"] != n["university"]:
            score_changes.append({
                "code": key[0],
                "bacType": key[1],
                "old": {"university": o["university"], "institution": o["institution"], "license": o["license"], "score": o["score"]},
                "new": {"university": n["university"], "institution": n["institution"], "license": n["license"], "score": n["score"]},
            })

    result = {
        "oldRows": len(old_records),
        "newRows": len(new_records),
        "oldCodes": len({r["code"] for r in old_records}),
        "newCodes": len({r["code"] for r in new_records}),
        "addedCount": len(added),
        "removedCount": len(removed),
        "changedCount": len(score_changes),
        "added": [[k[0], k[1]] for k in sorted(added)[:100]],
        "removed": [[k[0], k[1]] for k in sorted(removed)[:100]],
        "scoreChanges": score_changes[:100],
    }

    DIFF_OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSaved diff to {DIFF_OUT}")

    print(f"\n--- Summary ---")
    print(f"Added (code+bac): {result['addedCount']}")
    print(f"Removed (code+bac): {result['removedCount']}")
    print(f"Changed fields: {result['changedCount']}")

    if result["added"]:
        print(f"\nAdded (first 20):")
        for c, b in result["added"][:20]:
            print(f"  + {c} / {b}")
    if result["removed"]:
        print(f"\nRemoved (first 20):")
        for c, b in result["removed"][:20]:
            print(f"  - {c} / {b}")


if __name__ == "__main__":
    main()
