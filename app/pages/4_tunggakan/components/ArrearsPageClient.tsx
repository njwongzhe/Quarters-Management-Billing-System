"use client";

import { useState, useEffect, useMemo } from "react";
import { downloadXlsxFile } from "@/lib/download/xlsx-export";
import TunggakanFilterPanel from "./TunggakanFilterPanel";
import { defaultFilter, type TunggakanFilter } from "@/lib/arrears/arrears";
import Icon from "../../../components/Icon/Icon";
import ToolbarButton from "@/app/components/ToolbarIconButton";
import type { TunggakanListItem, TunggakanSummary } from "@/lib/arrears/arrears"; // Make sure this path is correct!
import KemasKiniModal from "./KemasKiniModal";
import ButiranTunggakanModal from "./ButiranTunggakanModal";

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

  // NEW: Billing Automation States
  const [isBilledThisMonth, setIsBilledThisMonth] = useState(false);
  const [lastBilledDate, setLastBilledDate] = useState<string | null>(null);
  const [targetBillingMonthLabel, setTargetBillingMonthLabel] = useState<string | null>(null);
  const [isBillingRunning, setIsBillingRunning] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isKemasKiniModalOpen, setIsKemasKiniModalOpen] = useState(false);
  const [viewResidentId, setViewResidentId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TunggakanFilter>(defaultFilter);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [selectedChargeMonth, setSelectedChargeMonth] = useState(getCurrentMonthInputValue);
  const ITEMS_PER_PAGE = 5;
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
    console.log(">>> fetch started");
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        t: String(Date.now()),
        chargeMonth: selectedChargeMonth,
      });
      const response = await fetch(`/api/arrear?${params.toString()}`, {
        cache: "no-store"
      });
      console.log(">>> response status:", response.status);
      const result = await response.json();
      console.log(">>> result:", result);

      if (result.ok) {
        setData(result.data);
        setSummary(result.summary);
        setCurrentPage(1);
      } else {
        console.error("API Error:", result.message);
        // You could add a toast error notification here later
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

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

  const handleExport = () => {
    const exportData = activeFilterCount > 0 ? filteredData : data;
    const filename = activeFilterCount > 0
      ? `Tunggakan_Ditapis_${new Date().toISOString().slice(0, 10)}`
      : `Tunggakan_Semua_${new Date().toISOString().slice(0, 10)}`;
    const formatQuarterLocation = (row: TunggakanListItem) =>
      row.quarterAddress ? `${row.unitCode}, ${row.quarterAddress}` : row.unitCode;

    downloadXlsxFile({
      filename,
      sheets: [
        {
          name: "Senarai Tunggakan",
          columns: [
            { width: 28 }, // Nama
            { width: 18 }, // IC
            { width: 16 }, // Kelas
            { width: 36 }, // Unit
            { width: 16 }, // Sewa
            { width: 16 }, // Senggara
            { width: 16 }, // Penalti
            { width: 16 }, // Tambahan
            { width: 16 }, // Rebat
            { width: 14 }, // Tunggakan
          ],
          rows: [
            // Header row
            [
              { value: "NAMA PENGHUNI",   style: "header" },
              { value: "NO. KAD PENGENALAN", style: "header" },
              { value: "KELAS KUARTERS",  style: "header" },
              { value: "KOD UNIT / ALAMAT", style: "header" },
              { value: `SEWA ${selectedChargeMonthLabel} (RM)`,       style: "header", align: "right" },
              { value: `SENGGARA ${selectedChargeMonthLabel} (RM)`,   style: "header", align: "right" },
              { value: `PENALTI ${selectedChargeMonthLabel} (RM)`,    style: "header", align: "right" },
              { value: `TAMBAHAN ${selectedChargeMonthLabel} (RM)`,   style: "header", align: "right" },
              { value: `REBAT ${selectedChargeMonthLabel} (RM)`,      style: "header", align: "right" },
              { value: "TUNGGAKAN (RM)",  style: "header", align: "right" },
            ],
            // Data rows
            ...exportData.map((row) => [
              { value: row.fullName },
              { value: row.icNumber },
              { value: row.quarterClass },
              { value: formatQuarterLocation(row) },
              { value: row.sewa,             type: "number" as const, align: "right" as const },
              { value: row.senggara,         type: "number" as const, align: "right" as const },
              { value: row.penalti,          type: "number" as const, align: "right" as const },
              { value: row.tambahan,         type: "number" as const, align: "right" as const },
              { value: row.rebat,            type: "number" as const, align: "right" as const },
              { value: row.jumlahTunggakan,  type: "number" as const, align: "right" as const },
            ]),
          ],
        },
      ],
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
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
      
      alert(result.message); // You can change this to a nice Toast notification later!
      
      if (result.ok) {
        fetchBillingStatus(); // Refresh the status lock
        fetchTunggakanData(); // Refresh the table to show new charges
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
        <h1 className="text-3xl font-bold text-dark-blue mb-2">
          Tunggakan
        </h1>
        <p className="text-grey">
          Halaman ini memaparkan ringkasan dan perincian tunggakan sewa serta caj tambahan bagi setiap penghuni kuarters.
        </p>
      </div>

      {/* --- SUMMARY CARDS --- */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-grey font-medium mb-2">Jumlah Rekod</p>
          <h2 className="text-3xl font-bold text-dark-blue mb-4">
            {isLoading ? "RM 0.00" : formatRM(summary.jumlahRekod)}
          </h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-dark-blue"></span>
            <span className="text-xs font-bold text-dark-blue tracking-wider">TERKINI</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-grey font-medium mb-2">Jumlah Tunggakan</p>
          <h2 className="text-3xl font-bold text-dark-blue mb-4">
            {isLoading ? "RM 0.00" : formatRM(summary.jumlahTunggakan)}
          </h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-(--color-red)"></span>
            <span className="text-xs font-bold text-(--color-red) tracking-wider">PERLU DIKUMPUL</span>
          </div>
        </div>
      </div>

      {/* --- DATA TABLE SECTION --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-6 flex justify-between items-start bg-[#F8FAFC]">
          <div>
            <h3 className="text-lg font-bold text-dark-blue">Senarai Tunggakan</h3>
            <p className="text-sm text-grey mt-1">Klik pada ikon kemaskini untuk mengubah maklumat unit.</p>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-4">
              {/* NEW: Manual Run Button */}
              <button 
                onClick={handleManualRun}
                disabled={isManualButtonDisabled}
                className={`px-4 py-2 text-sm font-bold rounded shadow-sm transition-colors flex items-center gap-2
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

              <ToolbarButton
                icon="download"
                label={
                  activeFilterCount > 0
                    ? `Eksport ${filteredData.length} rekod ditapis`
                    : `Eksport semua ${data.length} rekod`
                }
                onClick={handleExport}
                disabled={isLoading || data.length === 0}
              />
              <ToolbarButton
                icon="filter"
                label="Tapis rekod tunggakan"
                onClick={() => setIsFilterPanelOpen(true)}
                isActive={activeFilterCount > 0}
                activeBadge={activeFilterCount}
              />
            </div>

            {/* NEW: Automated Billing Status Text */}
            <div className="text-xs text-right">
              <span className="text-grey">Status Caj Automatik{targetBillingMonthLabel ? ` (${targetBillingMonthLabel})` : ""}: </span>
              <span className={`font-bold ${isBilledThisMonth ? "text-(--color-green)" : "text-yellow-600"}`}>
                {isBilledThisMonth ? "Selesai" : "Belum Dijana"}
              </span>
              
              {lastBilledDate && (
                <span className="text-grey ml-1">
                  (Terakhir dijana pada {new Date(lastBilledDate).toLocaleString("en-GB", { 
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })})
                </span>
              )}

              {/* Safety Lock Warning - Only shows on the 1st of the month if not billed yet */}
              {isFirstDayOfMonth && !isBilledThisMonth && (
                <p className="text-red-500 italic mt-1">
                  Sistem automatik sedang berjalan hari ini. Butang manual dikunci sehingga 2 haribulan.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-light-blue text-grey text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-dark-blue focus:ring-dark-blue"
                    onChange={handleSelectAll}
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
                        onChange={() => handleSelectRow(row.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-dark-grey">{row.fullName}</div>
                      <div className="text-xs text-light-grey mt-1">{row.icNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-dark-grey">{row.quarterClass}</div>
                      <div className="text-xs text-light-grey mt-1 max-w-[240px] leading-snug whitespace-normal">
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
                    <td className={`px-6 py-4 text-right font-bold ${row.rebat > 0 ? "text-(--color-green)" : "text-dark-grey"}`}>
                      {row.rebat.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${row.jumlahTunggakan > 0 ? "text-(--color-red)" : "text-dark-grey"}`}>
                      {row.jumlahTunggakan.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setViewResidentId(row.id)}
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
        </div>

        {/* Pagination Bar */}
        {!isLoading && data.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-grey">
            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    className={`px-3 py-1 border rounded transition-colors ${
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
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, data.length)}
              </span>{" "}
              Daripada <span className="font-bold">{filteredData.length}</span> Rekod
                {activeFilterCount > 0 && (
                  <span className="ml-2 text-xs text-grey">(ditapis daripada {data.length} jumlah rekod)</span>
                )}
            </div>
          </div>
        )}
      </div>

      {/* --- FLOATING 'KEMAS KINI' BUTTON --- */}
      <div className={`fixed bottom-8 right-8 transition-opacity duration-200 ${selectedIds.length > 0 ? 'opacity-100 z-40' : 'opacity-0 pointer-events-none'}`}>
        <button 
          onClick={() => setIsKemasKiniModalOpen(true)}
          className="flex items-center gap-2 bg-dark-blue text-white px-6 py-3 rounded-lg shadow-lg font-bold hover:bg-opacity-90 transition-all"
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
