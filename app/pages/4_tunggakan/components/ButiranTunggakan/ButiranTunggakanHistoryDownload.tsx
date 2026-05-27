"use client";

import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import { commonIcons } from "@/app/components/Icon/Icon";
import {
    downloadXlsxFile,
    type XlsxCell,
    type XlsxSheet,
} from "@/lib/download/xlsx-export";
import type { HistoryData } from "./ButiranTunggakanModal";

type ButiranTunggakanHistoryDownloadProps = {
    records: Array<HistoryData & { baki: number }>;
    residentId?: string | null;
};

export default function ButiranTunggakanHistoryDownload({
    records,
    residentId,
}: ButiranTunggakanHistoryDownloadProps) {
    function handleDownload() {
        const headers: XlsxCell[] = [
            { value: "Tarikh", style: "header" },
            { value: "ID Transaksi", style: "header" },
            { value: "Kategori", style: "header" },
            { value: "Catatan", style: "header" },
            { value: "Debit (RM)", style: "header", align: "right" },
            { value: "Kredit (RM)", style: "header", align: "right" },
            { value: "Baki (RM)", style: "header", align: "right" },
        ];
        const rows: XlsxSheet["rows"] = records.map((row) => [
            row.tarikh,
            row.id,
            row.kategori,
            row.catatan,
            { value: row.debit, type: "number", align: "right" },
            { value: row.kredit, type: "number", align: "right" },
            { value: row.baki, type: "number", align: "right" },
        ]);

        const filename = residentId
            ? `sejarah-transaksi-penghuni-${residentId.replace(/[^a-zA-Z0-9_-]/g, "")}`
            : "sejarah-transaksi-penghuni";

        downloadXlsxFile({
            filename,
            sheets: [
                {
                    name: "Sejarah Transaksi",
                    columns: [
                        { width: 16 },
                        { width: 22 },
                        { width: 20 },
                        { width: 38 },
                        { width: 16 },
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
            label="Muat turun sejarah tunggakan"
            onClick={handleDownload}
        />
    );
}
