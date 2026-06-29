"""Recognize the small set of unresolved licence-name lines."""

from __future__ import annotations

import json
import argparse
from pathlib import Path

from paddleocr import TextRecognition


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp" / "pdfs" / "guide2026_license_lines.json"
OUT = ROOT / "tmp" / "pdfs" / "guide2026_license_lines_recognized.json"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--count", type=int, default=64)
    args = parser.parse_args()
    cells = json.loads(SOURCE.read_text(encoding="utf-8"))
    paths = [str(ROOT / path) for cell in cells for path in cell["lines"]]
    selected = paths[args.start:args.start + args.count]
    model = TextRecognition(model_name="arabic_PP-OCRv5_mobile_rec", enable_mkldnn=False)
    predictions = list(model.predict(selected, batch_size=16))
    output = [{"index": args.start + i, "text": item.json["res"]["rec_text"]} for i, item in enumerate(predictions)]
    out = OUT.with_name(f"{OUT.stem}_{args.start:03}.json")
    out.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"start": args.start, "lines": len(output)}, indent=2))


if __name__ == "__main__":
    main()
