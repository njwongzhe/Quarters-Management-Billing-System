from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
import json
import re
import urllib.error
import urllib.request

from pypdf import PdfReader

from extractors.shared import build_header_map_for, gemini_api_keys, get_cell, read_xlsx


PARSING_MODE_STRICT = "strict"
PARSING_MODE_ASSISTED = "assisted"

HEADER_ALIASES: dict[str, tuple[str, ...]] = {
    "bil": ("BIL", "BIL."),
    "noRujukan": ("NO RUJUKAN", "NO. RUJUKAN", "NO RUJ"),
    "noGajiNoKp": (
        "NO GAJI/ NO KP",
        "NO GAJI / NO KP",
        "NO GAJI NO KP",
        "NO KP",
        "NO KAD PENGENALAN",
        "NO. KAD PENGENALAN",
    ),
    "nama": ("NAMA", "NAMA PENGHUNI", "NAMA PEGAWAI"),
    "amaunRm": ("AMAUN RM", "AMAUNRM", "AMAUN BAYAR RM", "AMAUN BAYAR (RM)", "AMAUN"),
}


@dataclass
class ExtractedPayment:
    page: int
    bil: str
    noRujukan: str
    noGajiNoKp: str
    nama: str
    amaunRm: str
    tarikh: str
    jabatanName: str

    def to_response(self) -> dict[str, str | int]:
        return {
            "page": self.page,
            "jabatanCode": "",
            "jabatanName": self.jabatanName,
            "ptjpkCode": "",
            "ptjpkName": "",
            "bil": self.bil,
            "noRujukan": self.noRujukan,
            "noGajiNoKp": self.noGajiNoKp,
            "nama": self.nama,
            "amaunRm": self.amaunRm,
            "tarikh": self.tarikh,
            "noResit": "",
            "catatan": "bayaran",
        }


def extract_bayaran_document(
    file_bytes: bytes,
    filename: str,
    parsing_mode: str = PARSING_MODE_STRICT,
    limit: int | None = None,
) -> dict:
    normalized_mode = _normalize_parsing_mode(parsing_mode)
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension == "xlsx":
        return extract_bayaran_from_xlsx(
            file_bytes,
            parsing_mode=normalized_mode,
            limit=limit,
        )
    if extension == "pdf":
        return extract_bayaran_from_pdf(
            file_bytes,
            parsing_mode=normalized_mode,
            limit=limit,
        )

    raise ValueError("Sila muat naik fail .xlsx atau .pdf sahaja.")


def extract_bayaran_from_xlsx(
    file_bytes: bytes,
    parsing_mode: str = PARSING_MODE_STRICT,
    limit: int | None = None,
) -> dict:
    normalized_mode = _normalize_parsing_mode(parsing_mode)
    workbook = read_xlsx(file_bytes)
    records: list[ExtractedPayment] = []
    repair_candidates: list[dict] = []
    global_payment_date = ""

    for page_index, sheet in enumerate(workbook["sheets"], start=1):
        rows = sheet["rows"]
        payment_date = _extract_date_from_rows(rows) or global_payment_date
        if payment_date and not global_payment_date:
            global_payment_date = payment_date

        department_name = _extract_department_from_rows(rows)
        header_index = _find_header_row(rows)
        if header_index is None:
            continue

        header_map = build_header_map_for(rows[header_index], HEADER_ALIASES)
        for row_offset, row in enumerate(rows[header_index + 1 :], start=header_index + 2):
            record, issues = _payment_from_row(
                row=row,
                header_map=header_map,
                page=page_index,
                payment_date=payment_date or global_payment_date,
                department_name=department_name,
            )
            if record is None:
                if normalized_mode == PARSING_MODE_ASSISTED and _row_has_possible_payment_data(row):
                    repair_candidates.append(
                        _repair_candidate(sheet["name"], row_offset, row, header_map, payment_date, department_name, issues)
                    )
                continue

            if normalized_mode == PARSING_MODE_ASSISTED and issues:
                repair_candidates.append(
                    _repair_candidate(sheet["name"], row_offset, row, header_map, payment_date, department_name, issues, record)
                )
                continue

            records.append(record)
            if limit is not None and len(_dedupe_records(records)) >= limit:
                return _with_metadata(
                    _build_response(records, global_payment_date, limit),
                    normalized_mode,
                )

    if normalized_mode == PARSING_MODE_ASSISTED and repair_candidates:
        records.extend(_repair_bayaran_with_gemini(repair_candidates))

    return _with_metadata(
        _build_response(records, global_payment_date, limit),
        normalized_mode,
    )


