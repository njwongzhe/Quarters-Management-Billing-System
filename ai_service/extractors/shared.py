from __future__ import annotations

from datetime import datetime, timedelta
from io import BytesIO
import posixpath
import re
import zipfile
import xml.etree.ElementTree as ET


SPREADSHEET_NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def read_xlsx(file_bytes: bytes) -> dict:
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


def build_header_map_for(
    row: list[str],
    aliases_by_field: dict[str, tuple[str, ...]],
) -> dict[str, int]:
    header_map: dict[str, int] = {}

    for index, header in enumerate(row):
        canonical_field = canonical_field_for_header(header, aliases_by_field)
        if canonical_field and canonical_field not in header_map:
            header_map[canonical_field] = index

    return header_map


def canonical_field_for_header(
    header: str,
    aliases_by_field: dict[str, tuple[str, ...]],
) -> str | None:
    clean_header_value = clean_header(header)
    if not clean_header_value:
        return None

    for field, aliases in aliases_by_field.items():
        clean_aliases = {clean_header(alias) for alias in aliases}
        if clean_header_value in clean_aliases:
            return field

    return None


def get_cell(row: list[str], header_map: dict[str, int], header: str) -> str:
    index = header_map.get(header)
    if index is None or index >= len(row):
        return ""
    return row[index].strip()


def clean_header(value: str) -> str:
    return re.sub(r"[^A-Z0-9]+", " ", value.upper()).strip()


def normalize_unit(value: str) -> str:
    if value.endswith(".0"):
        return value[:-2]
    return value


def normalize_date(value: str) -> str:
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


def normalize_fee(value: str) -> str:
    value = value.strip()
    if not value:
        return ""
    if value.lower() in {"tiada", "n/a", "na", "-"}:
        return "0"
    if value.endswith(".0"):
        return value[:-2]
    return value


def _read_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []

    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    strings = []
    for item in root.findall("a:si", SPREADSHEET_NS):
        strings.append(
            "".join(text.text or "" for text in item.findall(".//a:t", SPREADSHEET_NS))
        )
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

        normalized_target = _workbook_relationship_path(target, archive)

        sheet_paths.append((sheet.attrib["name"], normalized_target))

    return sheet_paths

def _workbook_relationship_path(target: str, archive: zipfile.ZipFile) -> str:
    normalized_target = posixpath.normpath(target.replace("\\", "/").lstrip("/"))
    candidates = []

    if normalized_target.startswith("xl/"):
        candidates.append(normalized_target)
    else:
        candidates.append(posixpath.normpath(f"xl/{normalized_target}"))
        candidates.append(normalized_target)

    for candidate in candidates:
        if candidate in archive.namelist():
            return candidate

    return candidates[0]


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
        return "".join(
            text.text or "" for text in inline.findall(".//a:t", SPREADSHEET_NS)
        ).strip()

    return (value.text or "").strip() if value is not None else ""


def _column_index(cell_reference: str) -> int:
    match = re.match(r"([A-Z]+)", cell_reference)
    if not match:
        return 1

    index = 0
    for char in match.group(1):
        index = index * 26 + ord(char) - 64
    return index
