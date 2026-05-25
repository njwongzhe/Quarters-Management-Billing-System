from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
import json
import re
import urllib.error
import urllib.request

from pypdf import PdfReader

from extractors.shared import (
    build_header_map_for,
    clean_header,
    gemini_api_keys,
    get_cell,
    read_xlsx,
)


PARSING_MODE_STRICT = "strict"
PARSING_MODE_ASSISTED = "assisted"

HEADER_ALIASES: dict[str, tuple[str, ...]] = {
    "nama": (
        "NAMA PENGHUNI",
        "NAMA",
        "NAMA PENUH",
        "NAMA PENYEWA",
        "NAMA PEGAWAI",
        "PENGHUNI",
    ),
    "noKadPengenalan": (
        "NO KAD PENGENALAN",
        "NO. KAD PENGENALAN",
        "NO. K.P",
        "NO K.P",
        "NO KP",
        "NO K P",
        "NO KAD PENGENALAN BARU",
        "NO IC",
        "IC",
        "KAD PENGENALAN",
        "NO MYKAD",
        "MYKAD",
    ),
    "jumlahTunggakan": (
        "TUNGGAKAN",
        "JUMLAH TUNGGAKAN",
        "JUMLAH TUNGGAKAN RM",
        "TUNGGAKAN RM",
        "AMAUN TUNGGAKAN",
        "BAKI TUNGGAKAN",
        "ARREARS",
        "TOTAL ARREARS",
    ),
}

REQUIRED_FIELDS = ("nama", "noKadPengenalan", "jumlahTunggakan")


@dataclass(frozen=True)
class ExtractedArrears:
    nama: str
    noKadPengenalan: str
    jumlahTunggakan: str

    def to_response(self) -> dict[str, str]:
        return {
            "nama": self.nama,
            "noKadPengenalan": self.noKadPengenalan,
            "jumlahTunggakan": self.jumlahTunggakan,
        }


def extract_tunggakan_document(
    file_bytes: bytes,
    filename: str,
    parsing_mode: str = PARSING_MODE_STRICT,
    limit: int | None = None,
) -> dict:
    normalized_mode = _normalize_parsing_mode(parsing_mode)
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension == "xlsx":
        return extract_tunggakan_from_xlsx(
            file_bytes,
            parsing_mode=normalized_mode,
            limit=limit,
        )
    if extension == "pdf":
        return extract_tunggakan_from_pdf(
            file_bytes,
            parsing_mode=normalized_mode,
            limit=limit,
        )

    raise ValueError("Sila muat naik fail .xlsx atau .pdf sahaja.")


def extract_tunggakan_from_xlsx(
    file_bytes: bytes,
    parsing_mode: str = PARSING_MODE_STRICT,
    limit: int | None = None,
) -> dict:
    normalized_mode = _normalize_parsing_mode(parsing_mode)
    workbook = read_xlsx(file_bytes)
    arrears: list[ExtractedArrears] = []
    repair_candidates: list[dict] = []

    for sheet in workbook["sheets"]:
        header_index = _find_header_row(sheet["rows"])
        if header_index is None:
            continue

        header_map = build_header_map_for(sheet["rows"][header_index], HEADER_ALIASES)

        for row_offset, row in enumerate(
            sheet["rows"][header_index + 1 :],
            start=header_index + 2,
        ):
            record, issues = _arrears_from_row(row, header_map)
            if record is None:
                if normalized_mode == PARSING_MODE_ASSISTED and _row_has_possible_arrears_data(row):
                    repair_candidates.append(
                        _repair_candidate(sheet["name"], row_offset, row, header_map, issues)
                    )
                continue

            if normalized_mode == PARSING_MODE_ASSISTED and issues:
                repair_candidates.append(
                    _repair_candidate(sheet["name"], row_offset, row, header_map, issues, record)
                )
                continue

            arrears.append(record)
            if limit is not None and len(_dedupe_arrears(arrears)) >= limit:
                return _with_parsing_metadata(
                    _build_response(workbook["sheet_names"], arrears, limit=limit),
                    normalized_mode,
                )

    if normalized_mode == PARSING_MODE_ASSISTED and repair_candidates:
        arrears.extend(_repair_tunggakan_with_gemini(repair_candidates))

    return _with_parsing_metadata(
        _build_response(workbook["sheet_names"], arrears, limit=limit),
        normalized_mode,
    )


