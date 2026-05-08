# Kuarters Extractor Logic

This extractor handles Kuarters document parsing for uploaded `.xlsx` and `.pdf` files. The public entry point is:

```py
extract_kuarters_document(file_bytes, filename, parsing_mode, limit)
```

## Output Shape

The extractor returns only the fields needed by the upload review flow:

```json
{
  "documentType": "kuarters",
  "recordCount": 1,
  "totalUnits": 2,
  "parsingMode": "strict",
  "records": [
    {
      "id": "category-address-rates-key",
      "categoryName": "C",
      "address": "Blok A, Jalan UTM 1",
      "rentalPrice": "450",
      "maintenancePrice": "50",
      "penaltyPrice": "0",
      "unitCount": 2,
      "units": [
        {
          "unitCode": "JB-K01-A-01",
          "address": "Blok A, Jalan UTM 1"
        }
      ]
    }
  ]
}
```

`categoryName` is the Kuarters category/grouping. `address` is the physical address when available. If the source document has no separate address because the category already carries the location, `address` is set to `N/A`.

## Parsing Modes

`strict`

Rule-based parsing only. If extraction or validation fails, the extractor stops and returns an error. It does not call Gemini.

`assisted`

Rule-based parsing is attempted first. If the rule result does not pass validation, the extractor sends only the invalid records/rows to Gemini for repair instead of sending the whole document. This keeps token usage lower and avoids asking Gemini to re-process large files that were mostly parsed correctly.

## XLSX Rule Extraction

1. Read workbook XML directly through `read_xlsx`.
2. Iterate through all sheets.
3. Find a header row using known aliases for:
   - category/kategori
   - unit code
   - address
   - rental price
   - maintenance price
   - penalty price
4. Read every row after the header.
5. Skip summary rows such as `JUMLAH`, `ISI`, `KOSONG`, and similar labels.
6. Normalize:
   - unit codes, for example removing trailing `.0`
   - money values, for example `tiada` becomes `0`
7. Group units under categories using:
   - `categoryName`
   - `address`
   - rental price
   - maintenance price
   - penalty price

The returned `categoryName` stays exactly as extracted from the category/kawasan column or sheet context. The extractor does not infer unit types from maintenance text.

The extractor supports multi-sheet files.

## PDF Rule Extraction

1. Read every page with `pypdf`.
2. Extract text per page.
3. Rebuild table-like rows from line text.
4. Detect the header row with the same alias list used by XLSX.
5. Chunk page lines into row-sized records.
6. Parse rows through the same category/unit parser used by XLSX.

The extractor supports multi-page PDF files.

## Header Flexibility

The extractor maps different possible column names into canonical fields. Examples:

`categoryName`

- `KATEGORI`
- `KAWASAN`
- `KATEGORI KAWASAN`
- `NAMA KUARTERS`
- `CATEGORY`

`unitCode`

- `NO UNIT`
- `NO. UNIT`
- `UNIT`
- `KOD UNIT`
- `UNIT CODE`

`address`

- `ALAMAT`
- `ALAMAT KUARTERS`
- `LOKASI`
- `ADDRESS`
- `QUARTERS ADDRESS`

`rentalPrice`, `maintenancePrice`, and `penaltyPrice` also accept Malay and English variants.

## Validation

Before a result is returned, the extractor validates:

- at least one category record exists
- `categoryName` is present
- missing `address` is normalized to `N/A`
- invalid rental, maintenance, and penalty values are normalized to `0`
- each category has at least one unit
- each unit has a `unitCode`
- duplicate units within the extracted document are rejected

Validation applies to both rule-based and Gemini-assisted results.

## Gemini Assisted Parsing

Gemini is used only in `assisted` mode after rule parsing produces records that fail validation.

The assisted repair flow is:

1. Rule extraction parses the document.
2. Validation identifies incomplete records, such as missing category, missing unit code, missing unit list, or invalid price fields.
3. Only those invalid records are sent to Gemini with a repair prompt.
4. Gemini must return corrected JSON for the invalid records only.
5. The repaired records are merged back into the rule-based result.
6. If Gemini cannot repair the data, the extractor applies conservative defaults:
   - invalid `rentalPrice`, `maintenancePrice`, and `penaltyPrice` become `0`
   - missing optional string fields such as `address` become `N/A`
   - required business fields such as `categoryName` and `unitCode` are never set to `N/A`
   - unresolved `categoryName` becomes `Kategori Tidak Dikenal`
   - unresolved `unitCode` becomes a unique `UNIT-TIDAK-DIKENAL-*` value

The extractor reads API keys from environment variables in this order:

1. `GEMINI_API_KEY_1`
2. `GEMINI_API_KEY_2`
3. Continue through `GEMINI_API_KEY_50`

Empty keys are skipped. Duplicate key values are skipped. If a key fails, the extractor tries the next key.

Use `ai_service/.env.example` as the template for configuring keys.

## Important Business Rules

- `address` is never treated as `kawasan`.
- If no separate address is extracted, `address` is stored as `N/A`.
- Maintenance is taken directly from the `senggara` cell. The extractor does not infer `Type A` or `Type B` from unit codes. If the value is not a single valid amount, it is stored as `0`.
- `categoryName` identifies the Kuarters category/grouping.
- Existing duplicate database checks happen in the Next.js backend, not in this Python extractor.
- This extractor only returns structured extracted data; it does not create or update database rows.
