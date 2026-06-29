"""Crop Arabic text lines for licence cells not resolvable from existing data."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import fitz
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "pdfs" / "guide2026.pdf"
CELLS = ROOT / "tmp" / "pdfs" / "guide2026_license_cells.json"
OUT = ROOT / "tmp" / "pdfs" / "guide2026_license_lines.json"
IMAGE_DIR = ROOT / "tmp" / "pdfs" / "guide2026_license_lines"


def bands(values: np.ndarray) -> list[list[int]]:
    result: list[list[int]] = []
    for value in values.tolist():
        if not result or value - result[-1][-1] > 2:
            result.append([value])
        else:
            result[-1].append(value)
    return result


def main() -> None:
    cells = json.loads(CELLS.read_text(encoding="utf-8"))
    unresolved = [cell for cell in cells if not cell["license"]]
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    output = []
    with fitz.open(PDF) as doc:
        for cell_index, cell in enumerate(unresolved):
            page = doc[cell["pdfPage"] - 1]
            info = [item for item in page.get_images(full=True) if item[2] >= 700 and item[3] >= 600][0]
            image = cv2.imdecode(np.frombuffer(doc.extract_image(info[0])["image"], np.uint8), cv2.IMREAD_COLOR)
            x0 = round(image.shape[1] * .795) + 5
            crop = image[cell["top"] + 1:cell["bottom"], x0:image.shape[1] - 8]
            if crop.size == 0:
                continue
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            projection = (gray < 180).sum(axis=1)
            text_bands = [group for group in bands(np.where(projection > 2)[0]) if len(group) >= 2]
            lines = []
            for line_index, group in enumerate(text_bands):
                y0 = max(0, group[0] - 4)
                y1 = min(crop.shape[0], group[-1] + 5)
                line = cv2.resize(crop[y0:y1], None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
                filename = f"cell{cell_index:03}_line{line_index:02}.png"
                cv2.imwrite(str(IMAGE_DIR / filename), line)
                lines.append(str((IMAGE_DIR / filename).relative_to(ROOT)).replace("\\", "/"))
            output.append({"cell": cell, "lines": lines})
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"cells": len(output), "lines": sum(len(x["lines"]) for x in output)}, indent=2))


if __name__ == "__main__":
    main()
