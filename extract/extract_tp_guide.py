"""Extract 2026 guide table data using fitz with proper NFKC normalization."""
import fitz, re, json, unicodedata
from pathlib import Path

CODE_RE = re.compile(r"^\d{5}$")
SCORE_RE = re.compile(r"^\d{2,3}(?:\.\d{1,4})?$")

OLD_PDF = Path(r"C:\Users\Yassine\Desktop\orientation\pdfs\guide_2026_tp.pdf")
NEW_PDF = Path(r"C:\Users\Yassine\Desktop\orientation\pdfs\guide_2026_tp 25juillet.pdf")
NEW_SCORES = Path(r"C:\Users\Yassine\Desktop\orientation\public\data\scores_25juillet.json")
DIFF_OUT = Path(r"C:\Users\Yassine\Desktop\orientation\public\data\diff_25juillet.json")

NON_INSTITUTIONS = {"مجموع اخر", "الاستيعاب", "موجه", "طاقة", ""}

def norm(t):
    return unicodedata.normalize("NFKC", t.strip())

def grouped_lines(page):
    blocks = page.get_text("dict")["blocks"]
    lines = []
    for block in blocks:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            text = " ".join(span["text"] for span in line["spans"]).strip()
            if text:
                x0 = min(s["bbox"][0] for s in line["spans"])
                lines.append((line["bbox"][1], x0, text))
    lines.sort(key=lambda t: (t[0], t[1]))
    grouped = []
    for y, x, t in lines:
        if not grouped or abs(y - grouped[-1][0]) > 2.0:
            grouped.append((y, []))
        grouped[-1][1].append((x, t))
    return grouped

def is_header_row(items):
    texts = norm(" ".join(t for _, t in items))
    return all(m in texts for m in ("الرمز", "الباكالوريا", "الشعبة"))

def is_university_line(text):
    return text.startswith("جامعة ") or text == "الإدارة العامة للدراسات التكنولوجية"

def is_data_row(text):
    """Skip non-data rows like subtotals."""
    t = norm(text)
    return t not in NON_INSTITUTIONS and not t.startswith("مجموع")

def extract_from_pdf(pdf_path, label):
    doc = fitz.open(pdf_path)
    all_records = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        rows = grouped_lines(page)
        pn = page_num + 1

        hdr_indices = [i for i, (y, items) in enumerate(rows) if is_header_row(items)]

        current_university = ""
        current_institution = ""

        for si, hi in enumerate(hdr_indices):
            # Extract metadata between headers
            prev_hdr = hdr_indices[si - 1] if si > 0 else -1
            meta_texts = []
            for i in range(prev_hdr + 1, hi):
                y, items = rows[i]
                text = " ".join(t for _, t in items)
                if re.search(r"\d{2,}", text):
                    continue  # skip data rows
                meta_texts.append(norm(text))

            for t in meta_texts:
                if is_university_line(t):
                    current_university = t
            inst_candidates = [t for t in meta_texts if not is_university_line(t) and len(t) >= 4 and t not in NON_INSTITUTIONS]
            if inst_candidates:
                current_institution = inst_candidates[-1]

            # Process data rows
            end = hdr_indices[si + 1] if si + 1 < len(hdr_indices) else len(rows)

            active_code = None
            active_license = ""

            for i in range(hi + 1, end):
                y, items = rows[i]
                items.sort(key=lambda t: t[0])

                score_text = ""
                capacity_text = ""
                formula_text = ""
                bac_text = ""
                code_text = ""
                license_parts = []

                for x, t in items:
                    if x < 55:
                        score_text = t
                    elif 55 <= x < 155:
                        formula_text = t
                    elif 155 <= x < 200:
                        bac_text = t
                    elif 200 <= x < 270:
                        code_text = t
                    else:
                        license_parts.append(t)

                cm = CODE_RE.search(code_text)
                if cm:
                    active_code = cm.group()
                    active_license = " ".join(license_parts)
                    # If no institution for this section yet, check license_parts
                    # The institution might be embedded in the license area
                    license_full = norm(active_license)
                    # Use current metadata-based institution as fallback

                if active_code and bac_text:
                    bac_clean = norm(bac_text)
                    if not bac_clean:
                        continue

                    score_val = None
                    sm = SCORE_RE.search(score_text)
                    if sm:
                        score_val = float(sm.group())
                    else:
                        parts = score_text.split()
                        for p in parts:
                            sm = SCORE_RE.search(p)
                            if sm:
                                score_val = float(sm.group())
                                break

                    all_records.append({
                        "page": pn,
                        "university": current_university,
                        "institution": current_institution,
                        "code": active_code,
                        "license": norm(active_license),
                        "bacType": bac_clean,
                        "score": score_val,
                        "formula": norm(formula_text),
                    })

    # Deduplicate: keep first occurrence of each (code, bacType)
    seen = set()
    unique = []
    for r in all_records:
        key = (r["code"], r["bacType"])
        if key not in seen:
            seen.add(key)
            unique.append(r)

    print(f"{label}: {len(unique)} rows, {len({r['code'] for r in unique})} codes")
    return unique


