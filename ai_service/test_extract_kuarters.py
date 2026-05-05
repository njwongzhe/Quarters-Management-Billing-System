from __future__ import annotations

from io import BytesIO
import zipfile

from extractor import extract_kuarters_from_xlsx


def _cell_ref(row: int, column: int) -> str:
    letters = ""
    while column:
        column, remainder = divmod(column - 1, 26)
        letters = chr(65 + remainder) + letters
    return f"{letters}{row}"


def _sheet_xml(rows: list[list[str]]) -> str:
    sheet_rows = []
    for row_index, row in enumerate(rows, start=1):
        cells = []
        for column_index, value in enumerate(row, start=1):
            cell_ref = _cell_ref(row_index, column_index)
            cells.append(
                f'<c r="{cell_ref}" t="inlineStr"><is><t>{value}</t></is></c>'
            )
        sheet_rows.append(f'<row r="{row_index}">{"".join(cells)}</row>')

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(sheet_rows)}</sheetData>'
        "</worksheet>"
    )


def _minimal_xlsx(rows: list[list[str]]) -> bytes:
    output = BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            "</Types>",
        )
        archive.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            "</Relationships>",
        )
        archive.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Kuarters Test" sheetId="1" r:id="rId1"/></sheets>'
            "</workbook>",
        )
        archive.writestr(
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            "</Relationships>",
        )
        archive.writestr("xl/worksheets/sheet1.xml", _sheet_xml(rows))

    return output.getvalue()


def test_extract_kuarters_splits_special_maintenance_types() -> None:
    workbook = _minimal_xlsx(
        [
            [
                "KATEGORI / KAWASAN",
                "NO. RUMAH / NO. UNIT",
                "ALAMAT KUARTERS",
                "",
                "SEWA(RM)",
                "senggara",
                "kadar denda",
            ],
            [
                "PANGSAPURI PERSIARAN TANJUNG",
                "A-01-02-A",
                "",
                "",
                "150",
                "(Type A: 237.5) (Type B: 237.0)",
                "1200",
            ],
            ["PANGSAPURI PERSIARAN TANJUNG", "A-01-05-B", "", "", "", "", ""],
            [
                "TAMAN TAMPOI INDAH II",
                "# 01-23A",
                "JALAN MAWAR 4",
                "",
                "150",
                "(Tingkat 1: 61.6)(Tingkat 2 Type A: 53.9) (Tingkat 2Type B: 61.6)",
                "900",
            ],
            ["TAMAN TAMPOI INDAH II", "# 03-03B", "JALAN MAWAR 4", "", "", "", ""],
        ]
    )

    result = extract_kuarters_from_xlsx(workbook)

    categories = {record["categoryName"]: record for record in result["records"]}
    assert result["recordCount"] == 4
    assert result["totalUnits"] == 4
    assert categories["Kuarters Test - Type A"]["kawasan"] == "PANGSAPURI PERSIARAN TANJUNG"
    assert categories["Kuarters Test - Type A"]["maintenancePrice"] == "237.5"
    assert categories["Kuarters Test - Type B"]["maintenancePrice"] == "237"
    assert categories["Kuarters Test - Tingkat 1"]["kawasan"] == "TAMAN TAMPOI INDAH II"
    assert categories["Kuarters Test - Tingkat 1"]["maintenancePrice"] == "61.6"
    assert categories["Kuarters Test - Tingkat 2 Type B"]["maintenancePrice"] == "61.6"


if __name__ == "__main__":
    test_extract_kuarters_splits_special_maintenance_types()
    print("Kuarters extraction test passed.")
