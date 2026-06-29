# Guide 2026 Formula Extraction Approach

## Scope and result

The extraction reads only the admission tables on PDF pages **69 through 202**
of `pdfs/guide2026.pdf`. The laureates material around page 31 is not part of
the extraction.

The final artifact is:

- `extract/guide2026_formula_by_license_bactype.json`

It contains one record for every unique `(code, bacType)` printed in the
requested tables. A formula is therefore attached to the individual bac row,
not merely to the licence code.

Verified output totals:

- 3,171 unique licence/bac rows
- 696 distinct licence codes
- 45 distinct formula expressions
- PDF-page coverage from page 69 through the final table page, page 201
- zero duplicate `(code, bacType)` pairs
- zero empty `code`, `license`, `bacType`, or `formula` values

Page 202 is included in the scanned range but contains no admission table rows.

## Why code-level extraction was insufficient

A licence code can have different formulas for different bac types. For
example, the rows under one code may use formulas based on different bac
subjects. Selecting the most frequent formula for a code would silently assign
the wrong formula to some bac rows.

The extraction therefore reconstructs every visible table row and preserves
its vertical position within the licence group.

## Stage 1: Read table images and reconstruct rows

Script:

- `extract/extract_guide2026_formula_rows.py`

The admission tables are embedded as page images rather than semantic PDF
tables. For each table image, the extractor:

1. reads only pages 69-202;
2. OCRs the narrow numeric/formula band;
3. detects five-digit licence codes;
4. detects every Latin formula expression;
5. assigns each formula row to the code cell spanning its vertical position;
6. reads the printed 2025 score when present;
7. crops the Arabic bac-type cell at the same row position;
8. retains PDF and printed-page references for auditing.

Numeric codes and Latin formulas use RapidOCR. Formula strings are normalized
against the complete formula vocabulary observed in the guide while the raw OCR
reading is retained in the temporary audit data.

## Stage 2: Recognize each bac-type cell

Scripts:

- `extract/recognize_guide2026_bac_chunk.py`
- `extract/recognize_guide2026_bac_types.py`

The Arabic bac crops are recognized with the Arabic PaddleOCR recognition
model. Recognition is run in isolated chunks because long Paddle inference runs
on Windows can leak native memory.

Each OCR reading is mapped to one of the seven canonical bac labels:

1. آداب
2. رياضيات
3. علوم تجريبية
4. إقتصاد وتصرف
5. العلوم التقنية
6. علوم الإعلامية
7. رياضة

Within each licence code, bac rows must form a strictly ordered subset of this
sequence. The builder chooses the ordered subset with the best total OCR
similarity. This constraint corrects weak readings without inventing or
duplicating bac rows.

When the printed 2025 score exactly matches an existing structured score row,
that score provides an additional authoritative bac-type check. This validation
matched 2,386 rows and corrected the six remaining ambiguous OCR assignments.

## Stage 3: Recover licence names, including new 2026 codes

Scripts:

- `extract/map_guide2026_license_cells.py`
- `extract/extract_guide2026_license_lines.py`
- `extract/recognize_guide2026_license_lines.py`

The rightmost licence column contains vertically merged cells. Horizontal table
borders are detected from pixel projections, allowing every code to be assigned
to its licence cell.

Most cells contain at least one code already known to the repository, so their
clean structured Arabic licence title can be reused. The remaining 31 cells
contain new 2026 codes. Their individual text lines are cropped from the PDF,
recognized with Arabic PaddleOCR, and visually checked against the rendered
cells. This produces non-empty licence titles for all 696 codes.

## Stage 4: Build and validate the final JSON

Script:

- `extract/build_guide2026_complete_formula_json.py`

The builder combines row geometry, bac recognition, formula recognition, and
licence-cell metadata. It refuses to write a successful result unless:

- every row belongs to pages 69-202;
- all 696 licence codes are present;
- every `(code, bacType)` pair is unique;
- every `license`, `bacType`, and `formula` is non-empty.

The existing `public/data/scores.json` is used only as read-only metadata and as
a score-based validation source. The extraction is **not merged into the app
table or scores dataset** at this stage.

## Rebuilding the extraction

The practical sequence is:

1. run `extract_guide2026_formula_rows.py` with the normal project Python;
2. run the bac recognizer chunks with the bundled Python containing PaddleOCR;
3. combine the chunk results into
   `tmp/pdfs/guide2026_formula_rows_with_bac.json`;
4. run `map_guide2026_license_cells.py`;
5. OCR and review any unresolved licence cells;
6. run `build_guide2026_complete_formula_json.py`;
7. validate the final JSON and its coverage statistics.

Temporary crops and OCR audit records remain under `tmp/pdfs/`; the only final
data artifact is `extract/guide2026_formula_by_license_bactype.json`.
