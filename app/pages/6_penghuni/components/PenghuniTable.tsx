"use client";

import { useState, useMemo, useEffect, useRef } from "react";

import { useSearchParams } from "next/navigation";

import Icon from "@/app/components/Icon/Icon";
import SearchBar, { SearchBarToggleButton, searchRecords, useSearchBarLogic } from "@/app/components/SearchBar";
import { loadingTableRows } from "@/app/components/Loading/LoadingTableRows";
import SearchingDataOverlay from "@/app/components/Loading/SearchingDataOverlay";
import { usePaginationLogic, PaginationControls } from "@/app/components/Pagination/Pagination";
import PenghuniDetail from "./PenghuniDetail/PenghuniDetail";
import PenghuniFilter, {
    DEFAULT_PENGHUNI_STATUS_FILTERS,
    filterResidentsByStatus,
    type PenghuniStatusFilter,
} from "./PenghuniFilter";
import PenghuniDownload from "./PenghuniDownload";
import { PatternFormat } from "react-number-format";
import type { ResidentRecord, PenghuniTableProps } from "../page";
import { handleResidentDelete, handleResidentUpdate } from "../controller/DatabaseControl";

// Text size constants for table display
const mainTextSize = "text-[12px]";
const subTextSize = "text-[11px]";

// Helper function to format currency values in Malaysian Ringgit format.
function formatCurrency(value: number) {
    return value.toLocaleString("ms-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Helper function to determine text color class based on arrears amount.
function getArrearsTextClass(amount: number) {
    if (amount < 0) 
        return "text-green";

    if (amount > 0)
        return "text-red";

    return "";
}

// Helper function to determine badge color class based on resident status. (Left Border Color)
function getStatusBadgeColor(status: string) {
    switch (status) {
        case "AKTIF":
            return "border-aktif";
        case "TIDAK_LAYAK":
            return "border-x-layak";
        case "PENCEN_MENDATANG":
            return "border-pencen-datang";
        case "DATA_TIDAK_LENGKAP":
            return "border-x-lengkap";
        default:
            return "border-transparent";
    }
}

export default function PenghuniTable({
    residents,
    isLoading,
    errorMessage,
    setResidents,
    onFilteredResidentsChange,
}: PenghuniTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatuses, setSelectedStatuses] = useState<PenghuniStatusFilter[]>([
        ...DEFAULT_PENGHUNI_STATUS_FILTERS,
    ]);

    const searchedResidents = useMemo(() => {
        return searchRecords(
            residents,
            searchQuery,
            (resident) => [
                resident.fullName,
                resident.icNumber,
                resident.phone,
                resident.email,
                resident.position,
                resident.department,
                resident.quarters?.unitCode,
                resident.quarters?.quarterName,
                resident.quarters?.address,
            ],
            { icSearch: true },
        );
    }, [residents, searchQuery]);

    const filteredResidents = useMemo(() => {
        return filterResidentsByStatus(searchedResidents, selectedStatuses);
    }, [searchedResidents, selectedStatuses]);

    useEffect(() => {
        onFilteredResidentsChange(filteredResidents);
    }, [filteredResidents, onFilteredResidentsChange]);
    
    // Pagination Logic
    const itemsPerPage = 10;
    const { currentPage, totalPages, startIndex, endIndex, handlePageChange } = usePaginationLogic(filteredResidents.length, itemsPerPage);
    const currentResidents = filteredResidents.slice(startIndex, endIndex);

    // Selected Resident for Detail View
    const [selectedResident, setSelectedResident] = useState<ResidentRecord | null>(null);

    // Auto-open resident detail when navigated from another page via ?targetId=
    const searchParams = useSearchParams();
    const didAutoOpenRef = useRef(false);
    useEffect(() => {
        // Wait until the data fetch is complete before trying to open the overlay
        if (didAutoOpenRef.current || isLoading) return;
        const targetId = searchParams.get("targetId")?.trim() ?? "";
        if (!targetId) return;
        didAutoOpenRef.current = true;
        const found = residents.find((r) => r.id === targetId);
        if (!found) return;

        const timer = window.setTimeout(() => {
            setSelectedResident(found);
        }, 0);

        return () => {
            window.clearTimeout(timer);
        };
    }, [isLoading, residents, searchParams]);

    // Handlers for Updating & Deleting Residents
    const onResidentUpdate = handleResidentUpdate.bind(null, setResidents, setSelectedResident, selectedResident?.id ?? null);
    const onResidentDelete = handleResidentDelete.bind(null, setResidents);

    const {
        isOpen: isSearchOpen,
        isSearchActive: isSearchFilterActive,
        searchInputRef,
        handleToggleSearch,
        handleClearSearch,
    } = useSearchBarLogic({
        value: searchQuery,
        onChange: setSearchQuery,
    });

    function handleStatusFilterChange(values: PenghuniStatusFilter[]) {
        setSelectedStatuses(values);
    }

    return (
        <div className="flex flex-col gap-3 rounded-lg bg-light-blue p-1">
            <div className="flex flex-col gap-3 px-3">
                 {/* Header of Table Section */}
                <div className="flex flex-row justify-between pt-3">
                    <div>   
                        <div className="text-lg font-bold text-dark-grey">Senarai Penghuni</div>
                        <div className="text-xs text-grey">Menguruskan pangkalan data penghuni kuarters kerajaan.</div>
                    </div>
                    <div className="flex flex-row gap-4 items-center">
                        <SearchBarToggleButton
                            label="Cari penghuni"
                            isOpen={isSearchOpen}
                            onToggle={handleToggleSearch}
                        />
                        <PenghuniFilter
                            selectedValues={selectedStatuses}
                            onSelect={handleStatusFilterChange}
                        />
                        <PenghuniDownload disabled={isLoading} residents={filteredResidents} />
                    </div>
                </div>

                {/* Search Bar */}
                {isSearchOpen ? (
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onClear={handleClearSearch}
                        label="CARIAN MENGIKUT NAMA, IC, EMAIL, TELEFON, KUARTERS"
                        placeholder="Cth: Ahmad, 123456-78-9012, atau unit A-01-05"
                        inputRef={searchInputRef}
                    />
                ) : null}
            </div>
           
            {/* Table */}
            <div className="rounded-lg overflow-x-auto overflow-y-auto">
                <table className="w-full">
                    {/* Table Header */}
                    <thead>
                        <tr className="font-bold text-xs text-grey bg-background">
                            <th className="text-left p-3 w-min whitespace-nowrap">Penghuni</th>
                            <th className="text-left p-3 w-min whitespace-nowrap">Perhubungan</th>
                            <th className="text-left p-3 w-min whitespace-nowrap">Pekerjaan</th>
                            <th className="text-left p-3 w-min whitespace-nowrap">Taraf Perkhidmatan</th>
                            <th className="text-left p-3 w-min whitespace-nowrap">Kuarters</th>
                            <th className="text-right p-3 w-min whitespace-nowrap">Tunggakan (RM)</th>
                            <th className="w-[0%] text-center p-3 whitespace-nowrap">Tindakan</th>
                        </tr>
                    </thead>
                    
                    {/* Table Body */}
                    <tbody className="bg-white">
                        {isLoading ? (
                            loadingTableRows({
                                mode: "loading",
                                columnCount: 7,
                                rowCount: 10,
                            })
                        ) : errorMessage ? (
                            loadingTableRows({
                                mode: "message",
                                columnCount: 7,
                                rowCount: 1,
                                message: errorMessage,
                            })
                        ) : residents.length === 0 ? (
                            loadingTableRows({
                                mode: "message",
                                columnCount: 7,
                                rowCount: 1,
                                message: "Tiada data penghuni ditemui.",
                            })
                        ) : filteredResidents.length === 0 ? (
                            loadingTableRows({
                                mode: "message",
                                columnCount: 7,
                                rowCount: 1,
                                message: "Tiada hasil mencari dengan penapis yang dipilih.",
                            })
                        ) : (
                            currentResidents.map((resident) => (
                                <tr
                                    key={resident.id}
                                    className={`text-sm border-l-4 ${getStatusBadgeColor(resident.status)} border-b border-b-light-grey/20 transition-colors hover:bg-background/60 cursor-pointer select-text`}
                                    onDoubleClick={() => setSelectedResident(resident)}
                                >
                                    {/* Penghuni */}
                                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                                        <div className={`font-bold ${mainTextSize}`}>{resident.fullName}</div>
                                        <div className={`font-extralight ${subTextSize} text-grey`}>
                                            <PatternFormat value={resident.icNumber} format="######-##-####" displayType="text" disabled />
                                        </div>
                                    </td>

                                    {/* Perhubungan */}
                                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                                        <div className={`font-bold ${mainTextSize}`}>
                                            {resident.phone ? (
                                                <PatternFormat value={resident.phone} format="###-#### ####" displayType="text" disabled />
                                            ) : (
                                                "N/A"
                                            )}
                                        </div>
                                        <div className={`font-extralight ${subTextSize} text-grey w-min whitespace-nowrap`}>{resident.email ?? "N/A"}</div>
                                    </td>

                                    {/* Pekerjaan */}
                                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                                        <div className={`font-bold ${mainTextSize}`}>{resident.position ?? "N/A"}</div>
                                        <div className={`font-extralight ${subTextSize} text-grey`}>{resident.department ?? "N/A"}</div>
                                    </td>

                                    {/* Taraf Perkhidmatan */}
                                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                                        <div className={`font-bold ${mainTextSize}`}>{resident.serviceLevel ?? "N/A"}</div>
                                    </td>

                                    {/* Kuarters */}
                                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                                        <div className={`font-bold ${mainTextSize}`}>{resident.quarters?.quarterName ?? "N/A"}</div>
                                        <div className={`font-extralight ${subTextSize} text-grey`}>{
                                            resident.quarters?.unitCode && resident.quarters?.address ? `${resident.quarters?.unitCode}, ${resident.quarters?.address}` : 
                                            resident.quarters?.unitCode ? `${resident.quarters?.unitCode}` :
                                            resident.quarters?.address ? `${resident.quarters?.address}` : 
                                             "N/A"
                                        }</div>
                                    </td>

                                    {/* Tunggakan */}
                                    <td className="px-3 py-2 text-right w-min whitespace-nowrap">
                                        <div className={`font-bold ${mainTextSize} ${getArrearsTextClass(resident.totalArrearsAmount?.totalArrearsAmount ?? 0)}`}>
                                            {formatCurrency(resident.totalArrearsAmount?.totalArrearsAmount ?? 0)}
                                        </div>
                                    </td>

                                    {/* Tindakan */}
                                    <td className="px-3 py-2 text-center align-middle w-min whitespace-nowrap">
                                        <div className="flex items-center justify-center">
                                            <button
                                                type="button"
                                                aria-label={`Lihat butiran ${resident.fullName}`}
                                                title={`Lihat butiran ${resident.fullName}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedResident(resident);
                                                }}
                                                className="inline-flex items-center justify-center rounded-lg p-2 text-dark-blue transition-colors hover:bg-background"
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
                            <td colSpan={7} className="bg-white border-t border-light-grey/20 px-3 py-4">
                                <PaginationControls
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    startIndex={startIndex}
                                    endIndex={endIndex}
                                    totalRecords={filteredResidents.length}
                                    onPageChange={handlePageChange}
                                />
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Loading Overlay When Navigated via "?targetId=" & Data is Still Fetching */}
            {isLoading && searchParams.get("targetId") && (
                <SearchingDataOverlay />
            )}

            {/* Overlay Window (Resident Detail) */}
            {selectedResident && (
                <PenghuniDetail
                    {...selectedResident}
                    onClose={() => setSelectedResident(null)}
                    onSaveSuccess={onResidentUpdate}
                    onDeleteSuccess={onResidentDelete}
                />
            )}
        </div>
    );
}