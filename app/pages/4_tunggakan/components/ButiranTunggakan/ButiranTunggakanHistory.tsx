"use client";

import { usePaginationLogic, PaginationControls } from "@/app/components/Pagination/Pagination";
import type { HistoryData } from "./ButiranTunggakanModal";
import ButiranTunggakanHistoryDownload from "./ButiranTunggakanHistoryDownload";
import { useButiranTunggakanHistoryFilter } from "./ButiranTunggakanHistoryFilter";

function formatCurrency(value: number) {
    return value.toLocaleString("ms-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function getBakiColorClass(baki: number): string {
    if (baki > 0) return "text-red";
    if (baki < 0) return "text-green";
    return "text-dark-blue";
}

function calculateRunningBalances(transactions: HistoryData[]): (HistoryData & { baki: number })[] {
    let runningBalance = 0;
    const result = new Array(transactions.length);
    // Calculate running balance from oldest (end of array) to newest (start of array)
    for (let i = transactions.length - 1; i >= 0; i--) {
        const transaction = transactions[i];
        runningBalance += transaction.debit - transaction.kredit;
        result[i] = {
            ...transaction,
            baki: runningBalance,
        };
    }
    return result;
}

type ButiranTunggakanHistoryProps = {
    history: HistoryData[];
    residentId: string | null;
};

export default function ButiranTunggakanHistory({ history, residentId }: ButiranTunggakanHistoryProps) {
    const itemsPerPage = 10;
    const historyWithBaki = calculateRunningBalances(history);
    const { filteredHistory, FilterButton } = useButiranTunggakanHistoryFilter(historyWithBaki);
    const { currentPage, totalPages, startIndex, endIndex, handlePageChange, paginationItems } = usePaginationLogic(filteredHistory.length, itemsPerPage);
    const currentHistory = filteredHistory.slice(startIndex, endIndex);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-row items-center justify-between">
                <span className="border-l-4 border-dark-blue pl-3 py-0.5 text-xs text-dark-blue font-bold tracking-widest">
                    SEJARAH TRANSAKSI
                </span>
                <div className="flex flex-row gap-4 items-center">
                    {FilterButton}
                    <ButiranTunggakanHistoryDownload
                        records={filteredHistory}
                        residentId={residentId}
                    />
                </div>
            </div>

            <div className="rounded-lg overflow-hidden border border-light-grey/20">
                <table className="w-full overflow-x-auto">
                    <thead>
                        <tr className="font-bold text-xs text-grey bg-light-blue">
                            <th className="text-left px-4 py-3">Tarikh</th>
                            <th className="text-left px-4 py-3">ID Transaksi</th>
                            <th className="text-left px-4 py-3">Kategori</th>
                            <th className="text-left px-4 py-3">Catatan</th>
                            <th className="text-right px-4 py-3">Debit (RM)</th>
                            <th className="text-right px-4 py-3">Kredit (RM)</th>
                            <th className="text-right px-4 py-3">Baki (RM)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {currentHistory.length === 0 ? (
                            <tr className="text-sm">
                                <td className="px-4 py-4 text-center text-grey" colSpan={7}>Tiada rekod transaksi dijumpai.</td>
                            </tr>
                        ) : (
                            currentHistory.map((row, idx) => (
                                <tr key={idx} className="text-sm border-b border-b-light-grey/20 transition-colors hover:bg-gray-50">
                                    <td className="px-4 py-3 text-left font-medium">{row.tarikh}</td>
                                    <td className="px-4 py-3 text-left">{row.id}</td>
                                    <td className="px-4 py-3 text-left">{row.kategori}</td>
                                    <td className="px-4 py-3 text-left">{row.catatan}</td>
                                    <td className="px-4 py-3 text-right text-red">{row.debit > 0 ? formatCurrency(row.debit) : "-"}</td>
                                    <td className="px-4 py-3 text-right text-green">{row.kredit > 0 ? formatCurrency(row.kredit) : "-"}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${getBakiColorClass(row.baki)}`}>{formatCurrency(row.baki)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={7} className="bg-white border-t border-light-grey/20 px-4 py-4">
                                <PaginationControls
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    startIndex={startIndex}
                                    endIndex={endIndex}
                                    totalRecords={filteredHistory.length}
                                    paginationItems={paginationItems}
                                    onPageChange={handlePageChange}
                                />
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
