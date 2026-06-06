from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from io import BytesIO
import json
import re
from typing import Iterable
import urllib.error
import urllib.request

from pypdf import PdfReader

from extractors.shared import (
    build_header_map_for,
    clean_header,
    gemini_api_keys,
    get_cell,
    normalize_date,
    normalize_unit,
    read_xlsx,
)


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
    "kategoriKawasan": (
        "KUARTERS KATEGORI",
        "KATEGORI KUARTERS",
        "KATEGORI KAWASAN",
        "KATEGORI",
        "KAWASAN",
        "KELAS",
        "KELAS KUARTERS",
        "KUARTERS",
        "NAMA KUARTERS"
    ),
    "noRumahNoUnit": (
        "UNIT KUARTERS",
        "NO RUMAH NO UNIT",
        "NO RUMAH",
        "NO UNIT",
        "UNIT",
        "NO UNIT KUARTERS",
        "NOMBOR UNIT",
        "NOMBOR RUMAH",
        "RUMAH",
    ),
    "alamatKuarters": (
        "KUARTERS ALAMAT",
        "ALAMAT KUARTERS",
        "ALAMAT",
        "ALAMAT RUMAH",
        "ALAMAT UNIT",
        "ALAMAT KEDIAMAN",
    ),
    "jawatan": ("JAWATAN", "NAMA JAWATAN", "JAWATAN PEGAWAI", "PEKERJAAN"),
    "jabatan": ("JABATAN", "AGENSI", "KEMENTERIAN", "TEMPAT BERTUGAS", "BAHAGIAN"),
    "noTelefon": (
        "NO TELEFON",
        "NO TEL",
        "NO TELEFON BIMBIT",
        "TELEFON",
        "TEL",
        "HP",
        "NO HP",
        "NOMBOR TELEFON",
    ),
    "gmail": (
        "GMAIL",
        "EMAIL",
        "E-MEL",
        "EMEL",
        "ALAMAT EMAIL",
        "ALAMAT E-MEL",
    ),
    "tarafPerkhidmatan": (
        "TARAF PERKHIDMATAN",
        "TARAF",
        "PERKHIDMATAN",
        "SERVICE LEVEL",
        "JENIS PERKHIDMATAN",
    ),
    "tarikhMasuk": (
        "TARIKH MASUK",
        "TARIKH MULA",
        "TARIKH MENDUDUKI",
        "TARIKH KEMASUKAN",
        "MULA DUDUK",
    ),
    "tarikhKeluar": (
        "TARIKH KELUAR",
        "TARIKH TAMAT",
        "TARIKH KOSONG",
        "TARIKH PENGOSONGAN",
    ),
    "catatan": ("CATATAN", "NOTA", "REMARK", "REMARKS", "ULASAN"),
}

REQUIRED_FIELDS = ("nama", "noKadPengenalan")
PARSING_MODE_STRICT = "strict"
PARSING_MODE_ASSISTED = "assisted"


@dataclass(frozen=True)
class ExtractedResident:
    nama: str
    noKadPengenalan: str
    kategoriKawasan: str
    noRumahNoUnit: str
    alamatKuarters: str
    jawatan: str
    jabatan: str
    noTelefon: str
    gmail: str
    tarafPerkhidmatan: str
    tarikhMasuk: str
    tarikhKeluar: str
    catatan: str

    def to_response(self) -> dict[str, str | int]:
        return {
            "nama": self.nama,
            "noKadPengenalan": self.noKadPengenalan,
            "kuarters": self.kategoriKawasan,
            "unit": self.noRumahNoUnit,
            "alamatKuarters": self.alamatKuarters,
            "perhubungan": self.noTelefon,
            "gmail": self.gmail,
            "pekerjaan": self.jawatan,
            "jabatan": self.jabatan,
            "tarafPerkhidmatan": self.tarafPerkhidmatan,
            "tarikhMasuk": self.tarikhMasuk,
            "tarikhKeluar": self.tarikhKeluar,
            "catatan": self.catatan,
        }


def extract_penghuni_document(
    file_bytes: bytes,
    filename: str,
    parsing_mode: str = PARSING_MODE_STRICT,
    limit: int | None = None,
) -> dict:
    normalized_mode = _normalize_parsing_mode(parsing_mode)
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension == "xlsx":
        return extract_penghuni_from_xlsx(
            file_bytes,
            parsing_mode=normalized_mode,
            limit=limit,
        )
    if extension == "pdf":
        return extract_penghuni_from_pdf(
            file_bytes,
            parsing_mode=normalized_mode,
            limit=limit,
        )

    raise ValueError("Sila muat naik fail .xlsx atau .pdf sahaja.")


