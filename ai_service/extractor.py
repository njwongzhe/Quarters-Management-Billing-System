from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from io import BytesIO
import re
import zipfile
import xml.etree.ElementTree as ET


SPREADSHEET_NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


@dataclass(frozen=True)
class ExtractedResident:
    nama: str
    noKadPengenalan: str
    kategoriKawasan: str
    noRumahNoUnit: str
    alamatKuarters: str
    jawatan: str
    gred: str
    jabatan: str
    noTelefon: str
    tarikhMasuk: str
    tarikhKeluar: str
    sewaBulanan: str
    catatan: str
    sourceSheet: str
    sourceRow: int

    def to_response(self) -> dict[str, str | int]:
        pekerjaan = self.jawatan
        if self.gred:
            pekerjaan = f"{pekerjaan} {self.gred}".strip()

        return {
            "nama": self.nama,
            "noKadPengenalan": self.noKadPengenalan,
            "kuarters": self.kategoriKawasan,
            "unit": self.noRumahNoUnit,
            "alamatKuarters": self.alamatKuarters,
            "perhubungan": self.noTelefon,
            "pekerjaan": pekerjaan,
            "jabatan": self.jabatan,
            "tarikhMasuk": self.tarikhMasuk,
            "tarikhKeluar": self.tarikhKeluar,
            "sewaBulanan": self.sewaBulanan,
            "catatan": self.catatan,
            "sourceSheet": self.sourceSheet,
            "sourceRow": self.sourceRow,
        }


def extract_penghuni_from_xlsx(file_bytes: bytes, limit: int = 3) -> dict:
    workbook = _read_xlsx(file_bytes)
    residents: list[ExtractedResident] = []

    for sheet in workbook["sheets"]:
        header_index = _find_header_row(sheet["rows"])
        if header_index is None:
            continue

        headers = [_clean_header(value) for value in sheet["rows"][header_index]]
        header_map = {header: index for index, header in enumerate(headers) if header}

        for row_offset, row in enumerate(sheet["rows"][header_index + 1 :], start=header_index + 2):
            resident = _resident_from_row(sheet["name"], row_offset, row, header_map)
            if resident is None:
                continue

            residents.append(resident)
            if len(residents) >= limit:
                return _build_response(workbook["sheet_names"], residents)

    return _build_response(workbook["sheet_names"], residents)


def _build_response(sheet_names: list[str], residents: list[ExtractedResident]) -> dict:
    return {
        "documentType": "penghuni",
        "recordCount": len(residents),
        "availableSheets": sheet_names,
        "records": [resident.to_response() for resident in residents],
    }


def _read_xlsx(file_bytes: bytes) -> dict:
    with zipfile.ZipFile(BytesIO(file_bytes)) as archive:
        shared_strings = _read_shared_strings(archive)
        sheet_paths = _read_sheet_paths(archive)

        sheets = []
        for sheet_name, sheet_path in sheet_paths:
            rows = _read_sheet_rows(archive, sheet_path, shared_strings)
            sheets.append({"name": sheet_name, "rows": rows})

    return {
        "sheet_names": [name for name, _path in sheet_paths],
        "sheets": sheets,
    }


def _read_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []

    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    strings = []
    for item in root.findall("a:si", SPREADSHEET_NS):
        strings.append("".join(text.text or "" for text in item.findall(".//a:t", SPREADSHEET_NS)))
    return strings


def _read_sheet_paths(archive: zipfile.ZipFile) -> list[tuple[str, str]]:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    rel_map = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels
        if rel.attrib.get("Target")
    }

    sheet_paths: list[tuple[str, str]] = []
    for sheet in workbook.findall("a:sheets/a:sheet", SPREADSHEET_NS):
        rel_id = sheet.attrib.get(f"{{{SPREADSHEET_NS['r']}}}id")
        target = rel_map.get(rel_id or "")
        if not target:
            continue

        sheet_paths.append((sheet.attrib["name"], f"xl/{target.lstrip('/')}"))

    return sheet_paths


