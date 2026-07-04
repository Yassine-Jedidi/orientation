"""Extract and validate affiliations for codes newly appearing in guide 2026."""

from __future__ import annotations

import difflib
import json
import re
import unicodedata
from pathlib import Path

import fitz
import numpy as np
from paddleocr import PaddleOCR


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "pdfs" / "guide2026.pdf"
OLD = ROOT / "public" / "data" / "scores.json"
NEW = ROOT / "extract" / "guide2026_formula_by_license_bactype.json"
OUT = ROOT / "extract" / "guide2026_new_license_affiliations.json"


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    value = value.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ة", "ه")
    return re.sub(r"[^\u0600-\u06ff]", "", value)


def center(poly: list[list[int]]) -> tuple[float, float]:
    return sum(point[0] for point in poly) / len(poly), sum(point[1] for point in poly) / len(poly)


def main() -> None:
    old_rows = json.loads(OLD.read_text(encoding="utf-8"))
    new_rows = json.loads(NEW.read_text(encoding="utf-8"))
    old_codes = {row["code"] for row in old_rows}
    pairs = sorted({(row["institution"], row["university"]) for row in old_rows})
    pair_norm = [(pair, normalize(" ".join(pair))) for pair in pairs]

    new_by_code = {}
    for row in new_rows:
        if row["code"] not in old_codes:
            new_by_code.setdefault(row["code"], row)
    by_page: dict[int, list[dict]] = {}
    for row in new_by_code.values():
        by_page.setdefault(row["formulaPdfPage"], []).append(row)

    ocr = PaddleOCR(
        lang="ar",
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="arabic_PP-OCRv5_mobile_rec",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        enable_mkldnn=False,
    )
    output = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else []
    completed_codes = {row["code"] for row in output}
    with fitz.open(PDF) as doc:
        for page_number, targets in sorted(by_page.items()):
            targets = [row for row in targets if row["code"] not in completed_codes]
            if not targets:
                continue
            page = doc[page_number - 1]
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
            image = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
            result = list(ocr.predict(image))[0].json["res"]
            items = [
                {"text": text, "x": center(poly)[0], "y": center(poly)[1]}
                for text, poly in zip(result["rec_texts"], result["dt_polys"])
            ]
            width = pix.width
            for target in targets:
                code_items = [item for item in items if target["code"] in re.sub(r"\D", "", item["text"])]
                if not code_items:
                    numeric_items = [
                        item for item in items
                        if len(re.sub(r"\D", "", item["text"])) == 5 and width * .35 <= item["x"] <= width * .48
                    ]
                    if numeric_items:
                        code_items = [max(
                            numeric_items,
                            key=lambda item: difflib.SequenceMatcher(
                                None, target["code"], re.sub(r"\D", "", item["text"]),
                            ).ratio(),
                        )]
                    else:
                        raise ValueError(f"Code {target['code']} not detected on PDF page {page_number}")
                code_item = min(code_items, key=lambda item: abs(item["x"] - width * .41))
                lines = [
                    item for item in items
                    if width * .58 <= item["x"] <= width * .80 and code_item["y"] - 12 <= item["y"] <= code_item["y"] + 55
                ]
                lines.sort(key=lambda item: item["y"])
                raw = " ".join(item["text"] for item in lines)
                raw_norm = normalize(raw)
                pair, matched_norm = max(
                    pair_norm,
                    key=lambda candidate: difflib.SequenceMatcher(None, raw_norm, candidate[1]).ratio(),
                )
                score = difflib.SequenceMatcher(None, raw_norm, matched_norm).ratio()
                output.append({
                    "code": target["code"],
                    "license": target["license"],
                    "institution": pair[0],
                    "university": pair[1],
                    "guidePage": target["formulaPrintedPage"],
                    "pdfPage": page_number,
                    "ocrRaw": raw,
                    "matchScore": round(score, 4),
                })
                completed_codes.add(target["code"])
            output.sort(key=lambda row: row["code"])
            OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
            print(json.dumps({"page": page_number, "codes": [row["code"] for row in targets]}, ensure_ascii=False), flush=True)

    output.sort(key=lambda row: row["code"])
    if len(output) != 102 or len({row["code"] for row in output}) != 102:
        raise ValueError("Expected exactly 102 unique new codes")
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "codes": len(output),
        "minMatchScore": min(row["matchScore"] for row in output),
        "lowConfidence": [row["code"] for row in output if row["matchScore"] < .45],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
