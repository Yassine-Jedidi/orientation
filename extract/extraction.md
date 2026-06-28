# Extraction Method

## Source

`pdfs/SD_TN_2025.pdf` — Tunisian university orientation guide for 2025 (82 pages).

## Approach

Position-based table extraction using [pdfplumber](https://github.com/jsvine/pdfplumber).

### Why pdfplumber

Unlike `pypdf` (text-only), pdfplumber gives each word's bounding box `(x0, x1, top, text)`, allowing reliable column-to-field mapping and table structure reconstruction despite the PDF having no semantic table tags.

### Row clustering

Words are grouped into rows using a 1-point vertical tolerance:

This separates data rows (~14pt apart) while keeping glyphs such as `270.492`
and `270.502` together. Simple rounding split those values across adjacent integer
bins and caused two licenses to be emitted empty.

### Column ranges

Columns are defined by x-coordinate ranges, liberalized to accommodate per-page drift:

| Field      | X range     |
|------------|-------------|
| Score      | 35 – 130    |
| Bac type   | 110 – 230   |
| License    | 270 – 500   |
| Code       | 495 – 560   |

A word falls into the first matching column; the order checked is Code → License → Bac → Score (most specific first).

### Merged cells

The PDF uses merged cells where a single **code+license** spans multiple **bac+score** rows. The extractor:

1. Scans for sub-table header rows (containing `عومجملا`, `ايرولاكابلا`, `ةبعشلا` at their respective columns).
2. Between headers, groups data rows by code: rows with a code start a new group; rows without code are continuation pairs for the current group.
3. Emits one record per `(code, bac, score)` triple, repeating the code+license across all bac types.

### Arabic text

pdfplumber returns Arabic presentation-form glyphs in visual order. The extractor
first reverses Arabic presentation-form glyphs into logical order and then applies
Unicode NFKC normalization. This ordering preserves lam-alef ligatures correctly
(for example `ﺓﺯﺎﺟﻹﺍ` becomes `الإجازة`, and `ﺝﻼﻌﻟﺍ` becomes `العلاج`).
Whitespace is also collapsed to a single space.

### Duplicate prevention

Exact duplicate records are removed using all seven output fields as the key.
Validation fails if empty required fields or duplicates remain.

### University & institution detection

- **University**: tracked before every sub-table header, because a university can
  change midway through a page. Valid owner headings start with `جامعة`, or exactly
  match `الإدارة العامة للدراسات التكنولوجية`; ordinary institution names
  containing words such as `إدارة الأعمال` are not mistaken for universities.
- **Institution**: extracted from the remaining metadata lines between consecutive
  header rows, filtering out codes and scores.

### Header text matching

Only definite-article forms (`عومجملا`, `ايرولاكابلا`, `ةبعشلا`) are used as header row markers to avoid false matches with indefinite forms in page footers (e.g., `عومجم`).

### License row offset

On rare occasions, the license text sits at a slightly different y coordinate (~1pt offset) from its code. The extractor checks: if a row contains license text but no code, and the current active group has an empty license, it backfills the group.

## Output

| File                            | Format       | Records |
|---------------------------------|--------------|---------|
| `public/data/scores.json`       | JSON (minified) | 2734 |
| `data/SD_TN_2025_scores.csv`    | CSV (utf-8-sig) | 2734 |

### Schema

```json
{
  "page": 1,
  "university": "جامعة تونس",
  "institution": "كلية العلوم بتونس",
  "code": "10101",
  "license": "مرحلة تحضيرية مندمجة في هندسة الشبكة",
  "bacType": "رياضيات",
  "score": 212.2492
}
```

## Stats

- **2734** records, **688** unique codes
- **13** universities, **7** bac types
- Score range: 61.07 – 221.35
- 0 empty fields (university, institution, code, license, bacType, score)
