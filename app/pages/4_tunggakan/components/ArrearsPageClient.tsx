"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { areAllFilterOptionsSelected } from "@/app/components/Filter/FilterOption";
import { defaultFilter, type TunggakanFilter } from "@/lib/arrears/arrears";
import Icon from "@/app/components/Icon/Icon";
import { InputField } from "@/app/components/InputField";
import type { TunggakanListItem, TunggakanSummary } from "@/lib/arrears/arrears";
import KemasKiniModal from "@/app/pages/4_tunggakan/components/KemasKiniModal";
import ButiranTunggakanModal from "@/app/pages/4_tunggakan/components/ButiranTunggakan/ButiranTunggakanModal";

// New Split Components
import TunggakanSummaryCards from "./TunggakanList/TunggakanSummaryCards";
import TunggakanTable from "./TunggakanList/TunggakanTable";
import ArrearsDownload from "./TunggakanList/TableButton/ArrearsDownload";
import ArrearsFilter from "./TunggakanList/TableButton/ArrearsFilter";
import ArrearsSearch from "./TunggakanList/TableButton/ArrearsSearch";
import ArrearsFilterMonth from "./TunggakanList/TableButton/ArrearsFIlterMonth";

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

export default function TunggakanPageClient() {
  // --- STATE MANAGEMENT ---
  const [data, setData] = useState<TunggakanListItem[]>([]);
  const [summary, setSummary] = useState<TunggakanSummary>({ jumlahRekod: 0, jumlahKutipan: 0, jumlahTunggakan: 0 });
  const [isLoading, setIsLoading] = useState(true);

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
  const [selectedChargeMonth, setSelectedChargeMonth] = useState(getCurrentMonthInputValue);
  const selectedChargeMonthLabel = useMemo(() => formatMonthLabel(selectedChargeMonth), [selectedChargeMonth]);

  const [searchQuery, setSearchQuery] = useState("");
  const isSearchActive = searchQuery.trim().length > 0;
  const [isSearchOpen, setIsSearchOpen] = useState(isSearchActive);

  // Synchronize searchQuery with panel open state
  useEffect(() => {
    if (!isSearchOpen) {
      setSearchQuery("");
    }
  }, [isSearchOpen]);

  const normalizeSearchValue = (value: string) => {
    return value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

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
        
        if (autoSelect && !hasAutoSelected) {
          const idsWithArrears = (result.data as TunggakanListItem[])
            .filter((item) => item.jumlahTunggakan > 0)
            .map((item) => item.id);
          setSelectedIds(idsWithArrears);
          setHasAutoSelected(true);
        }
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
    setData([]);
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

    if (isSearchOpen) {
      const normalizedQuery = normalizeSearchValue(searchQuery);
      if (normalizedQuery.length > 0) {
        result = result.filter((row) => {
          const searchableFields = [
            row.fullName,
            row.icNumber,
            row.quarterClass,
            row.unitCode,
            row.quarterAddress,
          ].filter(Boolean) as string[];

          return searchableFields.some((field) =>
            normalizeSearchValue(field).includes(normalizedQuery)
          );
        });
      }
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
    <main className="relative flex flex-col gap-4 text-[#0B1C30]">
      {/* --- HEADER SECTION --- */}
      <header>
        <h1 className="text-2xl font-extrabold text-dark-grey">
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
            <div className="flex flex-col items-end gap-3 text-[#607083]">
              <div className="flex items-center gap-3">
                {/* Manual Run Button */}
                <div className="group relative inline-block">
                  {/* Manual Run Button */}
                  <button 
                    onClick={handleManualRun}
                    disabled={isManualButtonDisabled}
                    className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors
                      ${isManualButtonDisabled 
                        ? 'border-light-grey/20 bg-white text-grey/50 cursor-not-allowed' 
                        : 'border-light-grey/20 bg-white text-grey hover:border-dark-blue hover:text-dark-blue'
                      }`}
                  >
                    <Icon icon={isBillingRunning ? "progress_activity" : "autorenew"} size={18} className={isBillingRunning ? "animate-spin" : ""} />
                    {isBilledThisMonth ? `Caj ${targetBillingMonthLabel ?? "Bulan Sasaran"} Selesai` : isBillingRunning ? "Sedang Menjana..." : "Jana Bil Manual"}
                  </button>

                  {/* Automated Billing Status Text (Hover Tooltip) */}
                  <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute right-0 top-full z-50 mt-2 rounded-xl border border-light-grey/20 bg-white p-4 shadow-xl transition-all duration-200 pointer-events-none text-xs text-right">
                    <div className="flex flex-col gap-1">
                      <div className="whitespace-nowrap">
                        <span className="font-bold text-black">Status Caj Automatik{targetBillingMonthLabel ? ` (${targetBillingMonthLabel})` : ""}: </span>
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
                    <div className="absolute right-6 top-0 h-2 w-2 -translate-y-1 rotate-45 border-l border-t border-light-grey/20 bg-white" />
                  </div>
                </div>

                {/* Month Filter */}
                <ArrearsFilterMonth
                  value={selectedChargeMonth}
                  onChange={setSelectedChargeMonth}
                />

                {/* Search Button */}
                <ArrearsSearch value={searchQuery} isOpen={isSearchOpen} setIsOpen={setIsSearchOpen} />

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
            <div className="w-full rounded-lg bg-white p-4 shadow border border-light-grey/10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1">
                  <InputField
                    label="CARIAN MENGIKUT NAMA, IC, KUARTERS"
                    value={searchQuery}
                    state="active"
                    onChange={setSearchQuery}
                    placeholder="Cth: Ahmad, 123456-78-9012, atau blok B-04"
                    showLabel
                    leadingIcon={(
                      <Icon icon="search" size={18} className="text-light-grey" />
                    )}
                    className="w-full"
                    activeBackgroundClass="bg-light-blue"
                    inputFontSize={12}
                    inputMinHeight={40}
                  />
                </div>

                <div className="flex items-center gap-3 self-start lg:self-end">
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!isSearchActive}
                    onClick={() => setSearchQuery("")}
                  >
                    Kosongkan
                  </button>
                </div>
              </div>
            </div>
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
        onSaved={async () => {
          await fetchTunggakanData();
          setSelectedIds([]);
        }}
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