def extract_tunggakan_from_pdf(
    file_bytes: bytes,
    parsing_mode: str = PARSING_MODE_STRICT,
    limit: int | None = None,
) -> dict:
    normalized_mode = _normalize_parsing_mode(parsing_mode)
    reader = PdfReader(BytesIO(file_bytes))
    arrears: list[ExtractedArrears] = []
    repair_candidates: list[dict] = []
    sheet_names: list[str] = []

    for page_index, page in enumerate(reader.pages, start=1):
        page_name = f"PDF Page {page_index}"
        sheet_names.append(page_name)
        text = page.extract_text(extraction_mode="layout") or page.extract_text() or ""
        rows = _rows_from_pdf_text(text)
        header_index = _find_header_row(rows)

        if header_index is None:
            continue

        header_map = build_header_map_for(rows[header_index], HEADER_ALIASES)

        for row_offset, row in enumerate(rows[header_index + 1 :], start=header_index + 2):
            record, issues = _arrears_from_row(row, header_map)
            if record is None:
                if normalized_mode == PARSING_MODE_ASSISTED and _row_has_possible_arrears_data(row):
                    repair_candidates.append(
                        _repair_candidate(page_name, row_offset, row, header_map, issues)
                    )
                continue

            if normalized_mode == PARSING_MODE_ASSISTED and issues:
                repair_candidates.append(
                    _repair_candidate(page_name, row_offset, row, header_map, issues, record)
                )
                continue

            arrears.append(record)
            if limit is not None and len(_dedupe_arrears(arrears)) >= limit:
                return _with_parsing_metadata(
                    _build_response(sheet_names, arrears, limit=limit),
                    normalized_mode,
                )

    if normalized_mode == PARSING_MODE_ASSISTED and repair_candidates:
        arrears.extend(_repair_tunggakan_with_gemini(repair_candidates))

    return _with_parsing_metadata(
        _build_response(sheet_names, arrears, limit=limit),
        normalized_mode,
    )


def _find_header_row(rows: list[list[str]]) -> int | None:
    for index, row in enumerate(rows):
        header_map = build_header_map_for(row, HEADER_ALIASES)
        if all(field in header_map for field in REQUIRED_FIELDS):
            return index
    return None


def _arrears_from_row(
    row: list[str],
    header_map: dict[str, int],
) -> tuple[ExtractedArrears | None, list[str]]:
    nama = _normalize_text(get_cell(row, header_map, "nama"))
    no_kad_pengenalan = _normalize_ic(get_cell(row, header_map, "noKadPengenalan"))
    jumlah_tunggakan = _normalize_amount(get_cell(row, header_map, "jumlahTunggakan"))
    issues: list[str] = []

    if not nama:
        return None, ["nama missing"]

    if not _looks_like_ic_number(no_kad_pengenalan):
        return None, ["noKadPengenalan invalid"]

    if jumlah_tunggakan is None:
        issues.append("jumlahTunggakan invalid")
        jumlah_tunggakan = "0.00"

    return ExtractedArrears(
        nama=nama,
        noKadPengenalan=no_kad_pengenalan,
        jumlahTunggakan=jumlah_tunggakan,
    ), issues


def _build_response(
    sheet_names: list[str],
    arrears: list[ExtractedArrears],
    limit: int | None = None,
) -> dict:
    arrears = _dedupe_arrears(arrears)
    if limit is not None:
        arrears = arrears[:limit]

    total_amount = sum(float(record.jumlahTunggakan or 0) for record in arrears)

    return {
        "documentType": "tunggakan",
        "recordCount": len(arrears),
        "totalAmount": f"{total_amount:.2f}",
        "availableSheets": sheet_names,
        "records": [record.to_response() for record in arrears],
    }


