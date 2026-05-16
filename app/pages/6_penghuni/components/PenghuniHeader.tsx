import Icon from "@/app/components/Icon/Icon";
import type { PenghuniHeaderProps } from "../page";

// Helper function to create a header card with dynamic content and styling.
function headerCard(title: string, value: string, statusText: string, statusIcon: string, statusColor?: string) {
    const borderColor = statusColor ? `border-${statusColor.replace("text-", "")}` : "border-transparent";

    return (
        <div className={`flex flex-col flex-1 gap-1 border-l-4 ${borderColor} bg-white p-4 rounded-lg shadow`}>
            <h2 className="text-xs text-grey/70 font-semibold">{title}</h2>
            <p className="text-3xl font-bold">{value}</p>
            <p className={`text-xs font-bold flex items-center gap-1 ${statusColor}`}>
                <Icon icon={statusIcon} size={12} /> {statusText}
            </p>
        </div>
    );
}

export function PenghuniHeader({ residents }: PenghuniHeaderProps) {
    // Calculate counts from residents array.
    const totalCount = residents.length;
    const aktifCount = residents.filter(r => r.status === "AKTIF").length;
    const tidakLayakCount = residents.filter(r => r.status === "TIDAK_LAYAK").length;
    const pencenMendatangCount = residents.filter(r => r.status === "PENCEN_MENDATANG").length;
    const dataTidakLengkapCount = residents.filter(r => r.status === "DATA_TIDAK_LENGKAP").length;

    return (
        <div className="flex flex-col gap-4">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-extrabold">Pengurusan Penghuni</h1>
                <p className="text-sm font-extralight text-grey/70">Menguruskan pangkalan data penghuni kuarters kerajaan.</p>
            </div>

            {/* Dashboard Cards */}
            <div className="flex flex-row gap-3">
                {headerCard("JUMLAH PENGHUNI", String(totalCount), "Rekod Dalam Sistem", "list")}
                {headerCard("AKTIF", String(aktifCount), "Masih Layak", "check", "text-aktif")}
                {headerCard("HILANG KELAYAKAN", String(tidakLayakCount), "Tidak Layak", "close", "text-x-layak")}
                {headerCard("PENCEN MENDATANG", String(pencenMendatangCount), "Tindakan Diperlukan", "warning", "text-pencen-datang")}
                {headerCard("DATA TIDAK LENGKAP", String(dataTidakLengkapCount), "Kemas Kini Segara", "info", "text-x-lengkap")}
            </div>
        </div>
    );
}