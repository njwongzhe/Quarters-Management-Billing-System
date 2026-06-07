"use client";

import ToolbarButton from "@/app/components/ToolbarIconButton";
import { downloadXlsxFile } from "@/lib/download/xlsx-export";
import type { TunggakanListItem } from "@/lib/arrears/arrears";

type ArrearsDownloadProps = {
  isLoading: boolean;
  data: TunggakanListItem[];
  filteredData: TunggakanListItem[];
  activeFilterCount: number;
  selectedChargeMonthLabel: string;
};

export default function ArrearsDownload({
  isLoading,
  data,
  filteredData,
  activeFilterCount,
  selectedChargeMonthLabel,
}: ArrearsDownloadProps) {
  const handleExport = () => {
    const exportData = activeFilterCount > 0 ? filteredData : data;
    const filename = activeFilterCount > 0
      ? `Tunggakan_Ditapis_${new Date().toISOString().slice(0, 10)}`
      : `Tunggakan_Semua_${new Date().toISOString().slice(0, 10)}`;

    const formatQuarterLocation = (row: TunggakanListItem) =>
      row.quarterAddress ? `${row.unitCode}, ${row.quarterAddress}` : row.unitCode;

    downloadXlsxFile({
      filename,
      sheets: [
        {
          name: "Senarai Tunggakan",
          columns: [
            { width: 28 },
            { width: 18 },
            { width: 16 },
            { width: 36 },
            { width: 16 },
            { width: 16 },
            { width: 16 },
            { width: 16 },
            { width: 16 },
            { width: 14 },
          ],
          rows: [
            [
              { value: "NAMA PENGHUNI", style: "header" },
              { value: "NO. KAD PENGENALAN", style: "header" },
              { value: "KELAS KUARTERS", style: "header" },
              { value: "KOD UNIT / ALAMAT", style: "header" },
              { value: `SEWA ${selectedChargeMonthLabel} (RM)`, style: "header", align: "right" },
              { value: `SENGGARA ${selectedChargeMonthLabel} (RM)`, style: "header", align: "right" },
              { value: `PENALTI ${selectedChargeMonthLabel} (RM)`, style: "header", align: "right" },
              { value: `TAMBAHAN ${selectedChargeMonthLabel} (RM)`, style: "header", align: "right" },
              { value: `REBAT ${selectedChargeMonthLabel} (RM)`, style: "header", align: "right" },
              { value: "TUNGGAKAN (RM)", style: "header", align: "right" },
            ],
            ...exportData.map((row) => [
              { value: row.fullName },
              { value: row.icNumber },
              { value: row.quarterClass },
              { value: formatQuarterLocation(row) },
              { value: row.sewa, type: "number" as const, align: "right" as const },
              { value: row.senggara, type: "number" as const, align: "right" as const },
              { value: row.penalti, type: "number" as const, align: "right" as const },
              { value: row.tambahan, type: "number" as const, align: "right" as const },
              { value: row.rebat, type: "number" as const, align: "right" as const },
              { value: row.jumlahTunggakan, type: "number" as const, align: "right" as const },
            ]),
          ],
        },
      ],
    });
  };

  return (
    <ToolbarButton
      icon="download"
      label={
        activeFilterCount > 0
          ? `Eksport ${filteredData.length} rekod ditapis`
          : `Eksport semua ${data.length} rekod`
      }
      onClick={handleExport}
      disabled={isLoading || data.length === 0}
    />
  );
}