def extract_penghuni_from_xlsx(
    file_bytes: bytes,
    parsing_mode: str = PARSING_MODE_STRICT,
    limit: int | None = None,
) -> dict:
    normalized_mode = _normalize_parsing_mode(parsing_mode)
    workbook = read_xlsx(file_bytes)
    residents: list[ExtractedResident] = []
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
            resident, issues = _resident_from_row_with_issues(
                sheet["name"],
                row_offset,
                row,
                header_map,
            )
            if resident is None:
                if normalized_mode == PARSING_MODE_ASSISTED and _row_has_possible_resident_data(row):
                    repair_candidates.append(
                        _repair_candidate(sheet["name"], row_offset, row, header_map, issues)
                    )
                continue

            if normalized_mode == PARSING_MODE_ASSISTED and issues:
                repair_candidates.append(
                    _repair_candidate(
                        sheet["name"],
                        row_offset,
                        row,
                        header_map,
                        issues,
                        resident,
                    )
                )
                continue

            residents.append(resident)
            if limit is not None and len(residents) >= limit:
                return _with_parsing_metadata(
                    _build_response(workbook["sheet_names"], residents),
                    normalized_mode,
                )

    if normalized_mode == PARSING_MODE_ASSISTED and repair_candidates:
        residents.extend(_repair_penghuni_with_gemini(repair_candidates))
        residents = _dedupe_residents(residents)

    return _with_parsing_metadata(
        _build_response(workbook["sheet_names"], residents[:limit] if limit else residents),
        normalized_mode,
    )


def extract_penghuni_from_pdf(
    file_bytes: bytes,
    parsing_mode: str = PARSING_MODE_STRICT,
    limit: int | None = None,
) -> dict:
    normalized_mode = _normalize_parsing_mode(parsing_mode)
    reader = PdfReader(BytesIO(file_bytes))
    residents: list[ExtractedResident] = []
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

        header_row, data_start_index = _pdf_header_and_data_start(rows, header_index)
        header_map = build_header_map_for(header_row, HEADER_ALIASES)

        data_rows = _merge_pdf_continuation_rows(rows[data_start_index:])

        for row_offset, row in enumerate(data_rows, start=data_start_index + 1):
            resident, issues = _resident_from_row_with_issues(
                page_name,
                row_offset,
                row,
                header_map,
            )
            if resident is None:
                if normalized_mode == PARSING_MODE_ASSISTED and _row_has_possible_resident_data(row):
                    repair_candidates.append(
                        _repair_candidate(page_name, row_offset, row, header_map, issues)
                    )
                continue

            if normalized_mode == PARSING_MODE_ASSISTED and issues:
                repair_candidates.append(
                    _repair_candidate(
                        page_name,
                        row_offset,
                        row,
                        header_map,
                        issues,
                        resident,
                    )
                )
                continue

            residents.append(resident)
            if limit is not None and len(residents) >= limit:
                return _with_parsing_metadata(
                    _build_response(sheet_names, residents),
                    normalized_mode,
                )

    if normalized_mode == PARSING_MODE_ASSISTED and repair_candidates:
        residents.extend(_repair_penghuni_with_gemini(repair_candidates))
        residents = _dedupe_residents(residents)

    return _with_parsing_metadata(
        _build_response(sheet_names, residents[:limit] if limit else residents),
        normalized_mode,
    )


def _find_header_row(rows: list[list[str]]) -> int | None:
    for index, row in enumerate(rows):
        header_row = row
        if index + 1 < len(rows):
            header_row = _merge_wrapped_pdf_header(row, rows[index + 1])

        header_map = build_header_map_for(header_row, HEADER_ALIASES)
        if all(field in header_map for field in REQUIRED_FIELDS):
            return index
    return None


def _pdf_header_and_data_start(
    rows: list[list[str]],
    header_index: int,
) -> tuple[list[str], int]:
    if header_index + 1 >= len(rows):
        return rows[header_index], header_index + 1

    merged_header = _merge_wrapped_pdf_header(rows[header_index], rows[header_index + 1])

    if merged_header == rows[header_index]:
        return rows[header_index], header_index + 1

    return merged_header, header_index + 2


