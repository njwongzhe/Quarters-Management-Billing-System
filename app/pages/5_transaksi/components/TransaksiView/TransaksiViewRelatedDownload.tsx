"use client";

import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import { commonIcons } from "@/app/components/Icon/Icon";
import {
  downloadXlsxFile,
  type XlsxCell,
  type XlsxSheet,
} from "@/lib/download/xlsx-export";

type RelatedRecord = {
  id: string;
  transactionNo?: string | null;
  transactionDate: string | Date;
  status: string;
  description?: string | null;
  debitAmount: number | string;
  creditAmount: number | string;
};

type TransaksiViewRelatedDownloadProps = {
  records: RelatedRecord[];
  transactionNo?: string | null;
};

export default function TransaksiViewRelatedDownload({
  records,
  transactionNo,
}: TransaksiViewRelatedDownloadProps) {
  function handleDownload() {
    const headers: XlsxCell[] = [
      { value: "Tarikh", style: "header" },
      { value: "ID Transaksi", style: "header" },
      { value: "Status", style: "header" },
      { value: "Catatan", style: "header" },
      { value: "Debit (RM)", style: "header", align: "right" },
      { value: "Kredit (RM)", style: "header", align: "right" },
    ];

    const rows: XlsxSheet["rows"] = records.map((row) => {
      const d = new Date(row.transactionDate);
      const formattedDate = isNaN(d.getTime())
        ? String(row.transactionDate)
        : d.toLocaleDateString("en-GB");

      return [
        formattedDate,
        row.transactionNo || row.id,
        row.status === "DIBALIKAN" ? "DIBALIKKAN" : row.status,
        row.description || "",
        { value: Number(row.debitAmount), type: "number", align: "right" },
        { value: Number(row.creditAmount), type: "number", align: "right" },
      ];
    });

    const filename = transactionNo
      ? `transaksi-berkaitan-${transactionNo.replace(/[^a-zA-Z0-9_-]/g, "")}`
      : "transaksi-berkaitan";

    downloadXlsxFile({
      filename,
      sheets: [
        {
          name: "Transaksi Berkaitan",
          columns: [
            { width: 16 },
            { width: 22 },
            { width: 16 },
            { width: 38 },
            { width: 16 },
            { width: 16 },
          ],
          rows: [headers, ...rows],
        },
      ],
    });
  }

  return (
    <ToolbarIconButton
      icon={commonIcons.download}
      label="Muat turun transaksi berkaitan"
      onClick={handleDownload}
    />
  );
}
