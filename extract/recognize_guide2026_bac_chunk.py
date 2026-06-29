"""Recognize one bounded chunk of bac cells in an isolated process."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from paddleocr import TextRecognition

from recognize_guide2026_bac_types import ROOT, ROWS, canonicalize


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, required=True)
    parser.add_argument("--count", type=int, default=64)
    args = parser.parse_args()
    rows = json.loads(ROWS.read_text(encoding="utf-8"))
    selected = rows[args.start:args.start + args.count]
    paths = [str(ROOT / row["bacImage"]) for row in selected]
    model = TextRecognition(model_name="arabic_PP-OCRv5_mobile_rec", enable_mkldnn=False)
    output = []
    for index, prediction in enumerate(model.predict(paths, batch_size=16), args.start):
        result = prediction.json["res"]
        bac_type, similarity = canonicalize(result["rec_text"])
        output.append({
            "index": index,
            "bacType": bac_type,
            "bacOcr": result["rec_text"],
            "bacOcrConfidence": round(float(result["rec_score"]), 4),
            "bacSimilarity": round(similarity, 4),
        })
    out = ROOT / "tmp" / "pdfs" / "bac_chunks" / f"{args.start:04}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(output, ensure_ascii=False), encoding="utf-8")
    print(f"{args.start}: {len(output)}")


if __name__ == "__main__":
    main()
