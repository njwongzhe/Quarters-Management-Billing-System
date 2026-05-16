"use client";

import { useState, useMemo } from "react";

import Icon from "@/app/components/Icon/Icon";
import { usePaginationLogic, PaginationControls } from "@/app/components/Pagination/Pagination";
import PenghuniDetail from "./PenghuniDetail";
import { PatternFormat } from "react-number-format";
import type { ResidentRecord, PenghuniTableProps } from "../page";
import { PenghuniFilter, type PenghuniFilterState } from "./PenghuniFilter";
import { handleFilterReset, handleFilterSearch, handleResidentDelete, handleResidentUpdate } from "../controller/DatabaseControl";

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

export default function PenghuniTable({ residents, isLoading, errorMessage, setResidents }: PenghuniTableProps) {
    // Filter State
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterState, setFilterState] = useState<PenghuniFilterState>({
        nama: "",
        noKp: "",
        noTel: "",
        emel: "",
        statuses: {
            aktif: true,
            tidakLayak: true,
            pencenDatang: true,
            tidakLengkap: true,
            keluar: true,
        },
    });

    // Filter logic
    const filteredResidents = useMemo(() => {
        return residents.filter(resident => {
            // Check text filters. (Case-Insensitive)
            if (filterState.nama && !resident.fullName.toLowerCase().includes(filterState.nama.toLowerCase())) 
                return false;
            if (filterState.noKp && !resident.icNumber.includes(filterState.noKp)) 
                return false;
            if (filterState.noTel && !resident.phone?.includes(filterState.noTel))
                return false;
            if (filterState.emel && !resident.email?.toLowerCase().includes(filterState.emel.toLowerCase()))
                return false;

            // Check status filters.
            const statusMapping: Record<string, keyof typeof filterState.statuses> = {
                AKTIF: "aktif",
                TIDAK_LAYAK: "tidakLayak",
                PENCEN_MENDATANG: "pencenDatang",
                DATA_TIDAK_LENGKAP: "tidakLengkap",
                KELUAR: "keluar",
            };

            const residentsStatus = statusMapping[resident.status];

            if (!residentsStatus || !filterState.statuses[residentsStatus])
                return false;

            return true;
        });
    }, [residents, filterState]);
    
    // Pagination Logic
    const itemsPerPage = 10;
    const { currentPage, totalPages, startIndex, endIndex, handlePageChange, paginationItems } = usePaginationLogic(filteredResidents.length, itemsPerPage);
    const currentResidents = filteredResidents.slice(startIndex, endIndex); // Residents to display on the current page.

    // Selected Resident for Detail View
    const [selectedResident, setSelectedResident] = useState<ResidentRecord | null>(null);

    // Handlers for Updating & Deleting Residents (Passed Down to the Detail Component)
    const onResidentUpdate = handleResidentUpdate.bind(null, setResidents, setSelectedResident, selectedResident?.id ?? null);
    const onResidentDelete = handleResidentDelete.bind(null, setResidents);

    return (
        <div className="flex flex-col gap-3 rounded-lg bg-light-blue p-1">
            {/* Header of Table Section */}
            <div className="flex flex-row justify-between px-3 pt-3">
                <div>   
                    <div className="text-lg font-bold">Senarai Penghuni</div>
                    <div className="text-xs">Menguruskan pangkalan data penghuni kuarters kerajaan.</div>
                </div>
                <div className="flex flex-row gap-4 items-center">
                    <Icon icon="download" className="text-grey"></Icon>
                    <button 
                        className={`flex items-center justify-center ${filterOpen ? 'bg-dark-blue text-white p-2 rounded-md shadow' : 'text-grey'}`}
                        onClick={() => setFilterOpen(!filterOpen)}
                    >
                        <Icon icon="filter"></Icon>
                        {filterOpen && <span className="ml-1 font-bold text-xs">Penapis</span>}
                    </button>
                </div>
            </div>
            
            {/* Filter */}
            {filterOpen && 
                <div className="px-3">
                    <PenghuniFilter onSearch={handleFilterSearch.bind(null, setFilterState)} onReset={handleFilterReset.bind(null, setFilterState)} />
                </div>
            }

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
                            <tr className="text-sm">
                                <td className="px-3 py-4 text-center text-grey" colSpan={7}>Sedang membaca data penghuni...</td>
                            </tr>
                        ) : errorMessage ? (
                            <tr className="text-sm">
                                <td className="px-3 py-4 text-center text-red" colSpan={7}>{errorMessage}</td>
                            </tr>
                        ) : residents.length === 0 ? (
                            <tr className="text-sm">
                                <td className="px-3 py-4 text-center text-grey" colSpan={7}>Tiada data penghuni ditemui.</td>
                            </tr>
                        ) : filteredResidents.length === 0 ? (
                            <tr className="text-sm">
                                <td className="px-3 py-4 text-center text-grey" colSpan={7}>Tiada hasil mencari dengan penapis yang dipilih.</td>
                            </tr>
                        ) : (
                            // Render residents for the current page.
                            currentResidents.map((resident) => (
                                <tr key={resident.id} className={`text-sm border-l-4 ${getStatusBadgeColor(resident.status)} border-b border-b-light-grey/20`}>
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
                                                aria-label={`Lihat butiran ${resident.fullName}`}
                                                onClick={() => setSelectedResident(resident)}
                                                className="flex items-center justify-center"
                                            >
                                                <Icon icon="eye" className="text-dark-blue" size={15} />
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
                                    paginationItems={paginationItems}
                                    onPageChange={handlePageChange}
                                />
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

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
