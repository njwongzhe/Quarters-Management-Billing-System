"use client";

import { useState, useEffect, useCallback } from "react";
import {
  buildPaginationItems,
  PaginationControls,
} from "@/app/components/Pagination/Pagination";

import TransaksiPageHeader from "./TransaksiPageHeader";
import TransaksiSummaryCards from "./TransaksiSummaryCards";
import TransaksiFilterPanel, { FilterState } from "./TransaksiFilterPanel";
import TransaksiTable from "./TransaksiTable";
import TransaksiReverseModal from "./TransaksiReverseModal";
import TransaksiAdjustModal from "./TransaksiAdjustModal";
import TransaksiViewModal from "./TransaksiView/TransaksiViewModal";
import { downloadXlsxFile } from "@/lib/download/xlsx-export";

interface SummaryData {
  totalCount: number;
  totalDebit: number;
  totalCredit: number;
}

const ALL_STATUS_FILTERS = ["NORMAL", "DIBALIKAN", "DILARASKAN", "PEMBALIKAN", "PELARASAN"];
const ALL_CATEGORY_FILTERS = [
  "BAYARAN",
  "CAJ_SEWA",
  "CAJ_PENYELENGGARAAN",
  "CAJ_PENALTI",
  "CAJ_TAMBAHAN",
  "REBAT",
  "BAKI_AWAL",
  "LAIN_LAIN",
];
const ALL_TYPE_FILTERS = ["DEBIT", "CREDIT"];

const DEFAULT_FILTERS: FilterState = {
  search: "",
  startDate: "",
  endDate: "",
  categories: ALL_CATEGORY_FILTERS,
  statuses: ALL_STATUS_FILTERS,
  types: ALL_TYPE_FILTERS,
};

const ITEMS_PER_PAGE = 10;

