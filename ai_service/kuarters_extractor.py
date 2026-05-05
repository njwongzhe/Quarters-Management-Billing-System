from __future__ import annotations

from dataclasses import dataclass
import re

from extractor_shared import (
    build_header_map_for,
    clean_header,
    get_cell,
    normalize_fee,
    normalize_unit,
    read_xlsx,
)


QUARTER_HEADER_ALIASES: dict[str, tuple[str, ...]] = {
    "kategoriKawasan": (
        "KATEGORI KAWASAN",
        "KATEGORI / KAWASAN",
        "KATEGORI",
        "KAWASAN",
        "NAMA KUARTERS",
    ),
    "noRumahNoUnit": (
        "NO RUMAH NO UNIT",
        "NO. RUMAH / NO. UNIT",
        "NO RUMAH",
        "NO UNIT",
        "UNIT",
        "NOMBOR UNIT",
    ),
    "alamatKuarters": ("ALAMAT KUARTERS", "ALAMAT", "ALAMAT RUMAH", "LOKASI"),
    "sewaBulanan": (
        "SEWA",
        "SEWA RM",
        "SEWA(RM)",
        "SEWA BULANAN",
        "KADAR SEWA",
    ),
    "senggara": (
        "SENGGARA",
        "SENGGARA RM",
        "PENYELENGGARAAN",
        "MAINTENANCE",
        "MAINTENANCE FEE",
    ),
    "kadarDenda": ("KADAR DENDA", "DENDA", "PENALTI", "PENALTY"),
}

QUARTER_CONTEXT_FIELDS = (
    "kategoriKawasan",
    "alamatKuarters",
    "sewaBulanan",
    "senggara",
    "kadarDenda",
)


@dataclass
class ExtractedQuarterUnit:
    unitCode: str
    address: str
    sourceSheet: str
    sourceRow: int

    def to_response(self) -> dict[str, str | int]:
        return {
            "unitCode": self.unitCode,
            "address": self.address,
            "sourceSheet": self.sourceSheet,
            "sourceRow": self.sourceRow,
        }


@dataclass
class ExtractedQuarterCategory:
    id: str
    categoryName: str
    kawasan: str
    typeLabel: str
    rentalPrice: str
    maintenancePrice: str
    penaltyPrice: str
    sourceSheet: str
    sourceRow: int
    units: list[ExtractedQuarterUnit]

    def to_response(self) -> dict[str, str | int | list[dict[str, str | int]]]:
        return {
            "id": self.id,
            "categoryName": self.categoryName,
            "kawasan": self.kawasan,
            "typeLabel": self.typeLabel,
            "rentalPrice": self.rentalPrice,
            "maintenancePrice": self.maintenancePrice,
            "penaltyPrice": self.penaltyPrice,
            "unitCount": len(self.units),
            "sourceSheet": self.sourceSheet,
            "sourceRow": self.sourceRow,
            "units": [unit.to_response() for unit in self.units],
        }


def extract_kuarters_from_xlsx(file_bytes: bytes, limit: int | None = None) -> dict:
    workbook = read_xlsx(file_bytes)
    categories: dict[str, ExtractedQuarterCategory] = {}

    for sheet in workbook["sheets"]:
        header_index = _find_quarter_header_row(sheet["rows"])
        if header_index is None:
            continue

        header_map = build_header_map_for(
            sheet["rows"][header_index],
            QUARTER_HEADER_ALIASES,
        )
        current_rental = ""
        current_maintenance = ""
        current_penalty = ""
        sheet_category_name = _sheet_category_name(sheet["name"])

        for row_offset, row in enumerate(
            sheet["rows"][header_index + 1 :],
            start=header_index + 2,
        ):
            kawasan = get_cell(row, header_map, "kategoriKawasan")
            address = _quarter_address(
                kawasan,
                get_cell(row, header_map, "alamatKuarters"),
                sheet_category_name,
            )
            unit_code = normalize_unit(get_cell(row, header_map, "noRumahNoUnit"))

            if not unit_code or _is_summary_unit(unit_code):
                continue

            rental = normalize_fee(get_cell(row, header_map, "sewaBulanan"))
            maintenance = get_cell(row, header_map, "senggara")
            penalty = normalize_fee(get_cell(row, header_map, "kadarDenda"))

            if rental:
                current_rental = rental
            if maintenance:
                current_maintenance = maintenance
            if penalty:
                current_penalty = penalty

            maintenance_options = _parse_maintenance_options(current_maintenance)
            selected_label, selected_maintenance = _select_maintenance_option(
                unit_code,
                maintenance_options,
            )
            category_name = _quarter_category_name(
                sheet_category_name or kawasan or address,
                selected_label,
            )
            category_id = _category_id(
                category_name,
                address,
                current_rental,
                selected_maintenance,
                current_penalty,
            )

            if category_id not in categories:
                categories[category_id] = ExtractedQuarterCategory(
                    id=category_id,
                    categoryName=category_name,
                    kawasan=address,
                    typeLabel=selected_label,
                    rentalPrice=current_rental,
                    maintenancePrice=selected_maintenance,
                    penaltyPrice=current_penalty,
                    sourceSheet=sheet["name"],
                    sourceRow=row_offset,
                    units=[],
                )

            categories[category_id].units.append(
                ExtractedQuarterUnit(
                    unitCode=unit_code,
                    address=get_cell(row, header_map, "alamatKuarters") or kawasan,
                    sourceSheet=sheet["name"],
                    sourceRow=row_offset,
                )
            )

            if limit is not None and len(categories) >= limit:
                return _build_quarters_response(
                    workbook["sheet_names"],
                    list(categories.values()),
                )

    return _build_quarters_response(workbook["sheet_names"], list(categories.values()))


