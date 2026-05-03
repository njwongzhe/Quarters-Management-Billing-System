from pathlib import Path
import json
import sys

from extractor import extract_penghuni_from_xlsx


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python test_extract_penghuni.py <xlsx-path>")

    workbook_path = Path(sys.argv[1])
    result = extract_penghuni_from_xlsx(workbook_path.read_bytes(), limit=3)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