def _read_sheet_rows(
    archive: zipfile.ZipFile,
    sheet_path: str,
    shared_strings: list[str],
) -> list[list[str]]:
    root = ET.fromstring(archive.read(sheet_path))
    rows: list[list[str]] = []

    for row in root.findall("a:sheetData/a:row", SPREADSHEET_NS):
        values: list[str] = []
        for cell in row.findall("a:c", SPREADSHEET_NS):
            column_index = _column_index(cell.attrib.get("r", "A1"))
            while len(values) < column_index:
                values.append("")
            values[column_index - 1] = _cell_value(cell, shared_strings)

        rows.append(values)

    return rows


def _cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    value = cell.find("a:v", SPREADSHEET_NS)

    if cell_type == "s" and value is not None:
        return shared_strings[int(value.text or 0)].strip()

    if cell_type == "inlineStr":
        inline = cell.find("a:is", SPREADSHEET_NS)
        if inline is None:
            return ""
        return "".join(text.text or "" for text in inline.findall(".//a:t", SPREADSHEET_NS)).strip()

    return (value.text or "").strip() if value is not None else ""


def _column_index(cell_reference: str) -> int:
    match = re.match(r"([A-Z]+)", cell_reference)
    if not match:
        return 1

    index = 0
    for char in match.group(1):
        index = index * 26 + ord(char) - 64
    return index


def _find_header_row(rows: list[list[str]]) -> int | None:
    for index, row in enumerate(rows):
        headers = {_clean_header(value) for value in row}
        if "NAMA PENGHUNI" in headers and "NO KAD PENGENALAN" in headers:
            return index
    return None


def _resident_from_row(
    sheet_name: str,
    source_row: int,
    row: list[str],
    header_map: dict[str, int],
) -> ExtractedResident | None:
    nama = _get(row, header_map, "NAMA PENGHUNI")
    no_kad_pengenalan = _get(row, header_map, "NO KAD PENGENALAN")

    if not nama or nama.upper() == "KOSONG" or not no_kad_pengenalan:
        return None

    return ExtractedResident(
        nama=nama,
        noKadPengenalan=no_kad_pengenalan,
        kategoriKawasan=_get(row, header_map, "KATEGORI KAWASAN"),
        noRumahNoUnit=_normalize_unit(_get(row, header_map, "NO RUMAH NO UNIT")),
        alamatKuarters=_get(row, header_map, "ALAMAT KUARTERS"),
        jawatan=_get(row, header_map, "JAWATAN"),
        gred=_get(row, header_map, "GRED"),
        jabatan=_get(row, header_map, "JABATAN"),
        noTelefon=_get(row, header_map, "NO TELEFON"),
        tarikhMasuk=_normalize_date(_get(row, header_map, "TARIKH MASUK")),
        tarikhKeluar=_normalize_date(_get(row, header_map, "TARIKH KELUAR")),
        sewaBulanan=_get(row, header_map, "SEWA BULANAN"),
        catatan=_get(row, header_map, "CATATAN"),
        sourceSheet=sheet_name,
        sourceRow=source_row,
    )


def _get(row: list[str], header_map: dict[str, int], header: str) -> str:
    index = header_map.get(header)
    if index is None or index >= len(row):
        return ""
    return row[index].strip()


def _clean_header(value: str) -> str:
    return re.sub(r"[^A-Z0-9]+", " ", value.upper()).strip()


def _normalize_unit(value: str) -> str:
    if value.endswith(".0"):
        return value[:-2]
    return value


def _normalize_date(value: str) -> str:
    if not value:
        return ""

    if re.fullmatch(r"\d+(\.0)?", value):
        serial = int(float(value))
        return (datetime(1899, 12, 30) + timedelta(days=serial)).date().isoformat()

    for date_format in ("%d/%m/%Y", "%d.%m.%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(value, date_format).date().isoformat()
        except ValueError:
            pass

    return value
