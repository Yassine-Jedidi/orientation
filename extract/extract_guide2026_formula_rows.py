"""Stage 1: extract table-row geometry, codes, formulas, scores, and bac crops.

Scope is PDF pages 69 through 202 inclusive. The laureates page is outside this
range and is deliberately ignored.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import cv2
import fitz
import numpy as np
from rapidocr_onnxruntime import RapidOCR

from extract_guide2026_all_formulas import canonical_formula


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "pdfs" / "guide2026.pdf"
OUT = ROOT / "tmp" / "pdfs" / "guide2026_formula_rows.json"
CELL_DIR = ROOT / "tmp" / "pdfs" / "guide2026_bac_cells"


def top_left(box):
    return min(p[0] for p in box), min(p[1] for p in box)


def decoded_image(doc: fitz.Document, xref: int) -> np.ndarray:
    return cv2.imdecode(np.frombuffer(doc.extract_image(xref)["image"], np.uint8), cv2.IMREAD_COLOR)


def main() -> None:
    CELL_DIR.mkdir(parents=True, exist_ok=True)
    ocr = RapidOCR()
    rows = []

    with fitz.open(PDF) as doc:
        for page_number in range(69, 203):
            page = doc[page_number - 1]
            images = [item for item in page.get_images(full=True) if item[2] >= 700 and item[3] >= 600]
            for image_number, info in enumerate(images):
                image = decoded_image(doc, info[0])
                result, _ = ocr(image[:, : min(380, image.shape[1])])
                if not result:
                    continue
                codes = []
                formulas = []
                scores = []
                for box, text, confidence in result:
                    x, y = top_left(box)
                    digits = re.sub(r"\D", "", text)
                    if x >= 245 and len(digits) == 5:
                        codes.append((y, digits, confidence))
                    if 80 <= x < 245 and "f" in text.lower():
                        formula, similarity = canonical_formula(text)
                        if formula:
                            formulas.append((y, formula, text, similarity))
                    if x < 80:
                        try:
                            scores.append((y, float(text.replace(",", "."))))
                        except ValueError:
                            pass
                codes.sort()
                formulas.sort()
                for code_index, (code_y, code, code_confidence) in enumerate(codes):
                    next_y = codes[code_index + 1][0] if code_index + 1 < len(codes) else float("inf")
                    group = [item for item in formulas if code_y - 12 <= item[0] < next_y]
                    for row_index, (y, formula, raw_formula, similarity) in enumerate(group):
                        nearest_score = min(scores, key=lambda item: abs(item[0] - y), default=None)
                        score = nearest_score[1] if nearest_score and abs(nearest_score[0] - y) < 8 else None
                        bac_crop = image[max(0, round(y) - 5):min(image.shape[0], round(y) + 25), 190:278]
                        bac_crop = cv2.resize(bac_crop, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
                        bac_crop = cv2.copyMakeBorder(
                            bac_crop, 10, 10, 15, 15, cv2.BORDER_CONSTANT, value=(255, 255, 255)
                        )
                        filename = f"p{page_number:03}_i{image_number}_c{code}_r{row_index:02}.png"
                        path = CELL_DIR / filename
                        cv2.imwrite(str(path), bac_crop)
                        rows.append({
                            "pdfPage": page_number,
                            "printedPage": page_number - 2,
                            "imageNumber": image_number,
                            "code": code,
                            "codeY": round(code_y, 2),
                            "rowY": round(y, 2),
                            "score2025": score,
                            "formula": formula,
                            "formulaOcr": raw_formula,
                            "formulaSimilarity": round(similarity, 4),
                            "codeConfidence": round(float(code_confidence), 4),
                            "bacImage": str(path.relative_to(ROOT)).replace("\\", "/"),
                        })
            print(f"page {page_number}: {len(rows)} rows", flush=True)

    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"rows": len(rows), "codes": len({row['code'] for row in rows})}, indent=2))


if __name__ == "__main__":
    main()