def extract_bayaran_from_pdf(
    file_bytes: bytes,
    parsing_mode: str = PARSING_MODE_STRICT,
    limit: int | None = None,
) -> dict:
    normalized_mode = _normalize_parsing_mode(parsing_mode)
    reader = PdfReader(BytesIO(file_bytes))
    records: list[ExtractedPayment] = []
    repair_candidates: list[dict] = []
    global_payment_date = ""

    for page_no, page in enumerate(reader.pages, start=1):
        text = page.extract_text(extraction_mode="layout") or page.extract_text() or ""
        rows = _rows_from_pdf_text(text)
        payment_date = _extract_date_from_text(text) or global_payment_date
        if payment_date and not global_payment_date:
            global_payment_date = payment_date

        department_name = _extract_department_from_rows(rows)
        header_index = _find_header_row(rows)
        if header_index is None:
            continue

        header_map = build_header_map_for(rows[header_index], HEADER_ALIASES)
        for row_offset, row in enumerate(rows[header_index + 1 :], start=header_index + 2):
            record, issues = _payment_from_row(
                row=row,
                header_map=header_map,
                page=page_no,
                payment_date=payment_date or global_payment_date,
                department_name=department_name,
            )
            if record is None:
                if normalized_mode == PARSING_MODE_ASSISTED and _row_has_possible_payment_data(row):
                    repair_candidates.append(
                        _repair_candidate(f"PDF Page {page_no}", row_offset, row, header_map, payment_date, department_name, issues)
                    )
                continue

            if normalized_mode == PARSING_MODE_ASSISTED and issues:
                repair_candidates.append(
                    _repair_candidate(f"PDF Page {page_no}", row_offset, row, header_map, payment_date, department_name, issues, record)
                )
                continue

            records.append(record)
            if limit is not None and len(_dedupe_records(records)) >= limit:
                return _with_metadata(
                    _build_response(records, global_payment_date, limit),
                    normalized_mode,
                )

    if normalized_mode == PARSING_MODE_ASSISTED and repair_candidates:
        records.extend(_repair_bayaran_with_gemini(repair_candidates))

    return _with_metadata(
        _build_response(records, global_payment_date, limit),
        normalized_mode,
    )


def _find_header_row(rows: list[list[str]]) -> int | None:
    for index, row in enumerate(rows):
        header_map = build_header_map_for(row, HEADER_ALIASES)
        if {"noGajiNoKp", "nama", "amaunRm"}.issubset(header_map):
            return index
    return None


def _payment_from_row(
    row: list[str],
    header_map: dict[str, int],
    page: int,
    payment_date: str,
    department_name: str,
) -> tuple[ExtractedPayment | None, list[str]]:
    pdf_token_record = _payment_from_pdf_tokens(row)
    if pdf_token_record is not None:
        bil, no_rujukan, no_kp, nama, amount = pdf_token_record
    elif _is_shifted_pdf_payment_row(row, header_map):
        bil = _normalize_text(row[0])
        no_rujukan = ""
        no_kp = _normalize_ic(row[1])
        nama = _normalize_text(row[2])
        amount = _normalize_amount(row[3])
    else:
        bil = _normalize_text(get_cell(row, header_map, "bil"))
        no_rujukan = _normalize_text(get_cell(row, header_map, "noRujukan"))
        no_kp = _normalize_ic(get_cell(row, header_map, "noGajiNoKp"))
        nama = _normalize_text(get_cell(row, header_map, "nama"))
        amount = _normalize_amount(get_cell(row, header_map, "amaunRm"))
    issues: list[str] = []

    if not bil and not no_rujukan and not no_kp and not nama:
        return None, ["empty row"]
    if not _looks_like_ic_number(no_kp):
        return None, ["noKadPengenalan invalid or no gaji"]
    if not nama:
        return None, ["nama missing"]
    if amount is None:
        issues.append("amaunRm invalid")
        amount = "0.00"
    if not payment_date:
        issues.append("tarikh missing")

    return ExtractedPayment(
        page=page,
        bil=bil,
        noRujukan=no_rujukan,
        noGajiNoKp=no_kp,
        nama=nama,
        amaunRm=amount,
        tarikh=payment_date,
        jabatanName=department_name,
    ), issues


