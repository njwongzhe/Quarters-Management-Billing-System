"use client";

import ToolbarButton from "@/app/components/ToolbarIconButton";
import {
  downloadXlsxFile,
  type XlsxCell,
  type XlsxSheet,
} from "@/lib/download/xlsx-export";
import type { BayaranExportRow } from "@/lib/payments/bayaran-types";

type BayaranDownloadProps = {
  exportRows: BayaranExportRow[];
};

export default function BayaranDownload({ exportRows }: BayaranDownloadProps) {
  function handleDownload() {
    const headers: XlsxCell[] = [
      { value: "Nama Penghuni", style: "header" },
      { value: "No. Kad Pengenalan", style: "header" },
      { value: "Kelas Kuarters", style: "header" },
      { value: "Kod Unit", style: "header" },
      { value: "Tunggakan (RM)", style: "header", align: "right" },
      { value: "Amaun Bayar Bulan Kini (RM)", style: "header", align: "right" },
      { value: "Status Bayaran", style: "header", align: "center" },
    ];
    const rows: XlsxSheet["rows"] = exportRows.map((row) => [
      row.name,
      row.ic,
      row.quarters,
      row.unit,
      row.arrearsAmount === null
        ? { value: "N/A", align: "right" }
        : { value: row.arrearsAmount, type: "number", align: "right" },
      { value: row.amount, type: "number", align: "right" },
      { value: row.status, align: "center" },
    ]);

    downloadXlsxFile({
      filename: "senarai-rekod-bayaran",
      sheets: [
        {
          name: "Rekod Bayaran",
          columns: [
            { width: 34 },
            { width: 24 },
            { width: 24 },
            { width: 18 },
            { width: 18 },
            { width: 28 },
            { width: 22 },
          ],
          rows: [headers, ...rows],
        },
      ],
    });
  }

  return (
    <ToolbarButton
      icon="download"
      label="Muat turun rekod bayaran"
      disabled={exportRows.length === 0}
      onClick={handleDownload}
    />
  );
}