def _merge_wrapped_pdf_header(header_row: list[str], continuation_row: list[str]) -> list[str]:
    if not header_row or not continuation_row:
        return header_row

    continuation_tokens = [clean_header(cell) for cell in continuation_row if cell.strip()]
    continuation_index = 0
    merged_header: list[str] = []
    did_merge = False

    for cell in header_row:
        clean_cell = clean_header(cell)

        if clean_cell == "TARAF" and _next_continuation_is(
            continuation_tokens,
            continuation_index,
            "PERKHIDMATAN",
        ):
            merged_header.append("TARAF PERKHIDMATAN")
            continuation_index += 1
            did_merge = True
            continue

        if clean_cell == "KUARTERS" and _next_continuation_is(
            continuation_tokens,
            continuation_index,
            "KATEGORI",
        ):
            merged_header.append("KUARTERS KATEGORI")
            continuation_index += 1
            did_merge = True
            continue

        if clean_cell == "TARIKH" and continuation_index < len(continuation_tokens):
            next_token = continuation_tokens[continuation_index]

            if next_token in {"MASUK", "KELUAR"}:
                merged_header.append(f"TARIKH {next_token}")
                continuation_index += 1
                did_merge = True
                continue

        merged_header.append(cell)

    return merged_header if did_merge else header_row


def _next_continuation_is(
    continuation_tokens: list[str],
    continuation_index: int,
    expected_token: str,
) -> bool:
    return (
        continuation_index < len(continuation_tokens)
        and continuation_tokens[continuation_index] == expected_token
    )


def _resident_from_row(
    sheet_name: str,
    source_row: int,
    row: list[str],
    header_map: dict[str, int],
) -> ExtractedResident | None:
    resident, _issues = _resident_from_row_with_issues(
        sheet_name,
        source_row,
        row,
        header_map,
    )
    return resident


def _resident_from_row_with_issues(
    sheet_name: str,
    source_row: int,
    row: list[str],
    header_map: dict[str, int],
) -> tuple[ExtractedResident | None, list[str]]:
    nama = get_cell(row, header_map, "nama")
    no_kad_pengenalan = _normalize_ic(get_cell(row, header_map, "noKadPengenalan"))
    issues: list[str] = []

    if (
        not nama
        or nama.upper() == "KOSONG"
    ):
        return None, ["nama missing"]

    if not _looks_like_ic_number(no_kad_pengenalan):
        return None, ["noKadPengenalan invalid"]

    raw_email = get_cell(row, header_map, "gmail")
    gmail = _normalize_email(raw_email)
    if raw_email.strip() and not gmail:
        issues.append("gmail invalid")

    raw_tarikh_masuk = get_cell(row, header_map, "tarikhMasuk")
    raw_tarikh_keluar = get_cell(row, header_map, "tarikhKeluar")
    tarikh_masuk = _normalize_optional_date(raw_tarikh_masuk)
    tarikh_keluar = _normalize_optional_date(raw_tarikh_keluar)

    return ExtractedResident(
        nama=nama,
        noKadPengenalan=no_kad_pengenalan,
        kategoriKawasan=get_cell(row, header_map, "kategoriKawasan"),
        noRumahNoUnit=normalize_unit(get_cell(row, header_map, "noRumahNoUnit")),
        alamatKuarters=get_cell(row, header_map, "alamatKuarters"),
        jawatan=_normalize_jawatan(get_cell(row, header_map, "jawatan")),
        jabatan=get_cell(row, header_map, "jabatan"),
        noTelefon=_normalize_phone(get_cell(row, header_map, "noTelefon")),
        gmail=gmail,
        tarafPerkhidmatan=get_cell(row, header_map, "tarafPerkhidmatan"),
        tarikhMasuk=tarikh_masuk,
        tarikhKeluar=tarikh_keluar,
        catatan=get_cell(row, header_map, "catatan"),
    ), issues


def _build_response(sheet_names: list[str], residents: list[ExtractedResident]) -> dict:
    residents = _dedupe_residents(residents)

    return {
        "documentType": "penghuni",
        "recordCount": len(residents),
        "availableSheets": sheet_names,
        "records": [resident.to_response() for resident in residents],
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


def _looks_like_ic_number(value: str) -> bool:
    return bool(re.fullmatch(r"\d{12}", _normalize_ic(value)))


def _normalize_ic(value: str) -> str:
    return re.sub(r"\D", "", value)


def _normalize_phone(value: str) -> str:
    return re.sub(r"[\s-]+", "", value.strip())


def _normalize_email(value: str) -> str:
    email = value.strip().lower()
    if not email:
        return ""
    return email if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) else ""


