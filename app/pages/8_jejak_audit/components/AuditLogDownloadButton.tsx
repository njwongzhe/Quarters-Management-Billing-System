"use client";

import { useState } from "react";

import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import {
  downloadXlsxFile,
  type XlsxCell,
  type XlsxSheet,
} from "@/lib/download/xlsx-export";

type AuditLogExportRecord = {
  id: string;
  timestampLabel: string;
  actor: string;
  module: string;
  actionTypeLabel: string;
  target: string;
  entityTypeLabel: string;
  description: string;
};

type AuditLogExportResponse = {
  success: boolean;
  message?: string;
  data?: {
    records: AuditLogExportRecord[];
  };
};

export default function AuditLogDownloadButton({
  exportHref,
}: {
  exportHref: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    if (isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      const response = await fetch(exportHref, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | AuditLogExportResponse
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message ?? "Gagal mengeksport rekod audit.");
      }

      downloadAuditLogs(payload.data?.records ?? []);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <ToolbarIconButton
      icon="download"
      label="Muat turun rekod audit"
      disabled={isDownloading}
      onClick={handleDownload}
    />
  );
}

function downloadAuditLogs(records: AuditLogExportRecord[]) {
  const headers: XlsxCell[] = [
    { value: "Tarikh & Masa", style: "header" },
    { value: "Pengendali", style: "header" },
    { value: "Modul", style: "header" },
    { value: "Jenis Tindakan", style: "header" },
    { value: "Sasaran Data", style: "header" },
    { value: "Jenis Data", style: "header" },
    { value: "Penerangan", style: "header" },
  ];
  const rows: XlsxSheet["rows"] = records.map((record) => [
    record.timestampLabel,
    record.actor,
    record.module,
    record.actionTypeLabel,
    record.target,
    record.entityTypeLabel,
    record.description,
  ]);

  downloadXlsxFile({
    filename: "senarai-jejak-audit",
    sheets: [
      {
        name: "Jejak Audit",
        columns: [
          { width: 22 },
          { width: 24 },
          { width: 24 },
          { width: 18 },
          { width: 36 },
          { width: 18 },
          { width: 64 },
        ],
        rows: [headers, ...rows],
      },
    ],
  });
}