def _build_response(
    records: list[ExtractedPayment],
    payment_date: str,
    limit: int | None = None,
) -> dict:
    records = _dedupe_records(records)
    if limit is not None:
        records = records[:limit]

    total_amount = sum(float(record.amaunRm or 0) for record in records)
    return {
        "documentType": "bayaran",
        "recordCount": len(records),
        "totalAmount": f"{total_amount:.2f}",
        "paymentMonth": payment_date,
        "records": [record.to_response() for record in records],
    }


def _is_shifted_pdf_payment_row(row: list[str], header_map: dict[str, int]) -> bool:
    return (
        header_map.get("noRujukan") == 1
        and header_map.get("noGajiNoKp") == 2
        and len(row) == 4
        and bool(re.fullmatch(r"\d+", row[0].strip()))
        and bool(re.fullmatch(r"\d{12}", _normalize_ic(row[1])))
    )


def _payment_from_pdf_tokens(row: list[str]) -> tuple[str, str, str, str, str | None] | None:
    if len(row) < 4 or not re.fullmatch(r"\d+", row[0].strip()):
        return None

    amount = _normalize_amount(row[-1])
    if amount is None:
        return None

    ic_index = next(
        (
            index
            for index, cell in enumerate(row[1:-1], start=1)
            if re.fullmatch(r"\d{12}", _normalize_ic(cell))
        ),
        None,
    )

    if ic_index is None:
        return None

    bil = _normalize_text(row[0])
    no_rujukan = _normalize_text(" ".join(row[1:ic_index]))
    no_kp = _normalize_ic(row[ic_index])
    nama = _normalize_text(" ".join(row[ic_index + 1 : -1]))

    return bil, no_rujukan, no_kp, nama, amount