def _normalize_optional_date(value: str) -> str:
    raw_value = value.strip()

    if not raw_value or raw_value.lower() in {"-", "n/a", "na", "tiada", "null"}:
        return ""

    normalized = normalize_date(raw_value)

    if not _is_iso_date(normalized):
        return ""

    return date.fromisoformat(normalized).strftime("%d/%m/%Y")


def _is_iso_date(value: str) -> bool:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return False

    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def _normalize_jawatan(value: str) -> str:
    return re.sub(r"\s*[-–—]?\s*[A-Z]{1,3}\d{1,2}\s*$", "", value.strip()).strip()


def _row_has_possible_resident_data(row: list[str]) -> bool:
    joined = " ".join(cell.strip() for cell in row if cell.strip())
    if not joined:
        return False

    return (
        len([cell for cell in row if cell.strip()]) >= 3
        or bool(re.search(r"\d{6}[-\s]?\d{2}[-\s]?\d{4}", joined))
        or "@" in joined
    )


def _repair_candidate(
    sheet_name: str,
    source_row: int,
    row: list[str],
    header_map: dict[str, int],
    issues: list[str],
    resident: ExtractedResident | None = None,
) -> dict:
    return {
        "source": {"sheet": sheet_name, "row": source_row},
        "issues": issues or ["row could not be parsed by rules"],
        "row": row,
        "valuesByField": {
            field: get_cell(row, header_map, field)
            for field in HEADER_ALIASES
        },
        "currentRecord": resident.to_response() if resident else None,
    }


def _repair_penghuni_with_gemini(candidates: list[dict]) -> list[ExtractedResident]:
    api_keys = _gemini_api_keys()
    if not api_keys:
        return _fallback_candidate_residents(candidates)

    prompt = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            "You are repairing Malaysian resident extraction rows. "
                            "Only analyze the provided rows, not the full file. "
                            "Return only JSON with a 'records' array. Each record must include "
                            "nama, noKadPengenalan, perhubungan, gmail, pekerjaan, jabatan, "
                            "tarafPerkhidmatan, kuarters, alamatKuarters, unit, tarikhMasuk, "
                            "tarikhKeluar, and catatan. Rules: noKadPengenalan must contain "
                            "12 digits only, removing dashes and spaces. Phone numbers should "
                            "remove dashes and spaces. Email must be a valid email or empty. "
                            "Dates must be DD/MM/YYYY or empty. Do not invent extra rows. "
                            "If a required nama or noKadPengenalan cannot be confidently repaired, "
                            "omit that row.\n\n"
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
            parsed = _call_gemini_penghuni_parser(api_key, prompt)
            repaired = _residents_from_ai_records(parsed.get("records", []))
            return repaired or _fallback_candidate_residents(candidates)
        except Exception:
            continue

    return _fallback_candidate_residents(candidates)


def _gemini_api_keys() -> list[str]:
    return list(gemini_api_keys())


def _call_gemini_penghuni_parser(api_key: str, prompt: dict) -> dict:
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


def _residents_from_ai_records(records: list) -> list[ExtractedResident]:
    residents: list[ExtractedResident] = []

    for record in records:
        if not isinstance(record, dict):
            continue

        resident = _resident_from_ai_record(record)
        if resident is not None:
            residents.append(resident)

    return residents


def _resident_from_ai_record(record: dict) -> ExtractedResident | None:
    nama = str(record.get("nama", "")).strip()
    no_kad_pengenalan = _normalize_ic(str(record.get("noKadPengenalan", "")))

    if not nama or not _looks_like_ic_number(no_kad_pengenalan):
        return None

    tarikh_masuk = _normalize_optional_date(str(record.get("tarikhMasuk", "")))
    tarikh_keluar = _normalize_optional_date(str(record.get("tarikhKeluar", "")))

    return ExtractedResident(
        nama=nama,
        noKadPengenalan=no_kad_pengenalan,
        kategoriKawasan=str(record.get("kuarters", "")).strip(),
        noRumahNoUnit=normalize_unit(str(record.get("unit", "")).strip()),
        alamatKuarters=str(record.get("alamatKuarters", "")).strip(),
        jawatan=_normalize_jawatan(str(record.get("pekerjaan", "")).strip()),
        jabatan=str(record.get("jabatan", "")).strip(),
        noTelefon=_normalize_phone(str(record.get("perhubungan", "")).strip()),
        gmail=_normalize_email(str(record.get("gmail", "")).strip()),
        tarafPerkhidmatan=str(record.get("tarafPerkhidmatan", "")).strip(),
        tarikhMasuk=tarikh_masuk,
        tarikhKeluar=tarikh_keluar,
        catatan=str(record.get("catatan", "")).strip(),
    )


