"use client";

import { Topic } from "@/app/components/InputField";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import {
  PaginationControls,
  usePaginationLogic,
} from "@/app/components/Pagination/Pagination";

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

function calculateRunningBalances(transactions: HistoryData[]) {
  let runningBalance = 0;
  const result = new Array(transactions.length);

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
  isLoading: boolean;
};

export default function ButiranTunggakanHistory({
  history,
  residentId,
  isLoading,
}: ButiranTunggakanHistoryProps) {
  const itemsPerPage = 10;
  const historyWithBaki = calculateRunningBalances(history);
  const { filteredHistory, FilterButton } = useButiranTunggakanHistoryFilter(
    historyWithBaki,
    isLoading,
  );
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    handlePageChange,
  } = usePaginationLogic(filteredHistory.length, itemsPerPage);
  const currentHistory = filteredHistory.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Topic content="SEJARAH TRANSAKSI" />

        <div className="flex flex-row items-center gap-4">
          {FilterButton}
          <ButiranTunggakanHistoryDownload
            records={filteredHistory}
            residentId={residentId}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-light-grey/20">
        <table className="w-full overflow-x-auto">
          <thead>
            <tr className="bg-background text-xs font-bold text-grey">
              <th className="px-4 py-3 text-left whitespace-nowrap">Tarikh</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">ID Transaksi</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Kategori</th>
              <th className="px-4 py-3 w-full text-left">Catatan</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Debit (RM)</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Kredit (RM)</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Baki (RM)</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading ? (
              loadingTableRows({
                mode: "loading",
                rowCount: itemsPerPage,
                columnCount: 7,
              })
            ) : currentHistory.length === 0 ? (
              <tr className="text-sm">
                <td className="px-4 py-4 text-center text-grey" colSpan={7}>
                  Tiada rekod transaksi dijumpai.
                </td>
              </tr>
            ) : (
              currentHistory.map((row) => (
                <tr
                  key={`${row.id}-${row.tarikh}`}
                  className="text-sm border-b border-b-light-grey/20 transition-colors hover:bg-background/60"
                >
                  <td className="px-4 py-3 text-left font-medium whitespace-nowrap">{row.tarikh}</td>
                  <td className="px-4 py-3 text-left whitespace-nowrap">{row.id}</td>
                  <td className="px-4 py-3 text-left whitespace-nowrap">{row.kategori}</td>
                  <td className="px-4 py-3 text-left whitespace-nowrap">{row.catatan}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-red">
                    {row.debit > 0 ? formatCurrency(row.debit) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-green">
                    {row.kredit > 0 ? formatCurrency(row.kredit) : "-"}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${getBakiColorClass(row.baki)}`}>
                    {formatCurrency(row.baki)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="border-t border-light-grey/20 bg-white px-4 py-4">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalRecords={filteredHistory.length}
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
