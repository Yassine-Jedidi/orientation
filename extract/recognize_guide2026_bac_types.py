"""Stage 2: recognize and canonicalize Arabic bac-type cell crops with PaddleOCR."""

from __future__ import annotations

import difflib
import json
import re
from pathlib import Path

from paddleocr import TextRecognition


ROOT = Path(__file__).resolve().parents[1]
ROWS = ROOT / "tmp" / "pdfs" / "guide2026_formula_rows.json"
OUT = ROOT / "tmp" / "pdfs" / "guide2026_formula_rows_with_bac.json"

BAC_TYPES = (
    "آداب",
    "رياضيات",
    "علوم تجريبية",
    "إقتصاد وتصرف",
    "علوم الإعلامية",
    "العلوم التقنية",
    "رياضة",
)


def normalize(text: str) -> str:
    text = text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ة", "ه")
    return re.sub(r"[^\u0600-\u06ff]", "", text)


def canonicalize(text: str) -> tuple[str, float]:
    source = normalize(text)
    scores = [(difflib.SequenceMatcher(None, source, normalize(item)).ratio(), item) for item in BAC_TYPES]
    score, bac_type = max(scores)
    return bac_type, score


def main() -> None:
    rows = json.loads(ROWS.read_text(encoding="utf-8"))
    completed = 0
    if OUT.exists():
        previous = json.loads(OUT.read_text(encoding="utf-8"))
        for index, old in enumerate(previous):
            if "bacType" not in old:
                break
            rows[index].update({key: old[key] for key in ("bacType", "bacOcr", "bacOcrConfidence", "bacSimilarity")})
            completed += 1
    end = len(rows)
    paths = [str(ROOT / row["bacImage"]) for row in rows[completed:]]
    model = TextRecognition(model_name="arabic_PP-OCRv5_mobile_rec", enable_mkldnn=False)
    recognized = completed
    for row, prediction in zip(rows[completed:], model.predict(paths, batch_size=8)):
        result = prediction.json["res"]
        bac_type, similarity = canonicalize(result["rec_text"])
        row["bacType"] = bac_type
        row["bacOcr"] = result["rec_text"]
        row["bacOcrConfidence"] = round(float(result["rec_score"]), 4)
        row["bacSimilarity"] = round(similarity, 4)
        recognized += 1
        if recognized % 128 == 0:
            OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"recognized {recognized}/{len(rows)}", flush=True)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"recognized": recognized, "total": len(rows), "complete": recognized == len(rows)}, indent=2))


if __name__ == "__main__":
    main()
