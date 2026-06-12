"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { areAllFilterOptionsSelected } from "@/app/components/Filter/FilterOption";
import {
  defaultFilter,
  type BulkUpdateTunggakanResult,
  type TunggakanFilter,
} from "@/lib/arrears/arrears";
import Icon from "@/app/components/Icon/Icon";
import type { TunggakanListItem, TunggakanSummary } from "@/lib/arrears/arrears";
import KemasKiniModal from "@/app/pages/4_tunggakan/components/KemasKiniModal";
import ButiranTunggakanModal from "@/app/pages/4_tunggakan/components/ButiranTunggakan/ButiranTunggakanModal";
import SearchBar, { SearchBarToggleButton, searchRecords, useSearchBarLogic } from "@/app/components/SearchBar";

// New Split Components
import TunggakanSummaryCards from "./TunggakanList/TunggakanSummaryCards";
import TunggakanTable from "./TunggakanList/TunggakanTable";
import ArrearsDownload from "./TunggakanList/TableButton/ArrearsDownload";
import ArrearsFilter from "./TunggakanList/TableButton/ArrearsFilter";
import ArrearsFilterMonth from "./TunggakanList/TableButton/ArrearsFilterMonth";

const STATUS_BAYARAN_OPTIONS = [
  { value: "SUDAH_DIKUTIP", label: "Sudah Dikutip" },
  { value: "BELUM_DIKUTIP", label: "Belum Dikutip" },
] as const;

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

type TunggakanPageClientProps = {
  initialChargeMonth?: string;
  initialData?: TunggakanListItem[];
  initialSummary?: TunggakanSummary;
};

