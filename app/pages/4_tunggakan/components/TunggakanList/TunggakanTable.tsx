"use client";

import { useState, useEffect, useMemo } from "react";
import Icon from "@/app/components/Icon/Icon";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import {
  PaginationControls,
} from "@/app/components/Pagination/Pagination";
import type { TunggakanListItem, TunggakanFilter } from "@/lib/arrears/arrears";

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
  filters: TunggakanFilter;
};

// Text size constants for table display
const mainTextSize = "text-[12px]";
const subTextSize = "text-[11px]";

const getArrearsBorderClass = (jumlahTunggakan: number) => {
  return jumlahTunggakan > 0 ? "border-l-red" : "border-l-green";
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
  filters,
}: TunggakanTableProps) {
  // Pagination Logic State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Reset page when filter options change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedChargeMonthLabel]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length);
  
  const paginatedData = useMemo(() => {
    return filteredData.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filteredData, currentPage]);

  return (
    <div className="overflow-x-auto overflow-y-auto">
      <table className="w-full">
        {/* Table Header */}
        <thead className="bg-background text-xs font-bold text-grey">
          <tr>
            <th className="text-left p-3 w-min whitespace-nowrap">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-dark-blue focus:ring-dark-blue accent-dark-blue"
                onChange={(e) => onSelectAll(e.target.checked)}
                checked={selectedIds.length === data.length && data.length > 0 && !isLoading}
                disabled={isLoading || data.length === 0}
              />
            </th>
            <th className="text-left p-3 w-min whitespace-nowrap">Penghuni</th>
            <th className="text-left p-3 w-min whitespace-nowrap">Kuarters</th>
            <th className="text-right p-3 w-min whitespace-nowrap">
              <span className="block leading-tight">Sewa (RM)</span>
              <span className="block text-[10px] leading-tight normal-case text-light-grey">{selectedChargeMonthLabel}</span>
            </th>
            <th className="text-right p-3 w-min whitespace-nowrap">
              <span className="block leading-tight">Senggara (RM)</span>
              <span className="block text-[10px] leading-tight normal-case text-light-grey">{selectedChargeMonthLabel}</span>
            </th>
            <th className="text-right p-3 w-min whitespace-nowrap">
              <span className="block leading-tight">Penalti (RM)</span>
              <span className="block text-[10px] leading-tight normal-case text-light-grey">{selectedChargeMonthLabel}</span>
            </th>
            <th className="text-right p-3 w-min whitespace-nowrap">
              <span className="block leading-tight">Tambahan (RM)</span>
              <span className="block text-[10px] leading-tight normal-case text-light-grey">{selectedChargeMonthLabel}</span>
            </th>
            <th className="text-right p-3 w-min whitespace-nowrap">
              <span className="block leading-tight">Rebat (RM)</span>
              <span className="block text-[10px] leading-tight normal-case text-light-grey">{selectedChargeMonthLabel}</span>
            </th>
            <th className="text-right p-3 w-min whitespace-nowrap">
              <span className="block leading-tight">Tunggakan (RM)</span>
              <span className="block text-[10px] leading-tight normal-case text-light-grey">Terkini</span>
            </th>
            <th className="w-[0%] text-center p-3 whitespace-nowrap">Tindakan</th>
          </tr>
        </thead>
        
        {/* Table Body */}
        <tbody className="bg-white">
          {isLoading ? (
            loadingTableRows({
              mode: "loading",
              columnCount: 10,
              rowCount: 10,
            })
          ) : data.length === 0 ? (
            loadingTableRows({
              mode: "message",
              columnCount: 10,
              rowCount: 1,
              message: "Tiada rekod tunggakan ditemui.",
            })
          ) : filteredData.length === 0 ? (
            loadingTableRows({
              mode: "message",
              columnCount: 10,
              rowCount: 1,
              message: "Tiada hasil ditemui dengan penapis semasa.",
            })
          ) : (
            paginatedData.map((row) => (
              <tr
                key={row.id}
                className={`text-sm border-l-4 ${getArrearsBorderClass(row.jumlahTunggakan)} border-b border-b-light-grey/20 transition-colors hover:bg-background/60 cursor-auto select-text`}
                onDoubleClick={() => onViewResident(row.id)}
              >
                {/* Bulk Selection Checkbox */}
                <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-dark-blue focus:ring-dark-blue accent-dark-blue"
                    checked={selectedIds.includes(row.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onSelectRow(row.id)}
                  />
                </td>
                
                {/* Penghuni (Resident Info) */}
                <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                  <div className={`font-bold ${mainTextSize} text-dark-grey`}>{row.fullName}</div>
                  <div className={`font-extralight ${subTextSize} text-grey`}>
                    {row.icNumber && row.icNumber.length === 12
                      ? row.icNumber.replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3")
                      : row.icNumber}
                  </div>
                </td>
                
                {/* Kuarters (Quarters Info) */}
                <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                  <div className={`font-bold ${mainTextSize} text-dark-grey`}>{row.quarterClass}</div>
                  <div className={`font-extralight ${subTextSize} text-grey whitespace-nowrap`}> {
                      row.unitCode && row.quarterAddress ? `${row.unitCode}, ${row.quarterAddress}` : 
                      row.unitCode ? `${row.unitCode}` :
                      row.quarterAddress ? `${row.quarterAddress}` : "N/A"
                    }
                  </div>
                </td>
                
                {/* Monthly Rental Charge */}
                <td className={`px-3 py-2 text-right font-medium text-dark-grey ${mainTextSize} w-min whitespace-nowrap`}>
                  {row.sewa.toFixed(2)}
                </td>
                
                {/* Maintenance Charge */}
                <td className={`px-3 py-2 text-right font-medium text-dark-grey ${mainTextSize} w-min whitespace-nowrap`}>
                  {row.senggara.toFixed(2)}
                </td>
                
                {/* Penalty Charge */}
                <td className={`px-3 py-2 text-right font-medium text-dark-grey ${mainTextSize} w-min whitespace-nowrap`}>
                  {row.penalti.toFixed(2)}
                </td>
                
                {/* Additional Charges */}
                <td className={`px-3 py-2 text-right font-medium text-dark-grey ${mainTextSize} w-min whitespace-nowrap`}>
                  {row.tambahan.toFixed(2)}
                </td>
                
                {/* Rebate Amount */}
                <td className={`px-3 py-2 text-right font-medium ${row.rebat > 0 ? "text-green" : "text-dark-grey"} ${mainTextSize} w-min whitespace-nowrap`}>
                  {row.rebat.toFixed(2)}
                </td>
                
                {/* Total Current Arrears */}
                <td className={`px-3 py-2 text-right font-bold ${row.jumlahTunggakan > 0 ? "text-red" : "text-dark-grey"} ${mainTextSize} w-min whitespace-nowrap`}>
                  {row.jumlahTunggakan.toFixed(2)}
                </td>
                
                {/* Actions Column */}
                <td className="px-3 py-2 text-center align-middle w-min whitespace-nowrap">
                  <div className="flex items-center justify-center">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewResident(row.id);
                      }}
                      className="inline-flex items-center justify-center rounded-lg p-2 text-dark-blue transition-colors hover:bg-background"
                      aria-label={`Lihat butiran ${row.fullName}`}
                    >
                      <Icon icon="eye" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
        
        {/* Pagination Controls */}
        <tfoot>
          <tr>
            <td colSpan={10} className="bg-white border-t border-light-grey/20 px-3 py-4">
              <div className="flex flex-col gap-2">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalRecords={filteredData.length}
                  onPageChange={setCurrentPage}
                />
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}