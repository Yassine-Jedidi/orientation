"""Fetch missing formulas from orientini.com and update data files."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCORES_PATH = ROOT / "public" / "data" / "scores.json"
MISSING_PATH = ROOT / "extract" / "scores_without_formulas.json"
FORMULA_SOURCE = "orientini"

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def fetch_url(url: str) -> str | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} for {url}")
        return None
    except Exception as e:
        print(f"  Error fetching {url}: {e}")
        return None


def extract_formula(html: str) -> str | None:
    m = re.search(
        r'<div\s+class="ori-info-value">(FG[^<]+)</div>',
        html,
    )
    if m:
        return m.group(1).strip()

    m = re.search(
        r'مجموعك لهذه الشعبة\s*:\s*(FG[^<]+?)\s*=\s*<b>\d',
        html,
        re.DOTALL,
    )
    if m:
        formula = m.group(1).strip()
        return re.sub(r'\s+', '', formula)

    m = re.search(
        r'class="filiere_branche"[^>]*>مجموعك لهذه الشعبة[^:]*:\s*<span[^>]*dir="ltr"[^>]*>(FG[^<]+?)\s*=',
        html,
        re.DOTALL,
    )
    if m:
        formula = m.group(1).strip()
        return re.sub(r'\s+', '', formula)
    return None


def get_license_code(program_code: str) -> str:
    known = {
        "80159": "159",
        "40161": "161",
        "10360": "360",
        "10840": "840",
        "75842": "842",
        "84506": "506",
        "10453": "453",
        "10548": "548",
        "34550": "550",
        "40550": "550",
        "50550": "550",
        "36551": "551",
        "40576": "576",
        "50576": "576",
    }
    if program_code in known:
        return known[program_code]
    last3 = program_code[-3:]
    return last3


def main() -> None:
    missing_data = json.loads(MISSING_PATH.read_text(encoding="utf-8"))

    missing_rows = [r for r in missing_data if not r.get("formula")]
    print(f"Rows without formula: {len(missing_rows)}")

    unique_codes = sorted({r["code"] for r in missing_rows})
    print(f"Unique program codes: {len(unique_codes)}")

    license_to_programs: dict[str, set[str]] = {}
    for code in unique_codes:
        lic = get_license_code(code)
        license_to_programs.setdefault(lic, set()).add(code)

    print(f"Unique license codes: {len(license_to_programs)}")
    for lic, progs in sorted(license_to_programs.items()):
        print(f"  License {lic}: ({len(progs)} program codes)")

    license_to_formula: dict[str, str] = {}

    for lic in sorted(license_to_programs.keys()):
        prog_codes = sorted(license_to_programs[lic])
        sample_code = prog_codes[0]

        for attempt_url in [
            f"https://www.orientini.com/fiche_filiere.php?code={sample_code}",
            f"https://orientini.com/parcour.php?ID={lic}",
        ]:
            print(f"\nFetching license {lic} via {attempt_url}...")
            html = fetch_url(attempt_url)
            if html is None:
                continue
            formula = extract_formula(html)
            if formula:
                print(f"  Found formula: {formula}")
                license_to_formula[lic] = formula
                break
            else:
                print(f"  No formula found on this page")
            time.sleep(1)

    print(f"\n\nFormulas found: {len(license_to_formula)} / {len(license_to_programs)}")
    for lic, formula in sorted(license_to_formula.items()):
        print(f"  License {lic}: {formula}")

    updated_rows = 0
    for row in missing_data:
        if row.get("formula"):
            continue
        lic = get_license_code(row["code"])
        formula = license_to_formula.get(lic)
        if formula:
            row["formula"] = formula
            row["formulaSource"] = FORMULA_SOURCE
            updated_rows += 1

    print(f"\nUpdated rows: {updated_rows}")
    still_missing = sum(1 for r in missing_data if not r.get("formula"))
    print(f"Still missing: {still_missing}")

    MISSING_PATH.write_text(
        json.dumps(missing_data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    scores = json.loads(SCORES_PATH.read_text(encoding="utf-8"))
    missing_by_code_bac = {
        (r["code"], r["bacType"]): r.get("formula", r.get("formula"))
        for r in missing_data
    }
    score_updated = 0
    for row in scores:
        key = (row["code"], row["bacType"])
        if key in missing_by_code_bac:
            formula = missing_by_code_bac[key]
            if formula:
                row["formula"] = formula
                score_updated += 1

    SCORES_PATH.write_text(
        json.dumps(scores, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Scores updated: {score_updated}")

    total_with = sum(1 for r in scores if r.get("formula"))
    print(f"Total rows with formula in scores.json: {total_with}")
    print(f"Total rows in scores.json: {len(scores)}")


if __name__ == "__main__":
    main()
