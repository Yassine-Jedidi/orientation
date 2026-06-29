"""Build and strictly validate the complete 2026 licence × bac formula JSON."""

from __future__ import annotations

import difflib
import itertools
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROWS = ROOT / "tmp" / "pdfs" / "guide2026_formula_rows_with_bac.json"
CELLS = ROOT / "tmp" / "pdfs" / "guide2026_license_cells.json"
SCORES = ROOT / "public" / "data" / "scores.json"
OUT = ROOT / "extract" / "guide2026_formula_by_license_bactype.json"

BAC_ORDER = ["آداب", "رياضيات", "علوم تجريبية", "إقتصاد وتصرف", "العلوم التقنية", "علوم الإعلامية", "رياضة"]


def normalize(text: str) -> str:
    text = text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ة", "ه")
    return re.sub(r"[^\u0600-\u06ff]", "", text)

NEW_LICENSES = {
    "10163": "الإجازة في علم المتاحف والوساطة والتصرف في التراث",
    "10165": "الإجازة في تسويق التراث",
    "10166": "الإجازة في الآثار وتاريخ الفن",
    "60478": "الإجازة في التربية الدامجة والبيداغوجيا الرقمية",
    "24479": "الإجازة في الهندسة البيداغوجية والتقنيات المبتكرة",
    "10613": "الإجازة في الميديا والسرديات الرقمية",
    "10442": "الإجازة في التنشيط الشبابي",
    "10313": "الإجازة في المالية الإسلامية",
    "13314": "الإجازة في تحليلات الأعمال والاقتصاد",
    "75506": "الإجازة في علوم المواد",
    "40508": "الإجازة في الكيمياء-بيولوجيا",
    "60508": "الإجازة في الكيمياء-بيولوجيا",
    "10511": "الإجازة في المعلوماتية الحيوية",
    "11511": "الإجازة في المعلوماتية الحيوية",
    "12511": "الإجازة في المعلوماتية الحيوية",
    "10527": "الإجازة في البيولوجيا والفيزياء",
    "20528": "الإجازة في الهندسة الفيزيائية",
    "11529": "الإجازة في علوم وتكنولوجيات البيئة",
    "10530": "الإجازة في إدارة الأنظمة البيولوجية",
    "40531": "الإجازة في التكنولوجيات الحديثة في علوم الحياة",
    "75553": "الإجازة في علوم الأجهزة والقياس",
    "34575": "الإجازة في الإدارة الصناعية لمؤسسات النسيج والملابس",
    "34588": "الإجازة في علوم الإعلامية: البيانات الضخمة وتحليل البيانات",
    "50588": "الإجازة في علوم الإعلامية: البيانات الضخمة وتحليل البيانات",
    "50600": "الإجازة في الطاقة والسلامة والبيئة",
    "50615": "الإجازة في الهندسة المالية",
    "50674": "الإجازة في الميكاترونيك",
    "50552": "الإجازة في القياس وصيانة الأجهزة الطبية",
    "84761": "الإجازة في علوم التقنية التطبيقية في الإنتاج النباتي",
    "10841": "الإجازة في علوم وتقنيات الأغذية",
    "75843": "الإجازة في تقنيات الأغذية والتحكم في الجودة",
    "75845": "الإجازة في هندسة تكنولوجيات الصناعات الغذائية",
}


def similarity(raw: str, bac_type: str) -> float:
    return difflib.SequenceMatcher(None, normalize(raw), normalize(bac_type)).ratio()


def impose_bac_order(rows: list[dict]) -> None:
    """Choose the best strictly ordered bac-type subset for every licence code."""
    by_code: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        by_code[row["code"]].append(row)
    for code_rows in by_code.values():
        code_rows.sort(key=lambda row: (row["pdfPage"], row["imageNumber"], row["rowY"]))
        count = len(code_rows)
        choices = itertools.combinations(range(len(BAC_ORDER)), count)
        best = max(
            choices,
            key=lambda choice: sum(similarity(row["bacOcr"], BAC_ORDER[index]) for row, index in zip(code_rows, choice)),
        )
        for row, index in zip(code_rows, best):
            row["bacType"] = BAC_ORDER[index]


def main() -> None:
    rows = json.loads(ROWS.read_text(encoding="utf-8"))
    scores = json.loads(SCORES.read_text(encoding="utf-8"))
    cells = json.loads(CELLS.read_text(encoding="utf-8"))
    impose_bac_order(rows)

    scores_by_code: dict[str, list[dict]] = defaultdict(list)
    for score_row in scores:
        scores_by_code[score_row["code"]].append(score_row)
    for row in rows:
        if row["score2025"] is None or row["code"] not in scores_by_code:
            continue
        match = min(scores_by_code[row["code"]], key=lambda item: abs(item["score"] - row["score2025"]))
        if abs(match["score"] - row["score2025"]) < .06:
            row["bacType"] = match["bacType"]

    metadata = {}
    for row in scores:
        metadata.setdefault(row["code"], row)
    license_by_code = {}
    for cell in cells:
        if cell["license"]:
            for code in cell["codes"]:
                license_by_code[code] = cell["license"]
    license_by_code.update(NEW_LICENSES)

    output = []
    for row in sorted(rows, key=lambda item: (item["pdfPage"], item["imageNumber"], item["codeY"], item["rowY"])):
        source = metadata.get(row["code"], {})
        output.append({
            "university": source.get("university", ""),
            "institution": source.get("institution", ""),
            "code": row["code"],
            "license": license_by_code.get(row["code"], source.get("license", "")),
            "bacType": row["bacType"],
            "score": row["score2025"],
            "formula": (
                "FG+(M+Algo+2Ang)/4"
                if row["formulaOcr"].replace(" ", "") == "FG+(M+Algo+2Ang)/4"
                else row["formula"]
            ),
            "formulaPdfPage": row["pdfPage"],
            "formulaPrintedPage": row["printedPage"],
        })

    pairs = [(row["code"], row["bacType"]) for row in output]
    if len(pairs) != len(set(pairs)):
        raise ValueError("Duplicate (code, bacType) rows remain")
    if any(not row["license"] or not row["formula"] or not row["bacType"] for row in output):
        raise ValueError("A required extraction field is empty")
    if any(not 69 <= row["formulaPdfPage"] <= 202 for row in output):
        raise ValueError("A row is outside requested PDF pages 69-202")
    if len({row["code"] for row in output}) != 696:
        raise ValueError("Expected 696 distinct licence codes")

    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "rows": len(output),
        "codes": len({row["code"] for row in output}),
        "pairs": len(set(pairs)),
        "formulas": len({row["formula"] for row in output}),
        "pages": [min(row["formulaPdfPage"] for row in output), max(row["formulaPdfPage"] for row in output)],
    }, indent=2))


if __name__ == "__main__":
    main()
