"""Extract every 2026 licence score formula from the guide's table images.

Only the numeric code and Latin formula columns are OCR'd.  Arabic licence and
bac-type labels are taken from scores.json, then expanded by code.  This avoids
using Arabic OCR for data that already exists in a cleaner structured source.
"""

from __future__ import annotations

import difflib
import json
import re
from pathlib import Path

import cv2
import fitz
import numpy as np
from rapidocr_onnxruntime import RapidOCR


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "pdfs" / "guide2026.pdf"
SCORES = ROOT / "public" / "data" / "scores.json"
OUT = ROOT / "extract" / "guide2026_formula_by_license_bactype.json"
CHECKPOINT = ROOT / "tmp" / "pdfs" / "guide2026_formula_ocr_checkpoint.json"

# Canonical spellings observed in the guide. OCR output is matched to these,
# preventing harmless case/spacing noise from leaking into the final dataset.
FORMULAS = (
    "FG", "FG+AR", "FG+PH", "FG+SVT", "FG+F", "FG+M", "FG+SP",
    "FG+ESP", "FG+ALL", "FG+(M+SP)/2", "FG+(M+info)/2",
    "FG+(AR+FR)/2", "FG+(F+Ang)/2", "FG+(AR+ANG+F)/3",
    "FG+(SP+SVT)/2", "FG+Max((Ang-15),0)", "FG+(M+Algo)/2",
    "FG+(M+info+2Ang)/4", "FG+(M+SP+TE)/3", "FG+(F+HG)/2",
    "FG+(M+SP+Algo)/3", "FG+(M+SP+SVT)/3", "FG+(M+SP+info)/3",
    "FG+ANG", "FG+IT", "FG+SB", "FG+Inf", "FG+Spt", "FG+STI",
    "FG+TE", "FG+GEST", "FG+(M+GEST)/2", "FG+(M+ECO)/2",
    "FG+(HG+PH)/2", "FG+(SP+TE)/2", "FG+(F+Ang+Spt)/3",
    "FG+(AR+ANG+F+PH)/4", "FG+(AR+ANG+2F)/4",
    "FG+(AR+2ANG+F)/4", "FG+(2AR+ANG+F)/4",
    "FG+(F+ANG+PH)/3", "FG+(AR+F+HG+PH)/4",
    "FG+(F+ANG+HG)/3", "FG+(M+TE)/2", "FG+(SP+SB)/2",
)


def compact(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9()+,*/-]", "", value).lower()


def canonical_formula(value: str) -> tuple[str | None, float]:
    value = compact(value).replace("infos", "info")
    candidates = [(difflib.SequenceMatcher(None, value, compact(f)).ratio(), f) for f in FORMULAS]
    score, formula = max(candidates)
    return (formula if score >= 0.68 else None), score


def image_from_xref(doc: fitz.Document, xref: int) -> np.ndarray:
    data = doc.extract_image(xref)["image"]
    image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Could not decode image xref {xref}")
    return image


