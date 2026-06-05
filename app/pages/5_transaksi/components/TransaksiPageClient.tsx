"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  buildPaginationItems,
  PaginationControls,
} from "@/app/components/Pagination/Pagination";

import TransaksiPageHeader from "./TransaksiPageHeader";
import TransaksiSummaryCards from "./TransaksiSummaryCards";
import TransaksiFilterPanel, { FilterState } from "./TransaksiFilterPanel";
import TransaksiTable from "./TransaksiTable";
import TransaksiReverseModal from "./TransaksiEdit/TransaksiReverseModal";
import TransaksiAdjustModal from "./TransaksiEdit/TransaksiAdjustModal";
import TransaksiViewModal from "./TransaksiView/TransaksiViewModal";
import { downloadXlsxFile } from "@/lib/download/xlsx-export";

interface SummaryData {
  totalCount: number;
  totalDebit: number;
  totalCredit: number;
}

// Global master filter static enums for comparison and dynamic querying
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
  // -------------------------------------------------------------------------
  // STATE MANAGEMENT
  // -------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [summary, setSummary] = useState<SummaryData>({ totalCount: 0, totalDebit: 0, totalCredit: 0 });
  const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Modal Context State Anchors
  const [selectedReverseTx, setSelectedReverseTx] = useState<any>(null);
  const [selectedAdjustTx, setSelectedAdjustTx] = useState<any>(null);
  const [selectedViewTx, setSelectedViewTx] = useState<any>(null);

  // -------------------------------------------------------------------------
  // CONCURRENCY & PERFORMANCE CONTROLLERS (REFS)
  // -------------------------------------------------------------------------
  /** Tracks whether the dashboard total numbers have been populated to skip heavy db recalculations */
  const hasLoadedSummaryRef = useRef(false);
  const lastSummaryFilterKeyRef = useRef<string>("");
  /** Tracks if there is an active row set to toggle background fetching indicators vs full page spinners */
  const hasLoadedRowsRef = useRef(false);
  /** Monotonically increasing ID to reject stale API requests when users click rapid filters */
  const fetchRequestIdRef = useRef(0);
  /** AbortController reference to physically kill pending browser HTTP requests in-flight */
  const fetchAbortRef = useRef<AbortController | null>(null);

  // -------------------------------------------------------------------------
  // VALIDATION & UTILS
  // -------------------------------------------------------------------------
  /** Guard function checking if any parameter checklist has been completely unselected */
  function hasEmptyOptionSet(filters: FilterState) {
    return (
      filters.categories.length === 0 ||
      filters.statuses.length === 0 ||
      filters.types.length === 0
    );
  }

  /** Performs structural equality check to minimize redundant data fetching over identical conditions */
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

  // Builds a unique string key representing the current filter set for summary caching purposes */
  function buildFilterKey(filters: FilterState) {
    return [
      filters.search,
      filters.startDate,
      filters.endDate,
      filters.categories.join("|"),
      filters.statuses.join("|"),
      filters.types.join("|"),
    ].join("::");
  }

  // -------------------------------------------------------------------------
  // EXPORT ENGINE (CLIENT-SIDE DATA TRANSFORMATION)
  // -------------------------------------------------------------------------
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
      
      // Override limits to fetch complete dataset safely for the spreadsheet export
      queryParams.append("page", "1");
      queryParams.append("limit", "100000"); 
      
      const response = await fetch(`/api/transactions?${queryParams.toString()}`);
      const result = await response.json();

      if (!result.ok) {
        alert(result.message || "Gagal memuat turun data untuk dieksport.");
        return;
      }

      const allTx = result.data || [];

      // Sort client dataset mirroring server configuration criteria
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

      // Construct and execute presentation-ready spreadsheet output
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
        ...sorted.map((tx: any) => {
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

      downloadXlsxFile({
        filename: `Senarai_Transaksi_${new Date().toISOString().slice(0, 10)}`,
        sheets: [
          {
            name: "Transaksi",
            columns: [
              { width: 12 }, { width: 20 }, { width: 22 }, { width: 15 },
              { width: 20 }, { width: 25 }, { width: 20 }, { width: 20 },
              { width: 30 }, { width: 15 }, { width: 15 }
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

  // -------------------------------------------------------------------------
  // CORE NETWORK FLOW (FETCH TRANSACTION REVENUE GENERATOR)
  // -------------------------------------------------------------------------
  const fetchTransactions = useCallback(async (filtersToApply: FilterState, page: number = 1) => {
    // 1. Increment current request ticket and pull native cancellation references
    fetchRequestIdRef.current += 1;
    const currentRequestId = fetchRequestIdRef.current;

    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort(); // Physically drop active browser networking in-flight
    }

    const abortController = new AbortController();
    fetchAbortRef.current = abortController;

    // Fast-exit if nothing is queried to save engine runtimes
    if (hasEmptyOptionSet(filtersToApply)) {
      setTransactions([]);
      setSummary({ totalCount: 0, totalDebit: 0, totalCredit: 0 });
      setTotalItems(0);
      hasLoadedRowsRef.current = false;
      if (fetchAbortRef.current === abortController) fetchAbortRef.current = null;
      setIsLoading(false);
      setIsFetching(false);
      return;
    }

    // Determine loading UI presentation patterns based on current visibility status
    const shouldKeepCurrentRows = hasLoadedRowsRef.current;
    if (shouldKeepCurrentRows) {
      setIsFetching(true);
    } else {
      setIsLoading(true);
    }

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
      
      queryParams.append("page", page.toString());
      queryParams.append("limit", ITEMS_PER_PAGE.toString());

      const currentFilterKey = buildFilterKey(filtersToApply);
      const shouldIncludeSummary =
        !hasLoadedSummaryRef.current ||
        lastSummaryFilterKeyRef.current !== currentFilterKey;

      // Only recompute summary when filter set changes; skip for pure pagination changes
      queryParams.append("includeSummary", shouldIncludeSummary ? "true" : "false");
      
      const response = await fetch(`/api/transactions?${queryParams.toString()}`, {
        signal: abortController.signal,
      });
      const result = await response.json();

      // Drop update callbacks entirely if a newer request signature has been emitted asynchronously
      if (currentRequestId !== fetchRequestIdRef.current) return;

      if (result.ok) {
        setTransactions(result.data);
        hasLoadedRowsRef.current = result.data.length > 0;
        
        // Populate and lock down summary totals state exclusively when calculated by backend
        if (result.meta.summary) {
          setSummary(result.meta.summary);
          hasLoadedSummaryRef.current = true;
          lastSummaryFilterKeyRef.current = currentFilterKey;
        }
        setTotalItems(result.meta.total);
      } else {
        alert(result.message); 
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return; // Ignore expected browser request termination drops safely
      console.error("Failed to fetch transactions:", error);
    } finally {
      // Safely close connection indicators only if context hasn't updated or detached natively
      if (currentRequestId === fetchRequestIdRef.current) {
        setIsLoading(false);
        setIsFetching(false);
      }
      if (fetchAbortRef.current === abortController) {
        fetchAbortRef.current = null;
      }
    }
  }, []);

  // Sync execution anchor on state dependencies transformations
  useEffect(() => {
    fetchTransactions(activeFilters, currentPage);
  }, [activeFilters, currentPage, fetchTransactions]);

  // -------------------------------------------------------------------------
  // INTERACTION HANDLERS
  // -------------------------------------------------------------------------
  const handleFiltersChange = (nextFilters: FilterState) => {
    if (areFiltersEqual(nextFilters, activeFilters)) return;
    setActiveFilters(nextFilters);
    setCurrentPage(1); // Force return to page 1 on every dynamic search/filter alteration
  };

  const handleReloadTransactions = () => {
    fetchTransactions(activeFilters, currentPage);
  };

  // Derive structural boundaries for view layout presentation properties safely
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + transactions.length;
  const paginationItems = buildPaginationItems(currentPage, totalPages);

  const handleViewDetails = (tx: any) => {
    setSelectedViewTx(tx);
  };

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
          transactions={transactions}
          isLoading={isLoading}
          isFetching={isFetching}
          onView={handleViewDetails}
          onReverse={(tx: any) => setSelectedReverseTx(tx)}
          onAdjust={(tx: any) => setSelectedAdjustTx(tx)}
        />

        <div className="border-t border-light-grey/20 bg-white px-4 py-4 sm:px-5">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={Math.min(endIndex, totalItems)}
            totalRecords={totalItems}
            paginationItems={paginationItems}
            onPageChange={(action, pageNum) => {
              const nextPage =
                action === "prev"
                  ? Math.max(1, currentPage - 1)
                  : action === "next"
                    ? Math.min(totalPages, currentPage + 1)
                    : pageNum;

              if (!nextPage || nextPage === currentPage) return;
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