def _normalize_parsing_mode(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in {PARSING_MODE_STRICT, PARSING_MODE_ASSISTED}:
        return normalized
    return PARSING_MODE_STRICT


def _with_metadata(response: dict, parsing_mode: str) -> dict:
    return {**response, "parsingMode": parsing_mode}


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _normalize_ic(value: str) -> str:
    return re.sub(r"\D", "", value)


def _looks_like_ic_number(value: str) -> bool:
    return bool(re.fullmatch(r"\d{12}", _normalize_ic(value)))


def _normalize_amount(value: str) -> str | None:
    normalized = str(value or "").strip()
    if not normalized:
        return None

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


def _extract_date_from_rows(rows: list[list[str]]) -> str:
    for row in rows[:8]:
        date = _extract_date_from_text(" ".join(row))
        if date:
            return date
    return ""


def _extract_date_from_text(text: str) -> str:
    match = re.search(r"Tarikh\s*:\s*(\d{1,2}/\d{1,2}/\d{4})", text, flags=re.IGNORECASE)
    if match:
        return _normalize_date(match.group(1))

    month_match = re.search(r"GAJI\s+BULAN\s+([A-Z]+\s+\d{4})", text.upper())
    if month_match:
        return _normalize_month_label(month_match.group(1))

    return ""


def _normalize_date(value: str) -> str:
    for date_format in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(value, date_format).date().isoformat()
        except ValueError:
            pass
    return value


def _normalize_month_label(value: str) -> str:
    month_name, _, year_text = value.strip().partition(" ")
    month_index_by_name = {
        "JANUARI": 1,
        "JANUARY": 1,
        "FEBRUARI": 2,
        "FEBRUARY": 2,
        "MAC": 3,
        "MARCH": 3,
        "APRIL": 4,
        "MEI": 5,
        "MAY": 5,
        "JUN": 6,
        "JUNE": 6,
        "JULAI": 7,
        "JULY": 7,
        "OGOS": 8,
        "AUGUST": 8,
        "SEPTEMBER": 9,
        "OKTOBER": 10,
        "OCTOBER": 10,
        "NOVEMBER": 11,
        "DISEMBER": 12,
        "DECEMBER": 12,
    }
    month = month_index_by_name.get(month_name.upper(), 1)
    year = int(year_text) if year_text.isdigit() else datetime.now().year
    return f"{year:04d}-{month:02d}-01"


def _extract_department_from_rows(rows: list[list[str]]) -> str:
    for row in rows[:10]:
        joined = " ".join(_normalize_text(cell) for cell in row if _normalize_text(cell))
        if "JABATAN" not in joined.upper():
            continue
        department = _extract_department_from_line(joined)
        if department:
            return department
    return ""


def _extract_department_from_line(line: str) -> str:
    match = re.search(
        r"JABATAN\s*:\s*\S+\s+(.*?)(?:\s+KOD\s+POTONGAN\s*:|$)",
        line,
        flags=re.IGNORECASE,
    )
    return _normalize_text(match.group(1)) if match else ""


def _dedupe_records(records: list[ExtractedPayment]) -> list[ExtractedPayment]:
    deduped: list[ExtractedPayment] = []
    seen: set[str] = set()
    for record in records:
        if record.noGajiNoKp in seen:
            continue
        seen.add(record.noGajiNoKp)
        deduped.append(record)
    return deduped


def _row_has_possible_payment_data(row: list[str]) -> bool:
    joined = " ".join(cell.strip() for cell in row if cell.strip())
    if not joined:
        return False
    return len([cell for cell in row if cell.strip()]) >= 3 or bool(
        re.search(r"\d{6}[-\s]?\d{2}[-\s]?\d{4}", joined)
    )


def _repair_candidate(
    source_name: str,
    source_row: int,
    row: list[str],
    header_map: dict[str, int],
    payment_date: str,
    department_name: str,
    issues: list[str],
    record: ExtractedPayment | None = None,
) -> dict:
    return {
        "source": {"sheet": source_name, "row": source_row},
        "issues": issues or ["row could not be parsed by rules"],
        "row": row,
        "valuesByField": {field: get_cell(row, header_map, field) for field in HEADER_ALIASES},
        "paymentDate": payment_date,
        "departmentName": department_name,
        "currentRecord": record.to_response() if record else None,
    }


def _repair_bayaran_with_gemini(candidates: list[dict]) -> list[ExtractedPayment]:
    api_keys = _gemini_api_keys()
    if not api_keys:
        return _fallback_candidate_records(candidates)

    prompt = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            "Repair Malaysian payment extraction rows. Return only JSON with a records array. "
                            "Each record must include nama, noGajiNoKp, jabatanName, noRujukan, amaunRm, and tarikh. "
                            "noGajiNoKp must be the resident IC only: 12 digits, no symbols. If it is a staff number/no gaji "
                            "or cannot be confidently repaired to a 12-digit IC, omit that row. amaunRm must be a decimal string. "
                            "tarikh must be yyyy-mm-dd. Do not invent extra rows.\n\n"
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
            parsed = _call_gemini_parser(api_key, prompt)
            repaired = _records_from_ai(parsed.get("records", []))
            return repaired or _fallback_candidate_records(candidates)
        except Exception:
            continue

    return _fallback_candidate_records(candidates)


def _gemini_api_keys() -> list[str]:
    return list(gemini_api_keys())


def _call_gemini_parser(api_key: str, prompt: dict) -> dict:
    request = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
        f"?key={api_key}",
        data=json.dumps(prompt).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        raise ValueError(error.read().decode("utf-8", errors="replace")) from error

    text = (
        payload.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )
    if not text:
        raise ValueError("respons AI kosong")
    return json.loads(text)


def _records_from_ai(records: list) -> list[ExtractedPayment]:
    extracted: list[ExtractedPayment] = []
    for record in records:
        if not isinstance(record, dict):
            continue
        payment = _record_from_ai(record)
        if payment is not None:
            extracted.append(payment)
    return extracted


def _fallback_candidate_records(candidates: list[dict]) -> list[ExtractedPayment]:
    records: list[ExtractedPayment] = []
    for candidate in candidates:
        current_record = candidate.get("currentRecord")
        if isinstance(current_record, dict):
            record = _record_from_ai(current_record)
            if record is not None:
                records.append(record)
    return records


def _record_from_ai(record: dict) -> ExtractedPayment | None:
    no_kp = _normalize_ic(str(record.get("noGajiNoKp", "")))
    nama = _normalize_text(str(record.get("nama", "")))
    amount = _normalize_amount(str(record.get("amaunRm", "")))
    if not _looks_like_ic_number(no_kp) or not nama or amount is None:
        return None
    return ExtractedPayment(
        page=int(record.get("page") or 0),
        bil=_normalize_text(str(record.get("bil", ""))),
        noRujukan=_normalize_text(str(record.get("noRujukan", ""))),
        noGajiNoKp=no_kp,
        nama=nama,
        amaunRm=amount,
        tarikh=_normalize_date(str(record.get("tarikh", ""))) if record.get("tarikh") else "",
        jabatanName=_normalize_text(str(record.get("jabatanName", ""))),
    )


def _rows_from_pdf_text(text: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for line in text.splitlines():
        clean_line = re.sub(r"\s+", " ", line).strip()
        if not clean_line:
            continue
        cells = [cell.strip() for cell in re.split(r"\s{2,}|\t+", line) if cell.strip()]
        rows.append(cells if len(cells) > 1 else [clean_line])
    return rows