export default function TransaksiPageClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<SummaryData>({ totalCount: 0, totalDebit: 0, totalCredit: 0 });
  const [totalItems, setTotalItems] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedReverseTx, setSelectedReverseTx] = useState<any>(null);
  const [selectedAdjustTx, setSelectedAdjustTx] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedViewTx, setSelectedViewTx] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  function hasEmptyOptionSet(filters: FilterState) {
    return (
      filters.categories.length === 0 ||
      filters.statuses.length === 0 ||
      filters.types.length === 0
    );
  }

  function areFiltersEqual(left: FilterState, right: FilterState) {
    return (
      left.search === right.search &&
      left.startDate === right.startDate &&
      left.endDate === right.endDate &&
      left.categories.join("|") === right.categories.join("|") &&
      left.statuses.join("|") === right.statuses.join("|") &&
      left.types.join("|") === right.types.join("|")
    );
  }

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (hasEmptyOptionSet(activeFilters)) {
        alert("Tiada rekod untuk dimuat turun kerana salah satu tapisan tiada pilihan aktif.");
        return;
      }

      const queryParams = new URLSearchParams();
      
      if (activeFilters.search) queryParams.append("search", activeFilters.search);
      if (activeFilters.startDate) queryParams.append("startDate", activeFilters.startDate);
      if (activeFilters.endDate) queryParams.append("endDate", activeFilters.endDate);
      if (activeFilters.statuses.length > 0 && activeFilters.statuses.length < ALL_STATUS_FILTERS.length) {
        queryParams.append("statuses", activeFilters.statuses.join(","));
      }
      if (activeFilters.categories.length > 0 && activeFilters.categories.length < ALL_CATEGORY_FILTERS.length) {
        queryParams.append("categories", activeFilters.categories.join(","));
      }
      if (activeFilters.types.length === 1) {
        queryParams.append("type", activeFilters.types[0]);
      }
      
      // Fetch all transactions matching filters
      queryParams.append("page", "1");
      queryParams.append("limit", "100000"); 
      
      const response = await fetch(`/api/transactions?${queryParams.toString()}`);
      const result = await response.json();

      if (!result.ok) {
        alert(result.message || "Gagal memuat turun data untuk dieksport.");
        return;
      }

      const allTx = result.data || [];

      // Sort logic identical to TransaksiTable
      const sorted = [...allTx].sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || a.transactionDate).getTime();
        const timeB = new Date(b.createdAt || b.transactionDate).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return (b.transactionNo || b.id).localeCompare(a.transactionNo || a.id);
      });

      const getRelatedChildren = (tx: any) => {
        return (tx.relatedTransaction?.childTransactions || tx.childTransactions || [])
          .filter((child: any) => child.status === "PELARASAN" || child.status === "PEMBALIKAN")
          .sort((a: any, b: any) => {
            const timeA = new Date(a.createdAt || a.transactionDate).getTime();
            const timeB = new Date(b.createdAt || b.transactionDate).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return (b.transactionNo || b.id).localeCompare(a.transactionNo || a.id);
          });
      };

      const newestRelatedChildByParentId = new Map<string, string>();
      sorted.forEach((tx: any) => {
        const isRelatedChild = ["PELARASAN", "PEMBALIKAN"].includes(tx.status) && tx.relatedTransactionId;
        if (!isRelatedChild || !tx.relatedTransactionId) return;

        if (!newestRelatedChildByParentId.has(tx.relatedTransactionId)) {
          newestRelatedChildByParentId.set(tx.relatedTransactionId, tx.id);
        }
      });

      const displayTxs = sorted;

      // Prepare Excel rows
      const headers = [
        { value: "Tarikh", style: "header" as const, align: "left" as const },
        { value: "ID Transaksi", style: "header" as const, align: "left" as const },
        { value: "Kategori", style: "header" as const, align: "left" as const },
        { value: "Status", style: "header" as const, align: "left" as const },
        { value: "ID Berkaitan", style: "header" as const, align: "left" as const },
        { value: "Penghuni", style: "header" as const, align: "left" as const },
        { value: "No. Kad Pengenalan", style: "header" as const, align: "left" as const },
        { value: "No. Resit", style: "header" as const, align: "left" as const },
        { value: "Catatan", style: "header" as const, align: "left" as const },
        { value: "Debit (RM)", style: "header" as const, align: "right" as const },
        { value: "Kredit (RM)", style: "header" as const, align: "right" as const }
      ];

      const rows = [
        headers,
        ...displayTxs.map((tx: any) => {
          const isDilaraskan = tx.status === "DILARASKAN";
          let finalDebit = Number(tx.debitAmount);
          let finalCredit = Number(tx.creditAmount);
          
          if (isDilaraskan && (tx.childTransactions?.length ?? 0) > 0) {
            const pelarasanTxs = (tx.childTransactions ?? []).filter((c: any) => c.status === "PELARASAN");
            const totalDeltaDebit = pelarasanTxs.reduce((sum: number, c: any) => sum + Number(c.debitAmount), 0);
            const totalDeltaCredit = pelarasanTxs.reduce((sum: number, c: any) => sum + Number(c.creditAmount), 0);
            
            if (finalDebit > 0) finalDebit = finalDebit + totalDeltaDebit - totalDeltaCredit;
            if (finalCredit > 0) finalCredit = finalCredit + totalDeltaCredit - totalDeltaDebit;
          }

          let displayRelatedId = 'N/A';
          if (isDilaraskan || tx.status === "DIBALIKAN") {
            const fixes = getRelatedChildren(tx);
            if (fixes.length > 0) {
              const primaryId = fixes[0].transactionNo || fixes[0].id.split('-')[0] + '...';
              displayRelatedId = `${primaryId} (${fixes.length} Id Lagi Berkaitan)`;
            }
          } else if (tx.relatedTransaction) {
            displayRelatedId = tx.relatedTransaction.transactionNo || tx.relatedTransaction.id.split('-')[0] + '...';
          }

          return [
            new Date(tx.transactionDate).toLocaleDateString("en-GB"),
            tx.transactionNo || tx.id.split('-')[0] + '...',
            tx.category.replace(/_/g, ' '),
            tx.status,
            displayRelatedId,
            tx.resident?.fullName || 'Tiada',
            tx.resident?.icNumber || 'Tiada',
            tx.receiptNo || 'N/A',
            tx.description || '',
            finalDebit > 0 ? { value: finalDebit, type: "number" as const, align: "right" as const } : 0.00,
            finalCredit > 0 ? { value: finalCredit, type: "number" as const, align: "right" as const } : 0.00
          ];
        })
      ];

      // Download the Excel file
      downloadXlsxFile({
        filename: `Senarai_Transaksi_${new Date().toISOString().slice(0, 10)}`,
        sheets: [
          {
            name: "Transaksi",
            columns: [
              { width: 12 }, // Tarikh
              { width: 20 }, // ID Transaksi
              { width: 22 }, // Kategori
              { width: 15 }, // Status
              { width: 20 }, // ID Berkaitan
              { width: 25 }, // Penghuni
              { width: 20 }, // No. Kad Pengenalan
              { width: 20 }, // No. Resit
              { width: 30 }, // Catatan
              { width: 15 }, // Debit
              { width: 15 }  // Kredit
            ],
            rows
          }
        ]
      });

    } catch (error) {
      console.error("Export failed:", error);
      alert("Ralat berlaku semasa mengeksport data.");
    } finally {
      setIsExporting(false);
    }
  };

  // We now pass "page" to the API.
  const fetchTransactions = useCallback(async (filtersToApply: FilterState, page: number = 1) => {
    if (hasEmptyOptionSet(filtersToApply)) {
      setTransactions([]);
      setSummary({ totalCount: 0, totalDebit: 0, totalCredit: 0 });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (filtersToApply.search) queryParams.append("search", filtersToApply.search);
      if (filtersToApply.startDate) queryParams.append("startDate", filtersToApply.startDate);
      if (filtersToApply.endDate) queryParams.append("endDate", filtersToApply.endDate);
      if (filtersToApply.statuses.length > 0 && filtersToApply.statuses.length < ALL_STATUS_FILTERS.length) {
        queryParams.append("statuses", filtersToApply.statuses.join(","));
      }
      if (filtersToApply.categories.length > 0 && filtersToApply.categories.length < ALL_CATEGORY_FILTERS.length) {
        queryParams.append("categories", filtersToApply.categories.join(","));
      }
      if (filtersToApply.types.length === 1) {
        queryParams.append("type", filtersToApply.types[0]);
      }
      
      // Tell the backend which page we want
      queryParams.append("page", page.toString());
      queryParams.append("limit", ITEMS_PER_PAGE.toString());
      
      const response = await fetch(`/api/transactions?${queryParams.toString()}`);
      const result = await response.json();

      if (result.ok) {
        setTransactions(result.data);
        setSummary(result.meta.summary);
        setTotalItems(result.meta.total);
      } else {
        alert(result.message); 
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [transactions]);

  // Fetch whenever page number or active filters change.
  useEffect(() => {
    fetchTransactions(activeFilters, currentPage);
  }, [activeFilters, currentPage, fetchTransactions]);

  const handleFiltersChange = (nextFilters: FilterState) => {
    if (areFiltersEqual(nextFilters, activeFilters)) {
      return;
    }

    setActiveFilters(nextFilters);
    setCurrentPage(1);
  };

  const handleSuccess = useCallback(() => {
    setCurrentPage(1);
    fetchTransactions(activeFilters, 1);
  }, [activeFilters, fetchTransactions]);

  // Pagination logic (server-side).
  const totalItems = summary.totalCount || 0; 
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + transactions.length;
  const paginationItems = buildPaginationItems(safeCurrentPage, totalPages);
  
  // The backend already paginates data.
  const currentTransactions = transactions;

  const handleViewDetails = (tx: any) => {
    setSelectedViewTx(tx);
  };

  function handleReloadTransactions() {
    fetchTransactions(activeFilters, safeCurrentPage);
  }

  return (
    <main className="relative flex flex-col gap-4 pb-4 text-[#0B1C30]">
      <TransaksiPageHeader />
      <TransaksiSummaryCards 
        totalCount={summary.totalCount}
        totalDebit={summary.totalDebit}
        totalCredit={summary.totalCredit}
        isLoading={isLoading}
      />

      <TransaksiFilterPanel
        filters={activeFilters}
        isLoading={isLoading}
        isExporting={isExporting}
        onFiltersChange={handleFiltersChange}
        onExport={handleExport}
      >
        <TransaksiTable 
          transactions={currentTransactions}
          isLoading={isLoading}
          isFetching={isFetching}
          onView={handleViewDetails}
          onReverse={(tx: any) => setSelectedReverseTx(tx)}
          onAdjust={(tx: any) => setSelectedAdjustTx(tx)}
        />

        <div className="border-t border-light-grey/20 bg-white px-4 py-4 sm:px-5">
          <PaginationControls
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={Math.min(endIndex, totalItems)}
            totalRecords={totalItems}
            paginationItems={paginationItems}
            onPageChange={(action, pageNum) => {
              const nextPage =
                action === "prev"
                  ? Math.max(1, safeCurrentPage - 1)
                  : action === "next"
                    ? Math.min(totalPages, safeCurrentPage + 1)
                    : pageNum;

              if (!nextPage || nextPage === safeCurrentPage) {
                return;
              }

              setCurrentPage(nextPage);
            }}
          />
        </div>
      </TransaksiFilterPanel>

      <TransaksiReverseModal 
        isOpen={!!selectedReverseTx} 
        onClose={() => setSelectedReverseTx(null)} 
        transaction={selectedReverseTx}
        onSuccess={handleReloadTransactions}
      />

      <TransaksiAdjustModal 
        isOpen={!!selectedAdjustTx} 
        onClose={() => setSelectedAdjustTx(null)} 
        transaction={selectedAdjustTx}
        onSuccess={handleReloadTransactions}
      />

      <TransaksiViewModal 
        isOpen={!!selectedViewTx} 
        onClose={() => setSelectedViewTx(null)} 
        transaction={selectedViewTx}
      />

    </main>
  );
}
