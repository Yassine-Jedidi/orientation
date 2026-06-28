"""Extract 2025 Tunisian orientation scores from the source PDF.

The PDF contains visually positioned text rather than semantic tables.  This
extractor therefore reconstructs rows and columns from word coordinates.
"""

from __future__ import annotations

import argparse
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


def clean_visual_arabic(value: str) -> str:
    """Convert PDF visual-order Arabic into normalized logical-order text.

    NFKC must happen before reversal. Reversing presentation-form glyphs first
    produces malformed sequences such as ``اإلجازة`` instead of ``الإجازة``.
    """
    if ARABIC_RE.search(value):
        # Reverse presentation-form glyphs first. Normalizing before reversal
        # expands lam-alef ligatures into two codepoints in visual order and
        # yields misspellings such as العالج and واالتصاالت.
        value = value[::-1]
    value = unicodedata.normalize("NFKC", value)
    return " ".join(value.split())


def grouped_rows(page) -> list[dict]:
    # Cluster by tolerance instead of rounding. Values either side of an x.5
    # boundary can belong to the same printed row (for example 270.492 and
    # 270.502), and Python's rounding would incorrectly split those glyphs.
    clustered: list[tuple[float, list[dict]]] = []
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
    # Visual-order forms of: المجموع، الباكالوريا، الشعبة
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
    """Return whether a standalone colored heading names the owning body."""
    return text.startswith("جامعة ") or text == "الإدارة العامة للدراسات التكنولوجية"


def extract(pdf_path: Path) -> list[dict]:
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

                # A page can change university between any two table sections.
                # Update state at section level, not merely once per page.
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
                        records.append(
                            {
                                "page": page_number,
                                "university": current_university,
                                "institution": institution,
                                "code": active["code"],
                                "license": active["license"],
                                "bacType": clean_visual_arabic(bac_raw),
                                "score": float(score_match.group()),
                            }
                        )

    # Exact duplicate rows are extraction artifacts, never distinct admissions.
    unique = []
    seen = set()
    for record in records:
        key = tuple(record.values())
        if key not in seen:
            seen.add(key)
            unique.append(record)
    return unique


def validate(records: list[dict]) -> None:
    required = ("university", "institution", "code", "license", "bacType")
    empty = Counter(field for row in records for field in required if not str(row[field]).strip())
    if empty:
        raise ValueError(f"Empty required fields: {dict(empty)}")
    duplicates = len(records) - len({tuple(row.values()) for row in records})
    if duplicates:
        raise ValueError(f"Duplicate records remain: {duplicates}")


def write_outputs(records: list[dict], csv_path: Path, json_path: Path) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    fields = ["page", "university", "institution", "code", "license", "bacType", "score"]
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)
    json_path.write_text(json.dumps(records, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path, default=root / "orientation/pdfs/SD_TN_2025.pdf")
    parser.add_argument("--csv", type=Path, default=root / "orientation/data/SD_TN_2025_scores.csv")
    parser.add_argument("--json", type=Path, default=root / "orientation/public/data/scores.json")
    args = parser.parse_args()

    records = extract(args.pdf)
    validate(records)
    write_outputs(records, args.csv, args.json)
    print(f"Extracted {len(records)} rows, {len({r['code'] for r in records})} unique codes")


if __name__ == "__main__":
    main()