def _normalize_parsing_mode(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in {PARSING_MODE_STRICT, PARSING_MODE_ASSISTED}:
        return normalized
    return PARSING_MODE_STRICT


def _with_parsing_metadata(response: dict, parsing_mode: str) -> dict:
    return {
        **response,
        "parsingMode": parsing_mode,
    }


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _normalize_ic(value: str) -> str:
    return re.sub(r"\D", "", value)


def _looks_like_ic_number(value: str) -> bool:
    return bool(re.fullmatch(r"\d{12}", _normalize_ic(value)))


def _normalize_amount(value: str) -> str | None:
    normalized = value.strip()
    if not normalized:
        return "0.00"

    normalized = normalized.replace("−", "-").replace("–", "-").replace("—", "-")
    is_parenthesized_negative = bool(re.fullmatch(r"\(.*\)", normalized))
    has_negative_sign = "-" in normalized
    normalized = normalized.replace("RM", "").replace("rm", "")
    normalized = normalized.replace(",", "").replace(" ", "")
    normalized = normalized.strip("()")
    normalized = re.sub(r"[^0-9.]", "", normalized)

    if normalized in {"", "."}:
        return None

    try:
        amount = float(normalized)
    except ValueError:
        return None

    if (is_parenthesized_negative or has_negative_sign) and amount > 0:
        amount *= -1

    return f"{amount:.2f}"


def _dedupe_arrears(arrears: list[ExtractedArrears]) -> list[ExtractedArrears]:
    deduped: list[ExtractedArrears] = []
    seen: set[str] = set()

    for record in arrears:
        key = "|".join([clean_header(record.nama), record.noKadPengenalan])
        if key in seen:
            continue

        seen.add(key)
        deduped.append(record)

    return deduped


def _row_has_possible_arrears_data(row: list[str]) -> bool:
    joined = " ".join(cell.strip() for cell in row if cell.strip())
    if not joined:
        return False

    return (
        len([cell for cell in row if cell.strip()]) >= 3
        or bool(re.search(r"\d{6}[-\s]?\d{2}[-\s]?\d{4}", joined))
    )


def _repair_candidate(
    sheet_name: str,
    source_row: int,
    row: list[str],
    header_map: dict[str, int],
    issues: list[str],
    record: ExtractedArrears | None = None,
) -> dict:
    return {
        "source": {"sheet": sheet_name, "row": source_row},
        "issues": issues or ["row could not be parsed by rules"],
        "row": row,
        "valuesByField": {
            field: get_cell(row, header_map, field)
            for field in HEADER_ALIASES
        },
        "currentRecord": record.to_response() if record else None,
    }


def _repair_tunggakan_with_gemini(candidates: list[dict]) -> list[ExtractedArrears]:
    api_keys = _gemini_api_keys()
    if not api_keys:
        return _fallback_candidate_arrears(candidates)

    prompt = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            "You are repairing Malaysian arrears extraction rows. "
                            "Only analyze the provided invalid rows, not the full file. "
                            "Return only JSON with a 'records' array. Each record must include "
                            "nama, noKadPengenalan, and jumlahTunggakan. Rules: noKadPengenalan "
                            "must contain 12 digits only, removing dashes and spaces. "
                            "jumlahTunggakan must be a decimal string and may be negative. "
                            "Do not invent extra rows. If nama or noKadPengenalan cannot be "
                            "confidently repaired, omit that row.\n\n"
                            f"Rows JSON:\n{json.dumps(candidates, ensure_ascii=False)}"
                        )
                    }
                ]
            }
        ],
        "generationConfig": {"responseMimeType": "application/json"},
    }

    for api_key in api_keys:
        try:
            parsed = _call_gemini_tunggakan_parser(api_key, prompt)
            repaired = _arrears_from_ai_records(parsed.get("records", []))
            return repaired or _fallback_candidate_arrears(candidates)
        except Exception:
            continue

    return _fallback_candidate_arrears(candidates)


def _gemini_api_keys() -> list[str]:
    return list(gemini_api_keys())


def _call_gemini_tunggakan_parser(api_key: str, prompt: dict) -> dict:
    request = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={api_key}",
        data=json.dumps(prompt).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="replace")
        raise ValueError(f"HTTP {error.code}: {_compact_error_body(error_body)}") from error
    except urllib.error.URLError as error:
        raise ValueError(str(error.reason)) from error

    text = (
        payload.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )
    if not text:
        raise ValueError("respons AI kosong")

    return json.loads(text)


def _compact_error_body(value: str) -> str:
    if not value:
        return "tiada butiran ralat"

    try:
        parsed = json.loads(value)
        message = parsed.get("error", {}).get("message")
        status = parsed.get("error", {}).get("status")
        if message and status:
            return f"{status} - {message}"
        if message:
            return str(message)
    except json.JSONDecodeError:
        pass

    return re.sub(r"\s+", " ", value).strip()[:300]


def _arrears_from_ai_records(records: list) -> list[ExtractedArrears]:
    arrears: list[ExtractedArrears] = []

    for record in records:
        if not isinstance(record, dict):
            continue

        repaired = _arrears_from_ai_record(record)
        if repaired is not None:
            arrears.append(repaired)

    return arrears


def _fallback_candidate_arrears(candidates: list[dict]) -> list[ExtractedArrears]:
    arrears: list[ExtractedArrears] = []

    for candidate in candidates:
        current_record = candidate.get("currentRecord")
        if not isinstance(current_record, dict):
            continue

        record = _arrears_from_ai_record(current_record)
        if record is not None:
            arrears.append(record)

    return arrears


def _arrears_from_ai_record(record: dict) -> ExtractedArrears | None:
    nama = _normalize_text(str(record.get("nama", "")))
    no_kad_pengenalan = _normalize_ic(str(record.get("noKadPengenalan", "")))
    jumlah_tunggakan = _normalize_amount(str(record.get("jumlahTunggakan", "")))

    if not nama or not _looks_like_ic_number(no_kad_pengenalan):
        return None

    return ExtractedArrears(
        nama=nama,
        noKadPengenalan=no_kad_pengenalan,
        jumlahTunggakan=jumlah_tunggakan or "0.00",
    )


def _rows_from_pdf_text(text: str) -> list[list[str]]:
    rows: list[list[str]] = []

    for line in text.splitlines():
        clean_line = re.sub(r"\s+", " ", line).strip()
        if not clean_line:
            continue

        cells = [cell.strip() for cell in re.split(r"\s{2,}|\t+", line) if cell.strip()]
        if len(cells) <= 1:
            cells = [cell.strip() for cell in re.split(r"\s*\|\s*", clean_line) if cell.strip()]
        rows.append(cells if len(cells) > 1 else [clean_line])

    return rows