def compare(old, new):
    def key(r):
        return (r["code"], r["bacType"])

    old_d = {key(r): r for r in old}
    new_d = {key(r): r for r in new}

    old_codes = {r["code"] for r in old}
    new_codes = {r["code"] for r in new}

    added_codes = new_codes - old_codes
    removed_codes = old_codes - new_codes
    common_codes = old_codes & new_codes

    old_keys = set(old_d.keys())
    new_keys = set(new_d.keys())

    added_bac = sorted(new_keys - old_keys)
    removed_bac = sorted(old_keys - new_keys)

    changed = []
    for key in sorted(old_keys & new_keys):
        o = old_d[key]
        n = new_d[key]
        if o.get("score") != n.get("score") or o.get("institution") != n.get("institution") or o.get("university") != n.get("university"):
            changed.append({
                "code": key[0],
                "bacType": key[1],
                "old": {"university": o.get("university", ""), "institution": o.get("institution", ""), "score": o.get("score")},
                "new": {"university": n.get("university", ""), "institution": n.get("institution", ""), "score": n.get("score")},
            })

    return {
        "statistics": {
            "oldRows": len(old),
            "newRows": len(new),
            "oldCodes": len(old_codes),
            "newCodes": len(new_codes),
            "addedCodes": len(added_codes),
            "removedCodes": len(removed_codes),
            "addedBacRows": len(added_bac),
            "removedBacRows": len(removed_bac),
            "changedBacRows": len(changed),
        },
        "addedCodes": sorted(added_codes),
        "removedCodes": sorted(removed_codes),
        "addedBacRows": [{"code": k[0], "bacType": k[1]} for k in added_bac],
        "removedBacRows": [{"code": k[0], "bacType": k[1]} for k in removed_bac],
        "changedBacRows": changed,
    }


def main():
    old_records = extract_from_pdf(OLD_PDF, "Old PDF")
    new_records = extract_from_pdf(NEW_PDF, "New PDF")

    # Save new extraction (minified)
    NEW_SCORES.write_text(json.dumps(new_records, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Saved new extraction: {NEW_SCORES}")

    diff = compare(old_records, new_records)
    DIFF_OUT.write_text(json.dumps(diff, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved diff: {DIFF_OUT}")

    s = diff["statistics"]
    print(f"\n{'='*50}")
    print(f"  Old: {s['oldRows']} rows, {s['oldCodes']} codes")
    print(f"  New: {s['newRows']} rows, {s['newCodes']} codes")
    print(f"  Added codes: {s['addedCodes']}")
    print(f"  Removed codes: {s['removedCodes']}")
    print(f"  Added bac rows: {s['addedBacRows']}")
    print(f"  Removed bac rows: {s['removedBacRows']}")
    print(f"  Changed (score/inst): {s['changedBacRows']}")

    if diff["addedCodes"]:
        print(f"\n  Added codes: {', '.join(diff['addedCodes'])}")
    if diff["removedCodes"]:
        print(f"  Removed codes: {', '.join(diff['removedCodes'])}")


if __name__ == "__main__":
    main()
