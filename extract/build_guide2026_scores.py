"""Replace the app dataset with the complete guide 2026 offering set."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CURRENT = ROOT / "public" / "data" / "scores.json"
FORMULAS = ROOT / "extract" / "guide2026_formula_by_license_bactype.json"
NEW_CATALOG = ROOT / "extract" / "guide2026_new_licenses.json"


def main() -> None:
    current = json.loads(CURRENT.read_text(encoding="utf-8"))
    formulas = json.loads(FORMULAS.read_text(encoding="utf-8"))
    new_catalog = json.loads(NEW_CATALOG.read_text(encoding="utf-8"))
    metadata = {row["code"]: row for row in current}
    metadata.update({row["code"]: row for row in new_catalog})

    output = []
    for row in formulas:
        source = metadata[row["code"]]
        output.append({
            "page": row["formulaPrintedPage"],
            "university": source["university"],
            "institution": source["institution"],
            "code": row["code"],
            "license": row["license"],
            "bacType": row["bacType"],
            "score": row["score"],
            "formula": row["formula"],
        })

    codes = {row["code"] for row in output}
    if len(codes) != 696 or len(output) != 3171:
        raise ValueError("Expected the validated 696-code, 3171-row guide 2026 dataset")
    if any(not row["institution"] or not row["university"] for row in output):
        raise ValueError("Every 2026 offering must have complete affiliation metadata")
    CURRENT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"rows": len(output), "codes": len(codes), "scoresUnavailable": sum(row["score"] is None for row in output)}))


if __name__ == "__main__":
    main()
