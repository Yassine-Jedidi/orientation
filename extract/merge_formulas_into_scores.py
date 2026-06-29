"""Merge extracted 2026 formulas into public/data/scores.json safely.

This script rebuilds scores.json from the repository version at HEAD, then
attaches formulas by (code, bacType) where a match exists.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCORES_PATH = ROOT / "public" / "data" / "scores.json"
FORMULAS_PATH = ROOT / "extract" / "guide2026_formula_by_license_bactype.json"


def load_head_scores() -> list[dict]:
    text = subprocess.check_output(
        ["git", "show", "HEAD:public/data/scores.json"],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
    )
    return json.loads(text)


def load_formulas() -> dict[tuple[str, str], str]:
    rows = json.loads(FORMULAS_PATH.read_text(encoding="utf-8"))
    return {(row["code"], row["bacType"]): row["formula"] for row in rows}


def main() -> None:
    scores = load_head_scores()
    formulas = load_formulas()

    updated_rows = 0
    unmatched_rows = 0

    for row in scores:
        formula = formulas.get((row["code"], row["bacType"]))
        if formula is None:
            unmatched_rows += 1
            row.pop("formula", None)
            continue
        row["formula"] = formula
        updated_rows += 1

    SCORES_PATH.write_text(
        json.dumps(scores, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "total_rows": len(scores),
                "rows_with_formula": updated_rows,
                "rows_without_formula": unmatched_rows,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
