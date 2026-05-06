"use client";

import { useState, useEffect, useCallback } from "react";
import TransaksiSummaryCards from "./TransaksiSummaryCards";
import TransaksiFilterPanel, { FilterState } from "./TransaksiFilterPanel";
import TransaksiTable from "./TransaksiTable";

interface SummaryData {
  totalCount: number;
  totalDebit: number;
  totalCredit: number;
}

export default function TransaksiPageClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<SummaryData>({ totalCount: 0, totalDebit: 0, totalCredit: 0 });
  
  // Active Filter State
  const [activeFilters, setActiveFilters] = useState<FilterState | null>(null);

  const fetchTransactions = useCallback(async (filtersToApply?: FilterState) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (filtersToApply) {
        if (filtersToApply.search) queryParams.append("search", filtersToApply.search);
        if (filtersToApply.startDate) queryParams.append("startDate", filtersToApply.startDate);
        if (filtersToApply.endDate) queryParams.append("endDate", filtersToApply.endDate);
        if (filtersToApply.statuses.length > 0) queryParams.append("statuses", filtersToApply.statuses.join(","));
        // Categories can be added here similarly if implemented in the dropdown
      }
      
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

  // Initial Load
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Modal Handlers (We will build these next!)
  const handleViewDetails = (tx: any) => {
    console.log("Open View Modal for:", tx.id);
  };

  const handleReverse = (tx: any) => {
    console.log("Open Reverse Modal for:", tx.id);
  };

  const handleAdjust = (tx: any) => {
    console.log("Open Adjust Modal for:", tx.id);
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
        
        {/* The New Filter Panel */}
        <TransaksiFilterPanel 
          onSearch={(filters) => {
            setActiveFilters(filters);
            fetchTransactions(filters);
          }}
          isLoading={isLoading}
        />

        {/* The New Ledger Table */}
        <TransaksiTable 
          transactions={transactions}
          isLoading={isLoading}
          onView={handleViewDetails}
          onReverse={handleReverse}
          onAdjust={handleAdjust}
        />

        {/* Pagination Footer (Basic Implementation) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
           <p>Menunjukkan senarai {transactions.length} rekod transaksi.</p>
           {/* You can add real pagination controls here later if desired */}
        </div>

      </div>
      
      {/* Modals will go here in Step 4 */}
    </div>
  );
}