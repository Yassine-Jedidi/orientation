"""Build the UI-ready catalog for codes newly appearing in guide 2026."""

from __future__ import annotations

import json
import urllib.request
from collections import defaultdict
from pathlib import Path

from rapidfuzz.fuzz import ratio


ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / "public" / "data" / "scores.json"
FORMULAS = ROOT / "extract" / "guide2026_formula_by_license_bactype.json"
AFFILIATIONS = ROOT / "extract" / "guide2026_new_license_affiliations.json"
OUT = ROOT / "extract" / "guide2026_new_licenses.json"
REMOTE_DATA = "https://www.tariqi.tn/data.json"


def main() -> None:
    old = json.loads(OLD.read_text(encoding="utf-8"))
    formulas = json.loads(FORMULAS.read_text(encoding="utf-8"))
    affiliations = json.loads(AFFILIATIONS.read_text(encoding="utf-8"))
    old_codes = {row["code"] for row in old}
    old_institutions = sorted({row["institution"] for row in old})
    parent_by_institution = {row["institution"]: row["university"] for row in old}

    request = urllib.request.Request(REMOTE_DATA, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request) as response:
        remote = json.load(response)
    remote_institution = {}
    for row in remote:
        remote_institution.setdefault(str(row["code"]), row["university"])
    remote_institution["80512"] = "كلية العلوم بقابس"

    rows_by_code = defaultdict(list)
    for row in formulas:
        if row["code"] not in old_codes:
            rows_by_code[row["code"]].append(row)

    output = []
    for affiliation in affiliations:
        code = affiliation["code"]
        institution = remote_institution.get(code)
        if not institution:
            raise ValueError(f"No verified institution for {code}")
        canonical = max(old_institutions, key=lambda value: ratio(institution, value))
        university = parent_by_institution[canonical]
        code_rows = rows_by_code[code]
        output.append({
            "code": code,
            "license": code_rows[0]["license"],
            "institution": institution,
            "university": university,
            "guidePage": code_rows[0]["formulaPrintedPage"],
            "formulas": [
                {"bacType": row["bacType"], "formula": row["formula"]}
                for row in code_rows
            ],
        })

    output.sort(key=lambda row: row["code"])
    if len(output) != 102 or any(not row["institution"] or not row["university"] for row in output):
        raise ValueError("Catalog must contain 102 fully affiliated codes")
    if any(not row["formulas"] for row in output):
        raise ValueError("Every code must have at least one bac formula")
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "codes": len(output),
        "institutions": len({row["institution"] for row in output}),
        "universities": len({row["university"] for row in output}),
        "formulaRows": sum(len(row["formulas"]) for row in output),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
