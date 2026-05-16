"use client";

import { useState, useEffect, useCallback } from "react";
import TransaksiSummaryCards from "./TransaksiSummaryCards";
import TransaksiFilterPanel, { FilterState } from "./TransaksiFilterPanel";
import TransaksiTable from "./TransaksiTable";
import TransaksiReverseModal from "./TransaksiReverseModal";
import TransaksiAdjustModal from "./TransaksiAdjustModal";
import Icon from "../../../components/Icon"; 
import TransaksiViewModal from "./TransaksiViewModal";

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
  };

  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<SummaryData>({ totalCount: 0, totalDebit: 0, totalCredit: 0 });
  const [selectedReverseTx, setSelectedReverseTx] = useState<any>(null);
  const [selectedAdjustTx, setSelectedAdjustTx] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<FilterState>(defaultFilters);
  const [selectedViewTx, setSelectedViewTx] = useState<any>(null);

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