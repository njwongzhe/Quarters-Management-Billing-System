import { downloadXlsxFile, type XlsxCell, type XlsxSheet } from "@/lib/xlsx-export";

export type DownloadColumn = { width: number };

export type DownloadSheetConfig = {
  name: string;
  columns: DownloadColumn[];
  headers?: XlsxCell[];
  rows: XlsxSheet["rows"];
};

export type DownloadFileConfig = {
  filename: string;
  sheets: DownloadSheetConfig[];
};

// Generic xlsx download API for any feature/module.
export function downloadDataAsXlsx(config: DownloadFileConfig) {
  downloadXlsxFile({
    filename: config.filename,
    sheets: config.sheets.map((sheet) => ({
      name: sheet.name,
      columns: sheet.columns,
      rows: sheet.headers ? [sheet.headers, ...sheet.rows] : sheet.rows,
    })),
  });
}
