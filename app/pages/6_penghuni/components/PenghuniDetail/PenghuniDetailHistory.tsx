"use client";

import { useState, useEffect } from "react";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import { usePaginationLogic, PaginationControls } from "@/app/components/Pagination/Pagination";
import { Topic } from "../../../../components/InputField";
import PenghuniDetailHistoryDownload from "./PenghuniDetailHistoryDownload";
import { usePenghuniDetailHistoryFilter } from "./PenghuniDetailHistoryFilter";

export type TransactionRecord = {
    id: string;
    transactionNo?: string | null;
    tarikh: string;
    kategori: string;
    catatan: string;
    debit: number;
    kredit: number;
};

// Helper function to format currency values in Malaysian Ringgit format.
function formatCurrency(value: number) {
    return value.toLocaleString("ms-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Helper function to get text color class based on baki value.
function getBakiColorClass(baki: number): string {
    if (baki > 0) return "text-red";   // Positive (Owed)
    if (baki < 0) return "text-green"; // Negative (Credit / Overpaid)
    return "text-dark-blue";           // Zero (Neutral)
}

// Helper function to calculate running balance for each transaction.
function calculateRunningBalances(transactions: TransactionRecord[]): (TransactionRecord & { baki: number })[] {
    let runningBalance = 0;

    const reversedTransactions = [...transactions].reverse();
    
    const withBaki = reversedTransactions.map(transaction => {
        runningBalance += transaction.debit - transaction.kredit;
        return {
            ...transaction,
            baki: runningBalance,
        };
    });

    return withBaki.reverse();
}

export default function PenghuniDetailHistory({ residentId }: { residentId?: string }) {
    // State Controls
    const [history, setHistory] = useState<TransactionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        async function loadTransactions() {
            if (!residentId) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setErrorMessage(null);

            try {
                const response = await fetch(`/api/residents-transaction-history?residentId=${residentId}`, {
                    signal: controller.signal,
                });
                const payload = await response.json();

                if (!response.ok || !payload?.success) {
                    throw new Error(payload?.message ?? "Gagal mendapatkan sejarah transaksi.");
                }

                setHistory(payload.data ?? []);
            } catch (error: any) {
                if (controller.signal.aborted) return;
                setErrorMessage(error.message || "Ralat ketika mengambil data transaksi.");
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadTransactions();

        return () => controller.abort();
    }, [residentId]);

    // Pagination Logic
    const itemsPerPage = 10;

    // Calculate running balances for the transaction history before applying pagination.
    const historyWithBaki = calculateRunningBalances(history);

    // Apply date range filter via extracted hook.
    const { filteredHistory, FilterButton } = usePenghuniDetailHistoryFilter(historyWithBaki, isLoading);

    const { currentPage, totalPages, startIndex, endIndex, handlePageChange, paginationItems } = usePaginationLogic(filteredHistory.length, itemsPerPage);
    const currentHistory = filteredHistory.slice(startIndex, endIndex);

    return (
        <div className="flex flex-col gap-4">
            {/* Section Title */}
            <div className="flex flex-row items-center justify-between">
                {/* Title */}
                <Topic content="SEJARAH TRANSAKSI" />

                {/* Toolbar Icons */}
                <div className="flex flex-row gap-4 items-center">
                    {FilterButton}
                    <PenghuniDetailHistoryDownload
                        disabled={isLoading}
                        records={filteredHistory}
                        residentId={residentId}
                    />
                </div>
            </div>

            {/* Transaction History Table */}
            <div className="rounded-lg overflow-hidden border border-light-grey/20">
                <table className="w-full overflow-x-auto">
                    <thead>
                        <tr className="font-bold text-xs text-grey bg-background">
                            <th className="text-left p-3">Tarikh</th>
                            <th className="text-left p-3">ID</th>
                            <th className="text-left p-3">Kategori</th>
                            <th className="text-left p-3">Catatan</th>
                            <th className="text-right p-3">Debit (RM)</th>
                            <th className="text-right p-3">Kredit (RM)</th>
                            <th className="text-right p-3">Baki (RM)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {isLoading ? (
                            loadingTableRows({
                                mode: "loading",
                                columnCount: 7,
                                rowCount: 10,
                            })
                        ) : errorMessage ? (
                            loadingTableRows({
                                mode: "message",
                                columnCount: 7,
                                rowCount: 1,
                                message: errorMessage,
                            })
                        ) : currentHistory.length === 0 ? (
                            loadingTableRows({
                                mode: "message",
                                columnCount: 7,
                                rowCount: 1,
                                message: "Tiada sejarah transaksi ditemui.",
                            })
                        ) : (
                            currentHistory.map((row) => (
                                <tr key={row.id} className="text-sm border-b border-b-light-grey/20 transition-colors">
                                    <td className="px-3 py-2 text-left font-medium">{row.tarikh}</td>
                                    <td className="px-3 py-2 text-left">{row.transactionNo || row.id}</td>
                                    <td className="px-3 py-2 text-left">{row.kategori}</td>
                                    <td className="px-3 py-2 text-left">{row.catatan}</td>
                                    <td className="px-3 py-2 text-right text-red">{row.debit > 0 ? formatCurrency(row.debit) : "-"}</td>
                                    <td className="px-3 py-2 text-right text-green">{row.kredit > 0 ? formatCurrency(row.kredit) : "-"}</td>
                                    <td className={`px-3 py-2 text-right font-bold ${getBakiColorClass(row.baki)}`}>{formatCurrency(row.baki)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    
                    {/* Pagination Controls */}
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