export default function TunggakanPageClient({
  initialChargeMonth = getCurrentMonthInputValue(),
  initialData,
  initialSummary,
}: TunggakanPageClientProps) {
  const hasInitialData = initialData !== undefined && initialSummary !== undefined;
  // --- STATE MANAGEMENT ---
  const [data, setData] = useState<TunggakanListItem[]>(initialData ?? []);
  const [summary, setSummary] = useState<TunggakanSummary>(
    initialSummary ?? { jumlahRekod: 0, jumlahKutipan: 0, jumlahTunggakan: 0 },
  );
  const [isLoading, setIsLoading] = useState(!hasInitialData);
  const shouldSkipInitialFetchRef = useRef(hasInitialData);

  // Billing Automation States
  const [isBilledThisMonth, setIsBilledThisMonth] = useState(false);
  const [lastBilledDate, setLastBilledDate] = useState<string | null>(null);
  const [targetBillingMonthLabel, setTargetBillingMonthLabel] = useState<string | null>(null);
  const [isBillingRunning, setIsBillingRunning] = useState(false);
  
  const searchParams = useSearchParams();
  const autoSelect = searchParams.get("autoSelect") === "true";
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isKemasKiniModalOpen, setIsKemasKiniModalOpen] = useState(false);
  const [viewResidentId, setViewResidentId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TunggakanFilter>(defaultFilter);
  const [selectedChargeMonth, setSelectedChargeMonth] = useState(initialChargeMonth);
  const selectedChargeMonthLabel = useMemo(() => formatMonthLabel(selectedChargeMonth), [selectedChargeMonth]);

  const [searchQuery, setSearchQuery] = useState("");

  const {
    isOpen: isSearchOpen,
    searchInputRef,
    handleToggleSearch,
    handleClearSearch,
  } = useSearchBarLogic({ value: searchQuery, onChange: setSearchQuery });

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
      if (data.length === 0) {
        setIsLoading(true);
      }
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
        
        setSummary({
          jumlahRekod: result.data?.length ?? 0, 
          jumlahKutipan: result.summary?.jumlahRekod ?? 0, 
          jumlahTunggakan: result.summary?.jumlahTunggakan ?? 0, 
        });
        
      } else {
        console.error("API Error:", result.message);
      }
    } catch (error) {
      console.error("Failed to fetch tunggakan data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on page load.
  useEffect(() => {
    if (shouldSkipInitialFetchRef.current) {
      shouldSkipInitialFetchRef.current = false;
      void fetchBillingStatus();
      return;
    }

    setData([]);
    void fetchTunggakanData();
    void fetchBillingStatus();
  }, [selectedChargeMonth]);

  useEffect(() => {
    if (!autoSelect || hasAutoSelected || data.length === 0) {
      return;
    }

    setSelectedIds(
      data.filter((item) => item.jumlahTunggakan > 0).map((item) => item.id),
    );
    setHasAutoSelected(true);
  }, [autoSelect, data, hasAutoSelected]);

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

    if (isSearchOpen) {
      result = searchRecords(
        result,
        searchQuery,
        (row) => [
          row.fullName,
          row.icNumber,
          row.quarterClass,
          row.unitCode,
          row.quarterAddress,
        ],
        { icSearch: true },
      );
    }

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

    const isAllStatusSelected = areAllFilterOptionsSelected(
      STATUS_BAYARAN_OPTIONS.map((option) => ({ ...option })),
      filters.statusBayaranSelections as ("SUDAH_DIKUTIP" | "BELUM_DIKUTIP")[]
    );

    if (!isAllStatusSelected)
      result = result.filter((r) => {
        const includeSudahDikutip =
          filters.statusBayaranSelections.includes("SUDAH_DIKUTIP") &&
          r.jumlahTunggakan <= 0;
        const includeBelumDikutip =
          filters.statusBayaranSelections.includes("BELUM_DIKUTIP") &&
          r.jumlahTunggakan > 0;

        return includeSudahDikutip || includeBelumDikutip;
      });

    return result;
  }, [data, filters, searchQuery, isSearchOpen]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (isSearchOpen && searchQuery.trim() !== "") count++;
    if (filters.kelasKuarters.length > 0) count++;
    if (filters.blok.length > 0) count++;
    if (filters.julatMin !== "") count++;
    if (filters.julatMax !== "") count++;

    const isAllStatusSelected = areAllFilterOptionsSelected(
      STATUS_BAYARAN_OPTIONS.map((option) => ({ ...option })),
      filters.statusBayaranSelections as ("SUDAH_DIKUTIP" | "BELUM_DIKUTIP")[]
    );

    if (!isAllStatusSelected) count += filters.statusBayaranSelections.length;

    return count;
  }, [filters, searchQuery, isSearchOpen]);

  const filteredSummary = useMemo<TunggakanSummary>(() => {
    const jumlahRekod = filteredData.length;
    const jumlahTunggakan = filteredData.reduce(
      (sum, row) => sum + row.jumlahTunggakan,
      0,
    );

    return {
      jumlahRekod,
      jumlahKutipan: summary.jumlahKutipan,
      jumlahTunggakan,
    };
  }, [filteredData, summary.jumlahKutipan]);

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

  const handleArrearsSaved = (result: BulkUpdateTunggakanResult) => {
    const updateByResidentId = new Map(
      result.updates.map((update) => [update.residentId, update]),
    );

    setData((previousData) =>
      previousData.map((row) => {
        const update = updateByResidentId.get(row.id);

        return update
          ? {
              ...row,
              senggara: row.senggara + update.senggaraDelta,
              tambahan: row.tambahan + update.tambahanDelta,
              rebat: row.rebat + update.rebatDelta,
              jumlahTunggakan:
                row.jumlahTunggakan + update.jumlahTunggakanDelta,
            }
          : row;
      }),
    );
    setSummary((previousSummary) => ({
      ...previousSummary,
      jumlahKutipan:
        previousSummary.jumlahKutipan + result.summaryDelta.jumlahKutipan,
      jumlahTunggakan:
        previousSummary.jumlahTunggakan + result.summaryDelta.jumlahTunggakan,
    }));
    setSelectedIds([]);
  };

  const handleManualRun = async () => {
    const billingLabel = targetBillingMonthLabel ? ` untuk bulan ${targetBillingMonthLabel}` : "";
    if (!confirm(`Adakah anda pasti mahu menjana caj bulanan dan penalti${billingLabel} sekarang?`)) return;
    
    setIsBillingRunning(true);
    try {
      const response = await fetch("/api/cron/billing", {
        method: "POST",
      });
      const result = await response.json();
      
      alert(result.message);
      
      if (result.ok) {
        fetchBillingStatus();
        fetchTunggakanData();
      }
    } catch {
      alert("Ralat sistem berlaku semasa menjana bil.");
    } finally {
      setIsBillingRunning(false);
    }
  };

  const today = new Date();
  const isFirstDayOfMonth = today.getDate() === 1;
  const isManualButtonDisabled = isLoading || isFirstDayOfMonth || isBilledThisMonth || isBillingRunning;

  return (
    <main className="relative flex flex-col gap-4 text-content">
      {/* --- HEADER SECTION --- */}
      <header>
        <h1 className="text-2xl font-extrabold text-content">
          Tunggakan
        </h1>
        <p className="text-sm font-extralight text-grey/70">
          Halaman ini memaparkan ringkasan dan perincian tunggakan sewa serta caj tambahan bagi setiap penghuni kuarters.
        </p>
      </header>

      {/* --- SUMMARY CARDS --- */}
      <TunggakanSummaryCards 
        isLoading={isLoading} 
        summary={filteredSummary} 
        formatRM={formatRM} 
      />

      {/* --- DATA TABLE SECTION --- */}
      <section className="min-h-0 flex-1 flex flex-col gap-3 rounded-lg bg-light-blue p-1">
        {/* Table Header Controls */}
        <div className="flex flex-col gap-3 pt-3 px-3">
          <div className="flex w-full items-start justify-between gap-3">
            {/* Title and Description */}
            <div>
              <h3 className="text-lg font-bold">Senarai Tunggakan</h3>
              <p className="text-xs text-grey">Klik pada ikon kemaskini untuk mengubah maklumat unit.</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col items-end gap-3 text-content-muted">
              <div className="flex items-center gap-3">
                {/* Manual Run Button */}
                <div className="group relative inline-block">
                  {/* Manual Run Button */}
                  <button 
                    onClick={handleManualRun}
                    disabled={isManualButtonDisabled}
                    className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors
                      ${isManualButtonDisabled 
                        ? 'border-light-grey/20 bg-surface text-grey/50 cursor-not-allowed'
                        : 'border-light-grey/20 bg-surface text-grey hover:border-dark-blue hover:text-dark-blue'
                      }`}
                  >
                    <Icon icon={isBillingRunning ? "progress_activity" : "autorenew"} size={18} className={isBillingRunning ? "animate-spin" : ""} />
                    {isBilledThisMonth ? `Caj ${targetBillingMonthLabel ?? "Bulan Sasaran"} Selesai` : isBillingRunning ? "Sedang Menjana..." : "Jana Bil Manual"}
                  </button>

                  {/* Automated Billing Status Text (Hover Tooltip) */}
                  <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute right-0 top-full z-50 mt-2 rounded-xl border border-light-grey/20 bg-surface p-4 shadow-xl transition-all duration-200 pointer-events-none text-xs text-right">
                    <div className="flex flex-col gap-1">
                      <div className="whitespace-nowrap">
                        <span className="font-bold text-content">Status Caj Automatik{targetBillingMonthLabel ? ` (${targetBillingMonthLabel})` : ""}: </span>
                        <span className={`font-bold ${isBilledThisMonth ? "text-green" : "text-red"}`}>
                          {isBilledThisMonth ? "Selesai" : "Belum Dijana"}
                        </span>
                      </div>
                      
                      {lastBilledDate && (
                        <div className="text-grey text-[11px] whitespace-nowrap">
                          Terakhir dijana pada {new Date(lastBilledDate).toLocaleString("en-GB", { 
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}
                        </div>
                      )}

                      {/* Safety Lock Warning */}
                      {isFirstDayOfMonth && !isBilledThisMonth && (
                        <p className="text-red-500 italic mt-1 border-t border-dashed border-light-grey/20 pt-1 text-center">
                          Sistem automatik sedang berjalan hari ini. Butang manual dikunci sehingga 2 haribulan.
                        </p>
                      )}
                    </div>

                    {/* Tooltip Arrow */}
                    <div className="absolute right-6 top-0 h-2 w-2 -translate-y-1 rotate-45 border-l border-t border-light-grey/20 bg-surface" />
                  </div>
                </div>

                {/* Month Filter */}
                <ArrearsFilterMonth
                  value={selectedChargeMonth}
                  onChange={setSelectedChargeMonth}
                />

                {/* Search Button */}
                <SearchBarToggleButton
                  label="Cari penghuni tunggakan"
                  isOpen={isSearchOpen}
                  onToggle={handleToggleSearch}
                />

                {/* Filter Button */}
                <ArrearsFilter filters={filters} onChange={setFilters} />

                {/* Download Button */}
                <ArrearsDownload
                  isLoading={isLoading}
                  data={data}
                  filteredData={filteredData}
                  activeFilterCount={activeFilterCount}
                  selectedChargeMonthLabel={selectedChargeMonthLabel}
                />
              </div>
            </div>
          </div>

          {isSearchOpen ? (
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={handleClearSearch}
              label="CARIAN MENGIKUT NAMA, IC, KUARTERS"
              placeholder="Cth: Ahmad, 123456-78-9012, atau blok B-04"
              inputRef={searchInputRef}
            />
          ) : null}
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
          filters={filters}
        />
      </section>

      {/* --- FLOATING 'KEMAS KINI' BUTTON --- */}
      <button 
        onClick={() => setIsKemasKiniModalOpen(true)}
        className="fixed bottom-8 right-8 z-40 flex gap-1 p-4 items-center justify-center rounded-lg bg-dark-blue text-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 active:scale-95"
      >
        <Icon icon="edit" size={15} />
        <span className="font-bold text-xs">Kemas Kini {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</span>
      </button>

      {/* --- KEMAS KINI MODAL --- */}
      <KemasKiniModal 
        isOpen={isKemasKiniModalOpen} 
        onClose={() => {
          setIsKemasKiniModalOpen(false);
        }} 
        onSaved={handleArrearsSaved}
        chargeMonth={selectedChargeMonth}
        selectedCount={selectedIds.length} 
        selectedIds={selectedIds}
      />

      {/* --- BUTIRAN TUNGGAKAN MODAL --- */}
      <ButiranTunggakanModal 
        isOpen={viewResidentId !== null} 
        onClose={() => setViewResidentId(null)} 
        residentId={viewResidentId} 
      />
    </main>
  );
}
