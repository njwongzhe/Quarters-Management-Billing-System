from __future__ import annotations

from io import BytesIO
import re


try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover - handled at runtime with a clearer message.
    PdfReader = None


MONEY_RE = re.compile(r"\d[\d,]*\.\d{2}$")
ROW_START_RE = re.compile(r"^\s*\d+\s+")


def clean_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def parse_header(line: str, label: str, end_label: str) -> tuple[str, str]:
    pattern = rf"{label}\s*:\s*(\S+)\s+(.*?)(?:\s+{end_label}\s*:|$)"
    match = re.search(pattern, line)
    if not match:
        return "", ""
    return match.group(1).strip(), clean_spaces(match.group(2))


def extract_payment_month(text: str) -> str:
    match = re.search(r"GAJI\s+BULAN\s+([A-Z]+\s+\d{4})", text.upper())
    return clean_spaces(match.group(1).title()) if match else ""


def extract_bayaran_from_pdf(file_bytes: bytes, limit: int | None = None) -> dict:
    if PdfReader is None:
        raise RuntimeError("Pakej pypdf belum dipasang. Jalankan: pip install pypdf")

    reader = PdfReader(BytesIO(file_bytes))
    records = []
    payment_month = ""

    for page_no, page in enumerate(reader.pages, start=1):
        text = page.extract_text(extraction_mode="layout") or ""
        if not payment_month:
            payment_month = extract_payment_month(text)

        jabatan_code = jabatan_name = ptjpk_code = ptjpk_name = ""

        for line in text.splitlines():
            if "JABATAN" in line and "KOD POTONGAN" in line:
                jabatan_code, jabatan_name = parse_header(line, "JABATAN", "KOD POTONGAN")
            elif "PTJPK" in line and "KOD AMANAH" in line:
                ptjpk_code, ptjpk_name = parse_header(line, "PTJPK", "KOD AMANAH/ HASIL")

            stripped = line.strip()
            if not ROW_START_RE.match(stripped) or not MONEY_RE.search(stripped):
                continue

            parts = [
                clean_spaces(part)
                for part in re.split(r"\s{2,}", stripped)
                if part.strip()
            ]
            if len(parts) < 4:
                continue

            amount = parts[-1].replace(",", "")
            record = {
                "page": page_no,
                "jabatanCode": jabatan_code,
                "jabatanName": jabatan_name,
                "ptjpkCode": ptjpk_code,
                "ptjpkName": ptjpk_name,
                "bil": parts[0],
                "noRujukan": " ".join(parts[1:-3]),
                "noGajiNoKp": parts[-3],
                "nama": parts[-2],
                "amaunRm": amount,
                "tarikh": payment_month,
                "noResit": "",
                "catatan": "bayaran",
            }
            records.append(record)

            if limit is not None and len(records) >= limit:
                break

        if limit is not None and len(records) >= limit:
            break

    total_amount = sum(float(record["amaunRm"]) for record in records)

    return {
        "documentType": "bayaran",
        "recordCount": len(records),
        "totalAmount": f"{total_amount:.2f}",
        "paymentMonth": payment_month,
        "records": records,
    }


def extract_bayaran_from_xlsx(_file_bytes: bytes, _limit: int | None = None) -> dict:
    raise NotImplementedError("Pengekstrakan bayaran Excel belum dilaksanakan.")