def _fallback_candidate_residents(candidates: list[dict]) -> list[ExtractedResident]:
    residents: list[ExtractedResident] = []

    for candidate in candidates:
        current_record = candidate.get("currentRecord")
        if not isinstance(current_record, dict):
            continue

        resident = _resident_from_ai_record(current_record)
        if resident is not None:
            residents.append(resident)

    return residents


def _dedupe_residents(residents: list[ExtractedResident]) -> list[ExtractedResident]:
    deduped: list[ExtractedResident] = []
    seen: set[str] = set()

    for resident in residents:
        key = "|".join(
            _normalize_dedupe_value(str(value))
            for value in resident.to_response().values()
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(resident)

    return deduped


def _normalize_dedupe_value(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().upper()


def _merge_pdf_continuation_rows(rows: list[list[str]]) -> list[list[str]]:
    merged_rows: list[list[str]] = []

    for row in rows:
        if _looks_like_pdf_data_row(row):
            merged_rows.append(row.copy())
            continue

        if not merged_rows:
            merged_rows.append(row)
            continue

        previous_row = merged_rows[-1]

        if len(row) == 2 and len(previous_row) >= 10:
            previous_row[6] = _append_text(previous_row[6], row[0].strip())
            previous_row[9] = _append_text(previous_row[9], row[1].strip())
            continue

        if len(row) != 1:
            merged_rows.append(row)
            continue

        continuation = row[0].strip()

        if not continuation:
            continue

        if len(previous_row) >= 10:
            previous_row[9] = _append_text(previous_row[9], continuation)
        else:
            previous_row.append(continuation)

    return merged_rows


def _looks_like_pdf_data_row(row: list[str]) -> bool:
    return len(row) >= 3 and bool(re.fullmatch(r"\d+", row[0].strip())) and _looks_like_ic_number(row[2])


def _append_text(value: str, continuation: str) -> str:
    if not continuation:
        return value

    if not value:
        return continuation

    return f"{value} {continuation}".strip()


def _rows_from_pdf_text(text: str) -> list[list[str]]:
    rows: list[list[str]] = []

    for line in text.splitlines():
        clean_line = re.sub(r"\s+", " ", line).strip()
        if not clean_line:
            continue

        if _looks_like_key_value_line(clean_line):
            rows.extend(_rows_from_key_value_block([clean_line]))
            continue

        cells = [cell.strip() for cell in re.split(r"\s{2,}|\t+", line) if cell.strip()]
        if len(cells) <= 1:
            cells = [cell.strip() for cell in re.split(r"\s*\|\s*", clean_line) if cell.strip()]
        rows.append(cells if len(cells) > 1 else [clean_line])

    key_value_rows = _rows_from_key_value_block(text.splitlines())
    if key_value_rows:
        rows.extend(key_value_rows)

    return rows


def _looks_like_key_value_line(line: str) -> bool:
    return any(clean_header(alias) in clean_header(line) for aliases in HEADER_ALIASES.values() for alias in aliases) and ":" in line


def _rows_from_key_value_block(lines: Iterable[str]) -> list[list[str]]:
    records: list[dict[str, str]] = []
    current: dict[str, str] = {}

    for raw_line in lines:
        line = raw_line.strip()
        if not line or ":" not in line:
            continue

        label, _separator, value = line.partition(":")
        field = _field_for_label(label)
        if not field:
            continue

        if field == "nama" and current.get("nama") and current.get("noKadPengenalan"):
            records.append(current)
            current = {}

        current[field] = value.strip()

    if current.get("nama") and current.get("noKadPengenalan"):
        records.append(current)

    if not records:
        return []

    fields = list(HEADER_ALIASES)
    rows = [[_primary_alias(field) for field in fields]]
    rows.extend([[record.get(field, "") for field in fields] for record in records])
    return rows


def _field_for_label(label: str) -> str | None:
    clean_label = clean_header(label)
    for field, aliases in HEADER_ALIASES.items():
        if clean_label in {clean_header(alias) for alias in aliases}:
            return field
    return None


def _primary_alias(field: str) -> str:
    return HEADER_ALIASES[field][0]
