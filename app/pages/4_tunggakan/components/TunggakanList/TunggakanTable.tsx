"use client";

import { useState, useEffect, useMemo } from "react";
import Icon from "@/app/components/Icon/Icon";
import type { TunggakanListItem } from "@/lib/arrears/arrears";

type TunggakanTableProps = {
  isLoading: boolean;
  data: TunggakanListItem[];
  filteredData: TunggakanListItem[];
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string) => void;
  onViewResident: (id: string) => void;
  selectedChargeMonthLabel: string;
  activeFilterCount: number;
};

export default function TunggakanTable({
  isLoading,
  data,
  filteredData,
  selectedIds,
  onSelectAll,
  onSelectRow,
  onViewResident,
  selectedChargeMonthLabel,
  activeFilterCount,
}: TunggakanTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const ITEMS_PER_PAGE = 5;

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredData]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    return filteredData.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filteredData, currentPage]);

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const parsed = parseInt(pageInput);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
        setCurrentPage(parsed);
      }
      setPageInput("");
    }
  };

  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (currentPage >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-sky-50 text-grey text-xs uppercase font-semibold">
          <tr>
            <th className="px-6 py-4 w-12">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-dark-blue focus:ring-dark-blue"
                onChange={(e) => onSelectAll(e.target.checked)}
                checked={selectedIds.length === data.length && data.length > 0 && !isLoading}
                disabled={isLoading || data.length === 0}
              />
            </th>
            <th className="px-6 py-4">PENGHUNI</th>
            <th className="px-6 py-4">KUARTERS</th>
            <th className="px-4 py-4 text-right min-w-24">
              <span className="block leading-tight">SEWA</span>
              <span className="block text-[10px] leading-tight normal-case text-light-grey">{selectedChargeMonthLabel}</span>
            </th>
            <th className="px-4 py-4 text-right min-w-28">
              <span className="block leading-tight">SENGGARA</span>
              <span className="block text-[10px] leading-tight normal-case text-light-grey">{selectedChargeMonthLabel}</span>
            </th>
            <th className="px-4 py-4 text-right min-w-24">
              <span className="block leading-tight">PENALTI</span>
              <span className="block text-[10px] leading-tight normal-case text-light-grey">{selectedChargeMonthLabel}</span>
            </th>
            <th className="px-4 py-4 text-right min-w-28">
              <span className="block leading-tight">TAMBAHAN</span>
              <span className="block text-[10px] leading-tight normal-case text-light-grey">{selectedChargeMonthLabel}</span>
            </th>
            <th className="px-4 py-4 text-right min-w-24">
              <span className="block leading-tight">REBAT</span>
              <span className="block text-[10px] leading-tight normal-case text-light-grey">{selectedChargeMonthLabel}</span>
            </th>
            <th className="px-6 py-4 text-right">TUNGGAKAN TERKINI (RM)</th>
            <th className="px-6 py-4 text-center">TINDAKAN</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <tr>
              <td colSpan={10} className="px-6 py-12 text-center text-grey">
                <div className="flex flex-col items-center gap-3">
                  <Icon
                    icon="progress_activity"
                    size={40}
                    className="animate-spin text-dark-blue"
                  />
                  <p className="text-sm font-bold text-dark-blue uppercase tracking-widest animate-pulse">
                    Sedang Memuatkan...
                  </p>
                  <p className="text-xs text-light-grey">Menarik senarai tunggakan dari pelayan</p>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-6 py-12 text-center text-grey">
                Tiada rekod tunggakan ditemui.
              </td>
            </tr>
          ) : (
            paginatedData.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-dark-blue focus:ring-dark-blue"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => onSelectRow(row.id)}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-dark-grey">{row.fullName}</div>
                  <div className="text-xs text-light-grey mt-1">{row.icNumber}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-dark-grey">{row.quarterClass}</div>
                  <div className="text-xs text-light-grey mt-1 max-w-60 leading-snug whitespace-normal">
                    {row.quarterAddress ? `${row.unitCode}, ${row.quarterAddress}` : row.unitCode}
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-medium text-dark-grey">
                  {row.sewa.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right font-medium text-dark-grey">
                  {row.senggara.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right font-medium text-dark-grey">
                  {row.penalti.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right font-medium text-dark-grey">
                  {row.tambahan.toFixed(2)}
                </td>
                <td className={`px-6 py-4 text-right font-bold ${row.rebat > 0 ? "text-green" : "text-dark-grey"}`}>
                  {row.rebat.toFixed(2)}
                </td>
                <td className={`px-6 py-4 text-right font-bold ${row.jumlahTunggakan > 0 ? "text-red" : "text-dark-grey"}`}>
                  {row.jumlahTunggakan.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => onViewResident(row.id)}
                    className="text-dark-blue hover:bg-blue-50 p-2 rounded-full transition-colors"
                  >
                    <Icon icon="eye" size={20} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination Bar */}
      {!isLoading && data.length > 0 && (
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-grey">
          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              &lt;
            </button>

            {/* Page Numbers */}
            {getPageNumbers().map((page, idx) =>
              page === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-grey">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page as number)}
                  className={`px-3 py-1 border rounded transition-colors cursor-pointer ${
                    currentPage === page
                      ? "bg-dark-blue text-white border-dark-blue"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              &gt;
            </button>

            {/* Jump to page input — only shown if more than 1 page */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-gray-200">
                <span className="text-xs text-grey">Ke halaman:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={handlePageInputSubmit}
                  placeholder={String(currentPage)}
                  className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-dark-blue"
                />
              </div>
            )}
          </div>

          <div>
            Menunjukkan{" "}
            <span className="font-bold">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}
            </span>{" "}
            Daripada <span className="font-bold">{filteredData.length}</span> Rekod
            {activeFilterCount > 0 && (
              <span className="ml-2 text-xs text-grey">(ditapis daripada {data.length} jumlah rekod)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
