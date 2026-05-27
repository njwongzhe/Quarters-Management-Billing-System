"use client";

import { useState, useEffect, useMemo } from "react";
import TunggakanFilterPanel from "./TunggakanFilterPanel";
import { defaultFilter, type TunggakanFilter } from "@/lib/arrears/arrears";
import Icon from "@/app/components/Icon/Icon";
import ToolbarButton from "@/app/components/ToolbarIconButton";
import type { TunggakanListItem, TunggakanSummary } from "@/lib/arrears/arrears";
import KemasKiniModal from "./KemasKiniModal";
import ButiranTunggakanModal from "./ButiranTunggakan/ButiranTunggakanModal";

// New Split Components
import TunggakanSummaryCards from "./TunggakanList/TunggakanSummaryCards";
import TunggakanDownload from "./TunggakanList/TunggakanDownload";
import TunggakanTable from "./TunggakanList/TunggakanTable";

const getCurrentMonthInputValue = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonthLabel = (monthValue: string) => {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return "Bulan";

  return new Intl.DateTimeFormat("ms-MY", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

export default function TunggakanPageClient() {
  // --- STATE MANAGEMENT ---
  const [data, setData] = useState<TunggakanListItem[]>([]);
  const [summary, setSummary] = useState<TunggakanSummary>({ jumlahRekod: 0, jumlahTunggakan: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Billing Automation States
  const [isBilledThisMonth, setIsBilledThisMonth] = useState(false);
  const [lastBilledDate, setLastBilledDate] = useState<string | null>(null);
  const [targetBillingMonthLabel, setTargetBillingMonthLabel] = useState<string | null>(null);
  const [isBillingRunning, setIsBillingRunning] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isKemasKiniModalOpen, setIsKemasKiniModalOpen] = useState(false);
  const [viewResidentId, setViewResidentId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TunggakanFilter>(defaultFilter);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);  
  const [selectedChargeMonth, setSelectedChargeMonth] = useState(getCurrentMonthInputValue);
  const selectedChargeMonthLabel = useMemo(() => formatMonthLabel(selectedChargeMonth), [selectedChargeMonth]);

  const fetchBillingStatus = async () => {
    try {
      const response = await fetch(`/api/billing/status?t=${Date.now()}`, {
        cache: "no-store"
      });
      const result = await response.json();
      if (result.ok) {
        setIsBilledThisMonth(result.isBilledThisMonth);
        setLastBilledDate(result.lastBilledDate);
        setTargetBillingMonthLabel(result.targetBillingMonthLabel ?? null);
      }
    } catch (error) {
      console.error("Failed to fetch billing status:", error);
    }
  };

  // --- DATA FETCHING ---
  const fetchTunggakanData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        t: String(Date.now()),
        chargeMonth: selectedChargeMonth,
      });
      const response = await fetch(`/api/arrear?${params.toString()}`, {
        cache: "no-store"
      });
      const result = await response.json();

      if (result.ok) {
        setData(result.data);
        setSummary(result.summary);
      } else {
        console.error("API Error:", result.message);
      }
    } catch (error) {
      console.error("Failed to fetch tunggakan data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on page load
  useEffect(() => {
    fetchTunggakanData();
    fetchBillingStatus();
  }, [selectedChargeMonth]);

  // --- HANDLERS ---
  const formatRM = (value: number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(value).replace("MYR", "RM");
  };

  const filteredData = useMemo(() => {
    let result = data;

    if (filters.kelasKuarters.length > 0)
      result = result.filter((r) => filters.kelasKuarters.includes(r.quarterClass));

    if (filters.blok.length > 0)
      result = result.filter((r) =>
        filters.blok.includes(r.unitCode?.split("-")[0]?.trim() ?? "")
      );

    if (filters.julatMin !== "")
      result = result.filter((r) => r.jumlahTunggakan >= parseFloat(filters.julatMin));

    if (filters.julatMax !== "")
      result = result.filter((r) => r.jumlahTunggakan <= parseFloat(filters.julatMax));

    if (filters.statusBayaran !== "SEMUA")
      result = result.filter((r) => (r as any).statusBayaran === filters.statusBayaran);

    if (filters.mempunyaiPenalti)
      result = result.filter((r) => r.penalti > 0);

    if (filters.mempunyaiRebat)
      result = result.filter((r) => r.rebat > 0);

    return result;
  }, [data, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.kelasKuarters.length > 0) count++;
    if (filters.blok.length > 0) count++;
    if (filters.julatMin !== "") count++;
    if (filters.julatMax !== "") count++;
    if (filters.statusBayaran !== "SEMUA") count++;
    if (filters.mempunyaiPenalti) count++;
    if (filters.mempunyaiRebat) count++;
    return count;
  }, [filters]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(data.map((row) => row.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleManualRun = async () => {
    const billingLabel = targetBillingMonthLabel ? ` untuk bulan ${targetBillingMonthLabel}` : "";
    if (!confirm(`Adakah anda pasti mahu menjana caj bulanan dan penalti${billingLabel} sekarang?`)) return;
    
    setIsBillingRunning(true);
    try {
      const response = await fetch("/api/cron/billing");
      const result = await response.json();
      
      alert(result.message);
      
      if (result.ok) {
        fetchBillingStatus();
        fetchTunggakanData();
      }
    } catch (error) {
      alert("Ralat sistem berlaku semasa menjana bil.");
    } finally {
      setIsBillingRunning(false);
    }
  };

  const today = new Date();
  const isFirstDayOfMonth = today.getDate() === 1;
  const isManualButtonDisabled = isFirstDayOfMonth || isBilledThisMonth || isBillingRunning;

  return (
    <div className="flex flex-col gap-8 pb-20 relative">
      {/* --- HEADER SECTION --- */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Tunggakan
        </h1>
        <p className="text-grey">
          Halaman ini memaparkan ringkasan dan perincian tunggakan sewa serta caj tambahan bagi setiap penghuni kuarters.
        </p>
      </div>

      {/* --- SUMMARY CARDS --- */}
      <TunggakanSummaryCards 
        isLoading={isLoading} 
        summary={summary} 
        formatRM={formatRM} 
      />

      {/* --- DATA TABLE SECTION --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-6 flex justify-between items-start bg-light-blue">
          <div className="bg-light-blue">
            <h3 className="text-lg font-bold">Senarai Tunggakan</h3>
            <p className="text-sm text-grey mt-1">Klik pada ikon kemaskini untuk mengubah maklumat unit.</p>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-4">
              {/* Manual Run Button */}
              <button 
                onClick={handleManualRun}
                disabled={isManualButtonDisabled}
                className={`px-4 py-2 text-sm font-bold rounded shadow-sm transition-colors flex items-center gap-2 cursor-pointer
                  ${isManualButtonDisabled 
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' 
                    : 'bg-white border border-dark-blue text-dark-blue hover:bg-blue-50'
                  }`}
              >
                <Icon icon={isBillingRunning ? "progress_activity" : "autorenew"} size={18} className={isBillingRunning ? "animate-spin" : ""} />
                {isBilledThisMonth ? `Caj ${targetBillingMonthLabel ?? "Bulan Sasaran"} Selesai` : isBillingRunning ? "Sedang Menjana..." : "Jana Bil Manual"}
              </button>

              <label className="h-10 px-3 bg-white border border-gray-200 text-dark-blue rounded shadow-sm flex items-center gap-2 text-sm font-bold">
                <Icon icon="calendar_month" size={18} />
                <span className="sr-only">Pilih bulan caj</span>
                <input
                  type="month"
                  value={selectedChargeMonth}
                  onChange={(event) => setSelectedChargeMonth(event.target.value)}
                  className="bg-transparent text-sm font-bold text-dark-blue outline-none cursor-pointer"
                  aria-label="Pilih bulan caj"
                />
              </label>

              <TunggakanDownload
                isLoading={isLoading}
                data={data}
                filteredData={filteredData}
                activeFilterCount={activeFilterCount}
                selectedChargeMonthLabel={selectedChargeMonthLabel}
              />

              <ToolbarButton
                icon="filter"
                label="Tapis rekod tunggakan"
                onClick={() => setIsFilterPanelOpen(true)}
                isActive={activeFilterCount > 0}
                activeBadge={activeFilterCount}
              />
            </div>

            {/* Automated Billing Status Text */}
            <div className="text-xs text-right">
              <span className="text-grey">Status Caj Automatik{targetBillingMonthLabel ? ` (${targetBillingMonthLabel})` : ""}: </span>
              <span className={`font-bold ${isBilledThisMonth ? "text-green" : "text-yellow-600"}`}>
                {isBilledThisMonth ? "Selesai" : "Belum Dijana"}
              </span>
              
              {lastBilledDate && (
                <span className="text-grey ml-1">
                  (Terakhir dijana pada {new Date(lastBilledDate).toLocaleString("en-GB", { 
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })})
                </span>
              )}

              {/* Safety Lock Warning */}
              {isFirstDayOfMonth && !isBilledThisMonth && (
                <p className="text-red-500 italic mt-1">
                  Sistem automatik sedang berjalan hari ini. Butang manual dikunci sehingga 2 haribulan.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Table list and pagination */}
        <TunggakanTable
          isLoading={isLoading}
          data={data}
          filteredData={filteredData}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          onViewResident={setViewResidentId}
          selectedChargeMonthLabel={selectedChargeMonthLabel}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* --- FLOATING 'KEMAS KINI' BUTTON --- */}
      <div className={`fixed bottom-8 right-8 transition-opacity duration-200 ${selectedIds.length > 0 ? 'opacity-100 z-40' : 'opacity-0 pointer-events-none'}`}>
        <button 
          onClick={() => setIsKemasKiniModalOpen(true)}
          className="flex items-center gap-2 bg-dark-blue text-white px-6 py-3 rounded-lg shadow-lg font-bold hover:bg-opacity-90 transition-all cursor-pointer"
        >
          <Icon icon="edit" size={20} />
          KEMAS KINI {selectedIds.length > 0 && `(${selectedIds.length})`}
        </button>
      </div>

      {/* --- KEMAS KINI MODAL --- */}
      <KemasKiniModal 
        isOpen={isKemasKiniModalOpen} 
        onClose={() => {
          setIsKemasKiniModalOpen(false);
        }} 
        onSaved={async () => {
          await fetchTunggakanData();
          setSelectedIds([]);
        }}
        chargeMonth={selectedChargeMonth}
        selectedCount={selectedIds.length} 
        selectedIds={selectedIds}
      />

      {/* --- FILTER PANEL --- */}
      <TunggakanFilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        data={data}
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(defaultFilter)}
        activeCount={activeFilterCount}
      />

      {/* --- BUTIRAN TUNGGAKAN MODAL --- */}
      <ButiranTunggakanModal 
        isOpen={viewResidentId !== null} 
        onClose={() => setViewResidentId(null)} 
        residentId={viewResidentId} 
      />
    </div>
  );
}