def _find_quarter_header_row(rows: list[list[str]]) -> int | None:
    for index, row in enumerate(rows):
        header_map = build_header_map_for(row, QUARTER_HEADER_ALIASES)
        if "noRumahNoUnit" in header_map and any(
            field in header_map for field in QUARTER_CONTEXT_FIELDS
        ):
            return index
    return None


def _build_quarters_response(
    sheet_names: list[str],
    categories: list[ExtractedQuarterCategory],
) -> dict:
    total_units = sum(len(category.units) for category in categories)

    return {
        "documentType": "kuarters",
        "recordCount": len(categories),
        "totalUnits": total_units,
        "availableSheets": sheet_names,
        "records": [category.to_response() for category in categories],
    }


def _parse_maintenance_options(value: str) -> list[tuple[str, str]]:
    normalized_value = normalize_fee(value)
    if not normalized_value:
        return [("", "")]

    options = [
        (_clean_option_label(match.group(1)), normalize_fee(match.group(2)))
        for match in re.finditer(
            r"\(?\s*([^:()]+?)\s*:\s*([0-9]+(?:\.[0-9]+)?)",
            normalized_value,
        )
    ]
    if options:
        return options

    return [("", normalized_value)]


def _select_maintenance_option(
    unit_code: str,
    options: list[tuple[str, str]],
) -> tuple[str, str]:
    if len(options) == 1:
        return options[0]

    unit_key = clean_header(unit_code)
    suffix_match = re.search(r"([AB])(?:\s|\)|$)", unit_code.upper().replace("\n", " "))
    suffix = suffix_match.group(1) if suffix_match else ""
    floor_match = re.search(r"#?\s*0?(\d{1,2})-", unit_code)
    floor = floor_match.group(1) if floor_match else ""

    for label, fee in options:
        clean_label = clean_header(label)
        if suffix and f"TYPE {suffix}" in clean_label:
            return label, fee
        if suffix and clean_label == f"TYPE {suffix}":
            return label, fee
        if floor == "1" and "TINGKAT 1" in clean_label:
            return label, fee
        if floor and floor != "1" and suffix and f"TYPE {suffix}" in clean_label:
            return label, fee
        if clean_label and clean_label in unit_key:
            return label, fee

    return options[0]


def _clean_option_label(value: str) -> str:
    value = re.sub(r"(\d)(Type)", r"\1 Type", value, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", value).strip()


def _quarter_category_name(kawasan: str, type_label: str) -> str:
    if not type_label:
        return kawasan
    return f"{kawasan} - {type_label}"


def _sheet_category_name(sheet_name: str) -> str:
    value = re.sub(r"\s+", " ", sheet_name).strip()
    if re.fullmatch(r"sheet\s*\d+", value, flags=re.IGNORECASE):
        return ""
    return value


def _quarter_address(kawasan: str, address: str, category_name: str) -> str:
    for value in (kawasan, address):
        normalized_value = re.sub(r"\s+", " ", value).strip()
        if normalized_value and clean_header(normalized_value) != clean_header(category_name):
            return normalized_value
    return ""


def _category_id(
    category_name: str,
    address: str,
    rental_price: str,
    maintenance_price: str,
    penalty_price: str,
) -> str:
    raw_key = "|".join(
        [category_name, address, rental_price, maintenance_price, penalty_price]
    )
    return re.sub(r"[^a-z0-9]+", "-", raw_key.lower()).strip("-")


def _is_summary_unit(value: str) -> bool:
    clean_value = clean_header(value)
    return clean_value in {
        "ISI",
        "KOSONG",
        "LAIN LAIN",
        "KPRJ",
        "JUMLAH KUARTERS",
        "JUMLAH",
    }
