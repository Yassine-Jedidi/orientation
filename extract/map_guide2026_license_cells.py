"""Map PDF codes to merged licence cells using right-column table borders."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import cv2
import fitz
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "pdfs" / "guide2026.pdf"
ROWS = ROOT / "tmp" / "pdfs" / "guide2026_formula_rows_with_bac.json"
SCORES = ROOT / "public" / "data" / "scores.json"
OUT = ROOT / "tmp" / "pdfs" / "guide2026_license_cells.json"


def grouped_lines(values: np.ndarray, gap: int = 2) -> list[int]:
    groups: list[list[int]] = []
    for value in values.tolist():
        if not groups or value - groups[-1][-1] > gap:
            groups.append([value])
        else:
            groups[-1].append(value)
    return [round(sum(group) / len(group)) for group in groups]


def main() -> None:
    rows = json.loads(ROWS.read_text(encoding="utf-8"))
    scores = json.loads(SCORES.read_text(encoding="utf-8"))
    known_license = {row["code"]: row["license"] for row in scores}
    rows_by_page = defaultdict(list)
    for row in rows:
        rows_by_page[row["pdfPage"]].append(row)

    cells = []
    with fitz.open(PDF) as doc:
        for page_number in range(69, 203):
            page = doc[page_number - 1]
            images = [item for item in page.get_images(full=True) if item[2] >= 700 and item[3] >= 600]
            if not images:
                continue
            image = cv2.imdecode(np.frombuffer(doc.extract_image(images[0][0])["image"], np.uint8), cv2.IMREAD_COLOR)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            x0 = round(image.shape[1] * .795)
            region = gray[:, x0:image.shape[1] - 4]
            dark = (region < 120).sum(axis=1)
            boundaries = grouped_lines(np.where(dark > region.shape[1] * .72)[0])
            if not boundaries:
                continue
            page_codes = {}
            for row in rows_by_page[page_number]:
                page_codes.setdefault(row["code"], row["codeY"])
            for code, y in sorted(page_codes.items(), key=lambda item: item[1]):
                upper = max((line for line in boundaries if line <= y), default=boundaries[0])
                lower = min((line for line in boundaries if line > y), default=boundaries[-1])
                key = (page_number, upper, lower)
                cell = next((item for item in cells if item["key"] == key), None)
                if cell is None:
                    cell = {"key": key, "pdfPage": page_number, "top": upper, "bottom": lower, "codes": []}
                    cells.append(cell)
                if code not in cell["codes"]:
                    cell["codes"].append(code)

    for cell in cells:
        names = {known_license[code] for code in cell["codes"] if code in known_license}
        cell["license"] = max(names, key=len) if names else None
        cell["key"] = list(cell["key"])
    OUT.write_text(json.dumps(cells, ensure_ascii=False, indent=2), encoding="utf-8")
    unresolved = [cell for cell in cells if not cell["license"]]
    print(json.dumps({
        "cells": len(cells),
        "resolvedFromExistingData": len(cells) - len(unresolved),
        "unresolvedCells": len(unresolved),
        "unresolvedCodes": sorted({code for cell in unresolved for code in cell["codes"]}),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
