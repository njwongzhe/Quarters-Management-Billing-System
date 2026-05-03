export type XlsxCellValue = string | number | boolean | null | undefined;

export type XlsxCell = {
  value: XlsxCellValue;
  type?: "text" | "number" | "boolean";
  style?: "default" | "header";
  align?: "left" | "center" | "right";
};

export type XlsxColumn = {
  width?: number;
};

export type XlsxSheet = {
  name: string;
  columns?: XlsxColumn[];
  rows: Array<Array<XlsxCellValue | XlsxCell>>;
};

export type XlsxWorkbookOptions = {
  sheets: XlsxSheet[];
};

export type DownloadXlsxOptions = XlsxWorkbookOptions & {
  filename: string;
};

export function downloadXlsxFile({ filename, sheets }: DownloadXlsxOptions) {
  const blob = createXlsxWorkbook({ sheets });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const resolvedFilename = filename.toLowerCase().endsWith(".xlsx")
    ? filename
    : `${filename}.xlsx`;

  anchor.href = url;
  anchor.download = resolvedFilename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function createXlsxWorkbook({ sheets }: XlsxWorkbookOptions) {
  const safeSheets = sheets.length > 0 ? sheets : [{ name: "Sheet1", rows: [] }];
  const sheetParts = safeSheets.map((sheet, index) => ({
    sheet,
    id: index + 1,
    path: `xl/worksheets/sheet${index + 1}.xml`,
  }));
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets>
        ${sheetParts
          .map(
            ({ sheet, id }) =>
              `<sheet name="${escapeXml(normalizeSheetName(sheet.name))}" sheetId="${id}" r:id="rId${id}"/>`,
          )
          .join("")}
      </sheets>
    </workbook>`;
  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      ${sheetParts
        .map(
          ({ id }) =>
            `<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${id}.xml"/>`,
        )
        .join("")}
      <Relationship Id="rId${sheetParts.length + 1}"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
        Target="styles.xml"/>
    </Relationships>`;
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
        Target="xl/workbook.xml"/>
    </Relationships>`;
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/xl/workbook.xml"
        ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
      ${sheetParts
        .map(
          ({ id }) =>
            `<Override PartName="/xl/worksheets/sheet${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        )
        .join("")}
      <Override PartName="/xl/styles.xml"
        ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
    </Types>`;
  const stylesXml = createStylesXml();
  const files: Array<[string, string]> = [
    ["[Content_Types].xml", contentTypesXml],
    ["_rels/.rels", rootRelsXml],
    ["xl/workbook.xml", workbookXml],
    ["xl/_rels/workbook.xml.rels", workbookRelsXml],
    ["xl/styles.xml", stylesXml],
    ...sheetParts.map(
      ({ sheet, path }) => [path, createWorksheetXml(sheet)] as [string, string],
    ),
  ];

  return createZipBlob(files);
}

function createWorksheetXml(sheet: XlsxSheet) {
  const columnsXml =
    sheet.columns && sheet.columns.length > 0
      ? `<cols>${sheet.columns
          .map((column, index) => {
            const width = column.width ?? 12;
            const columnNumber = index + 1;

            return `<col min="${columnNumber}" max="${columnNumber}" width="${width}" customWidth="1"/>`;
          })
          .join("")}</cols>`
      : "";
  const sheetRows = sheet.rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row
        .map((value, columnIndex) => {
          const cell = normalizeCell(value);
          const cellReference = `${getColumnName(columnIndex + 1)}${rowNumber}`;
          const styleIndex = getCellStyleIndex(cell);

          return createCellXml(cellReference, cell, styleIndex);
        })
        .join("");

      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      ${columnsXml}
      <sheetData>${sheetRows}</sheetData>
    </worksheet>`;
}

function normalizeCell(value: XlsxCellValue | XlsxCell): XlsxCell {
  if (typeof value === "object" && value !== null && "value" in value) {
    return {
      type: "text",
      style: "default",
      align: "left",
      ...value,
    };
  }

  return {
    value,
    type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "text",
    style: "default",
    align: typeof value === "number" ? "right" : "left",
  };
}

function createCellXml(cellReference: string, cell: XlsxCell, styleIndex: number) {
  if (cell.value === null || cell.value === undefined) {
    return `<c r="${cellReference}" t="inlineStr" s="${styleIndex}"><is><t></t></is></c>`;
  }

  if (cell.type === "number" && typeof cell.value === "number") {
    return `<c r="${cellReference}" t="n" s="${styleIndex}"><v>${cell.value}</v></c>`;
  }

  if (cell.type === "boolean" && typeof cell.value === "boolean") {
    return `<c r="${cellReference}" t="b" s="${styleIndex}"><v>${cell.value ? 1 : 0}</v></c>`;
  }

  return `<c r="${cellReference}" t="inlineStr" s="${styleIndex}"><is><t>${escapeXml(
    String(cell.value),
  )}</t></is></c>`;
}

function getCellStyleIndex(cell: XlsxCell) {
  if (cell.style === "header") {
    return cell.align === "center" ? 4 : cell.align === "right" ? 5 : 1;
  }

  if (cell.align === "center") {
    return 2;
  }

  if (cell.align === "right") {
    return 3;
  }

  return 0;
}

function createStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <fonts count="2">
        <font><sz val="11"/><name val="Calibri"/></font>
        <font><b/><sz val="11"/><name val="Calibri"/></font>
      </fonts>
      <fills count="2">
        <fill><patternFill patternType="none"/></fill>
        <fill><patternFill patternType="gray125"/></fill>
      </fills>
      <borders count="1"><border/></borders>
      <cellStyleXfs count="1"><xf numFmtId="49" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
      <cellXfs count="6">
        <xf numFmtId="49" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"><alignment horizontal="left"/></xf>
        <xf numFmtId="49" fontId="1" fillId="0" borderId="0" applyFont="1" applyNumberFormat="1"><alignment horizontal="left"/></xf>
        <xf numFmtId="49" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"><alignment horizontal="center"/></xf>
        <xf numFmtId="49" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"><alignment horizontal="right"/></xf>
        <xf numFmtId="49" fontId="1" fillId="0" borderId="0" applyFont="1" applyNumberFormat="1"><alignment horizontal="center"/></xf>
        <xf numFmtId="49" fontId="1" fillId="0" borderId="0" applyFont="1" applyNumberFormat="1"><alignment horizontal="right"/></xf>
      </cellXfs>
      <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
    </styleSheet>`;
}

function normalizeSheetName(name: string) {
  return name.replace(/[\][*?/\\:]/g, " ").trim().slice(0, 31) || "Sheet1";
}

function getColumnName(columnNumber: number) {
  let name = "";
  let value = columnNumber;

  while (value > 0) {
    const remainder = (value - 1) % 26;

    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function createZipBlob(files: Array<[string, string]>) {
  const encoder = new TextEncoder();
  const localFileChunks: Uint8Array[] = [];
  const centralDirectoryChunks: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of files) {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(content);
    const checksum = crc32(dataBytes);
    const localHeader = createLocalFileHeader(
      nameBytes,
      dataBytes.length,
      checksum,
    );
    const centralDirectoryHeader = createCentralDirectoryHeader(
      nameBytes,
      dataBytes.length,
      checksum,
      offset,
    );

    localFileChunks.push(localHeader, nameBytes, dataBytes);
    centralDirectoryChunks.push(centralDirectoryHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + dataBytes.length;
  }

  const centralDirectorySize = centralDirectoryChunks.reduce(
    (size, chunk) => size + chunk.length,
    0,
  );
  const endRecord = createEndOfCentralDirectoryRecord(
    files.length,
    centralDirectorySize,
    offset,
  );
  const zipBytes = concatenateUint8Arrays([
    ...localFileChunks,
    ...centralDirectoryChunks,
    endRecord,
  ]);

  return new Blob([zipBytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function createLocalFileHeader(
  nameBytes: Uint8Array,
  dataSize: number,
  checksum: number,
) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, checksum, true);
  view.setUint32(18, dataSize, true);
  view.setUint32(22, dataSize, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);

  return header;
}

function createCentralDirectoryHeader(
  nameBytes: Uint8Array,
  dataSize: number,
  checksum: number,
  localHeaderOffset: number,
) {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, checksum, true);
  view.setUint32(20, dataSize, true);
  view.setUint32(24, dataSize, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localHeaderOffset, true);

  return header;
}

function createEndOfCentralDirectoryRecord(
  fileCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number,
) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return record;
}

function concatenateUint8Arrays(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((length, chunk) => length + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