def extract() -> dict[str, dict]:
    score_rows = json.loads(SCORES.read_text(encoding="utf-8"))
    valid_codes = {row["code"] for row in score_rows}
    ocr = RapidOCR()
    found: dict[str, dict] = (
        json.loads(CHECKPOINT.read_text(encoding="utf-8")) if CHECKPOINT.exists() else {}
    )
    resume_page = max((item["formulaPdfPage"] for item in found.values()), default=0) + 1

    with fitz.open(PDF) as doc:
        for page_number, page in enumerate(doc, 1):
            if page_number < resume_page:
                continue
            table_images = [img for img in page.get_images(full=True) if img[2] >= 700 and img[3] >= 600]
            for image_info in table_images:
                image = image_from_xref(doc, image_info[0])
                # Tables consistently place formula and code in this left-hand band.
                crop = image[:, : min(380, image.shape[1])]
                result, _ = ocr(crop)
                if not result:
                    continue

                codes: list[tuple[float, str]] = []
                formulas: list[tuple[float, str, float, str, float | None]] = []
                scores: list[tuple[float, float]] = []
                for box, text, _confidence in result:
                    x = min(point[0] for point in box)
                    y = min(point[1] for point in box)
                    digits = re.sub(r"\D", "", text)
                    if x >= 245 and len(digits) == 5:
                        codes.append((y, digits))
                    if 80 <= x < 245 and "f" in text.lower():
                        formula, similarity = canonical_formula(text)
                        if formula:
                            formulas.append((y, formula, similarity, text, None))
                    if x < 80:
                        try:
                            scores.append((y, float(text.replace(",", "."))))
                        except ValueError:
                            pass

                formulas = [
                    (y, formula, similarity, raw,
                     min(scores, key=lambda item: abs(item[0] - y))[1]
                     if scores and abs(min(scores, key=lambda item: abs(item[0] - y))[0] - y) < 8 else None)
                    for y, formula, similarity, raw, _ in formulas
                ]

                codes.sort()
                for index, (code_y, code) in enumerate(codes):
                    next_y = codes[index + 1][0] if index + 1 < len(codes) else float("inf")
                    group = [item for item in formulas if code_y - 12 <= item[0] < next_y]
                    if not group:
                        continue
                    # A code's formula repeats for each bac row. Majority voting makes
                    # the result robust to a single noisy OCR line.
                    counts: dict[str, int] = {}
                    for _, formula, _, _, _ in group:
                        counts[formula] = counts.get(formula, 0) + 1
                    formula = max(counts, key=lambda item: (counts[item], max(x[2] for x in group if x[1] == item)))
                    found[code] = {
                        "formula": formula,
                        "formulaPdfPage": page_number,
                        "formulaPrintedPage": page_number - 2,
                        "ocrSamples": [item[3] for item in group],
                        "formulaRows": [
                            {"formula": item[1], "score": item[4], "ocr": item[3]}
                            for item in group
                        ],
                    }

            print(f"page {page_number}/{len(doc)}: {len(found)} codes", flush=True)
            if page_number % 5 == 0 or page_number == len(doc):
                CHECKPOINT.parent.mkdir(parents=True, exist_ok=True)
                temporary = CHECKPOINT.with_suffix(".tmp")
                temporary.write_text(json.dumps(found, ensure_ascii=False, indent=2), encoding="utf-8")
                temporary.replace(CHECKPOINT)
    return found


def build_output(formulas_by_code: dict[str, dict]) -> list[dict]:
    rows = json.loads(SCORES.read_text(encoding="utf-8"))
    output = []
    seen = set()
    for row in rows:
        key = (row["university"], row["institution"], row["code"], row["license"], row["bacType"])
        if key in seen or row["code"] not in formulas_by_code:
            continue
        seen.add(key)
        source = formulas_by_code[row["code"]]
        candidates = [item for item in source.get("formulaRows", []) if item["score"] is not None]
        match = min(candidates, key=lambda item: abs(item["score"] - row["score"]), default=None)
        # Printed 2025 scores identify the exact bac row even when 2026 added or
        # removed another bac type for the same licence.
        if match is None or abs(match["score"] - row["score"]) > 0.06:
            continue
        output.append({
            "university": row["university"], "institution": row["institution"],
            "code": row["code"], "license": row["license"], "bacType": row["bacType"],
            "score": row["score"], "formula": match["formula"],
            "formulaPdfPage": source["formulaPdfPage"],
            "formulaPrintedPage": source["formulaPrintedPage"],
        })
    return output


if __name__ == "__main__":
    formulas = extract()
    output = build_output(formulas)
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    all_codes = {row["code"] for row in json.loads(SCORES.read_text(encoding="utf-8"))}
    missing = sorted(all_codes - formulas.keys())
    print(json.dumps({"codes": len(formulas), "rows": len(output), "missingCodes": missing}, indent=2))
