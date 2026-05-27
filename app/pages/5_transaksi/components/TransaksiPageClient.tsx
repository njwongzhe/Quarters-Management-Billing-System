/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import TransaksiSummaryCards from "./TransaksiSummaryCards";
import TransaksiFilterPanel, { FilterState } from "./TransaksiFilterPanel";
import TransaksiTable from "./TransaksiTable";
import TransaksiReverseModal from "./TransaksiReverseModal";
import TransaksiAdjustModal from "./TransaksiAdjustModal";
import Icon from "../../../components/Icon"; 
import TransaksiViewModal from "./TransaksiView/TransaksiViewModal";
import { downloadXlsxFile } from "@/lib/download/xlsx-export";

interface SummaryData {
  totalCount: number;
  totalDebit: number;
  totalCredit: number;
}

export default function TransaksiPageClient() {
  const defaultFilters: FilterState = {
    search: "",
    startDate: "",
    endDate: "",
    categories: [],
    statuses: ["NORMAL", "DIBALIKAN", "DILARASKAN", "PEMBALIKAN", "PELARASAN"],
    types: [],
  };

  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<SummaryData>({ totalCount: 0, totalDebit: 0, totalCredit: 0 });
  const [selectedReverseTx, setSelectedReverseTx] = useState<any>(null);
  const [selectedAdjustTx, setSelectedAdjustTx] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<FilterState>(defaultFilters);
  const [selectedViewTx, setSelectedViewTx] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (activeFilters.search) queryParams.append("search", activeFilters.search);
      if (activeFilters.startDate) queryParams.append("startDate", activeFilters.startDate);
      if (activeFilters.endDate) queryParams.append("endDate", activeFilters.endDate);
      if (activeFilters.statuses.length > 0) {
        queryParams.append("statuses", activeFilters.statuses.join(","));
      }
      if (activeFilters.categories && activeFilters.categories.length > 0) {
        queryParams.append("categories", activeFilters.categories.join(","));
      }
      if (activeFilters.types && activeFilters.types.length === 1) {
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

      const displayTxs = sorted.filter((tx: any) => {
        const isRelatedChild = ["PELARASAN", "PEMBALIKAN"].includes(tx.status) && tx.relatedTransactionId;
        if (!isRelatedChild) return true;

        const relatedChildren = getRelatedChildren(tx);
        if (relatedChildren.length > 0) {
          return relatedChildren[0].id === tx.id;
        }

        return !!tx.relatedTransactionId && newestRelatedChildByParentId.get(tx.relatedTransactionId) === tx.id;
      });

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
              displayRelatedId = fixes[0].transactionNo || fixes[0].id.split('-')[0] + '...';
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

  // ==========================================
  // PAGINATION STATES
  // ==========================================
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // We now pass "page" to the API!
  const fetchTransactions = useCallback(async (filtersToApply: FilterState, page: number = 1) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (filtersToApply.search) queryParams.append("search", filtersToApply.search);
      if (filtersToApply.startDate) queryParams.append("startDate", filtersToApply.startDate);
      if (filtersToApply.endDate) queryParams.append("endDate", filtersToApply.endDate);
      if (filtersToApply.statuses.length > 0) {
        queryParams.append("statuses", filtersToApply.statuses.join(","));
      }
      if (filtersToApply.categories && filtersToApply.categories.length > 0) {
        queryParams.append("categories", filtersToApply.categories.join(","));
      }
      if (filtersToApply.types && filtersToApply.types.length === 1) {
        queryParams.append("type", filtersToApply.types[0]);
      }
      
      // Tell the backend which page we want
      queryParams.append("page", page.toString());
      queryParams.append("limit", itemsPerPage.toString());
      
      const response = await fetch(`/api/transactions?${queryParams.toString()}`);
      const result = await response.json();

      if (result.ok) {
        setTransactions(result.data);
        setSummary(result.meta.summary);
      } else {
        alert(result.message); 
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch whenever the page number OR the active filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions(activeFilters, currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]); // We only watch currentPage here to trigger pagination fetches

  // Custom handler to reset to Page 1 when a NEW search is made
  const handleSearch = (filters: FilterState) => {
    setActiveFilters(filters);
    setCurrentPage(1);
    fetchTransactions(filters, 1);
  };

  // ==========================================
  // PAGINATION LOGIC (SERVER-SIDE)
  // ==========================================
  // Use the REAL total from the database summary, not the 10 items in the array!
  const totalItems = summary.totalCount || 0; 
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + transactions.length; // Actual items received
  
  // The backend already sliced it, so pass it directly
  const currentTransactions = transactions;

  // Helper to generate page numbers with "..."
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const handleViewDetails = (tx: any) => {
    setSelectedViewTx(tx);
  };

  return (
    <div className="w-full">
      <TransaksiSummaryCards 
        totalCount={summary.totalCount}
        totalDebit={summary.totalDebit}
        totalCredit={summary.totalCredit}
        isLoading={isLoading}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <TransaksiFilterPanel 
          onSearch={handleSearch}
          isLoading={isLoading}
          onExport={handleExport}
          isExporting={isExporting}
        />

        {/* Pass ONLY currentTransactions instead of all transactions */}
        <TransaksiTable 
          transactions={currentTransactions}
          isLoading={isLoading}
          onView={handleViewDetails}
          onReverse={(tx) => setSelectedReverseTx(tx)}
          onAdjust={(tx) => setSelectedAdjustTx(tx)}
        />

        {/* ========================================== */}
        {/* NEW PAGINATION FOOTER (From Figma) */}
        {/* ========================================== */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
           
           {/* Left: Page Selector */}
           <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <Icon icon="chevron_left" size={18} />
              </button>

              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`dots-${index}`} className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page as number)}
                    className={`w-7 h-7 flex items-center justify-center rounded font-semibold transition-colors ${
                      currentPage === page 
                        ? 'bg-[#1E293B] text-white' // Dark blue for active page
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <Icon icon="chevron_right" size={18} />
              </button>
           </div>

           {/* Right: Record Indicator */}
           <p className="font-medium">
             Menunjukkan {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalItems)} Daripada {totalItems.toLocaleString()} Rekod
           </p>
        </div>
      </div>
      
      <TransaksiReverseModal 
        isOpen={!!selectedReverseTx} 
        onClose={() => setSelectedReverseTx(null)} 
        transaction={selectedReverseTx}
        onSuccess={() => fetchTransactions(activeFilters)} 
      />

      <TransaksiAdjustModal 
        isOpen={!!selectedAdjustTx} 
        onClose={() => setSelectedAdjustTx(null)} 
        transaction={selectedAdjustTx}
        onSuccess={() => fetchTransactions(activeFilters)} 
      />

      <TransaksiViewModal 
        isOpen={!!selectedViewTx} 
        onClose={() => setSelectedViewTx(null)} 
        transaction={selectedViewTx}
      />

    </div>
  );
}