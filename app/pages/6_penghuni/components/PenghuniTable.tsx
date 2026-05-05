"use client";

import { useState, useMemo } from "react";

import Icon from "@/app/components/Icon";
import { mainTextSize, subTextSize } from "@/app/constants/table";
import { usePaginationLogic, PaginationControls } from "./PaginationControl";
import PenghuniDetail from "./PenghuniDetail";
import { PatternFormat } from "react-number-format";
import type { ResidentRecord, PenghuniTableProps } from "../page";
import { PenghuniFilter, type PenghuniFilterState } from "./PenghuniFilter";

function formatCurrency(value: number) {
    return value.toLocaleString("ms-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function getArrearsTextClass(amount: number) {
    if (amount < 0) 
        return "text-green";

    if (amount > 0)
        return "text-red";

    return "";
}

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
        case "KELUAR":
            return "border-keluar";
        default:
            return "border-transparent";
    }
}

export default function PenghuniTable({
    residents,
    isLoading,
    errorMessage,
    setResidents,
}: PenghuniTableProps) {
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedResident, setSelectedResident] = useState<ResidentRecord | null>(null);
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
            // Check text filters (case-insensitive)
            if (filterState.nama && !resident.fullName.toLowerCase().includes(filterState.nama.toLowerCase())) {
                return false;
            }
            if (filterState.noKp && !resident.icNumber.includes(filterState.noKp)) {
                return false;
            }
            if (filterState.noTel && !resident.phone?.includes(filterState.noTel)) {
                return false;
            }
            if (filterState.emel && !resident.email?.toLowerCase().includes(filterState.emel.toLowerCase())) {
                return false;
            }

            // Check status filters
            const statusMapping: Record<string, keyof typeof filterState.statuses> = {
                AKTIF: "aktif",
                TIDAK_LAYAK: "tidakLayak",
                PENCEN_MENDATANG: "pencenDatang",
                DATA_TIDAK_LENGKAP: "tidakLengkap",
                KELUAR: "keluar",
            };

            const residentsStatus = statusMapping[resident.status];
            if (!residentsStatus || !filterState.statuses[residentsStatus]) {
                return false;
            }

            return true;
        });
    }, [residents, filterState]);
    
    const itemsPerPage = 10;
    const { currentPage, totalPages, startIndex, endIndex, handlePageChange, paginationItems } = usePaginationLogic(filteredResidents.length, itemsPerPage);

    const currentResidents = filteredResidents.slice(startIndex, endIndex);

    // Handlers for updating and deleting residents in the local state after successful API calls in PenghuniDetail.
    const handleResidentUpdate = (updatedData: any) => {
        if (!selectedResident) return;

        // Update the resident in the residents array.
        setResidents(
            residents.map(resident =>
                resident.id === selectedResident.id
                    ? {
                        ...resident,
                        fullName: updatedData.fullName ?? resident.fullName,
                        icNumber: updatedData.icNumber ?? resident.icNumber,
                        phone: updatedData.phone ?? resident.phone,
                        email: updatedData.email ?? resident.email,
                        position: updatedData.position ?? resident.position,
                        department: updatedData.department ?? resident.department,
                        serviceLevel: updatedData.serviceLevel ?? resident.serviceLevel,
                        status: updatedData.status ?? resident.status,
                        description: updatedData.description ?? resident.description,
                      }
                    : resident
            )
        );

        // Update selected resident to reflect changes.
        setSelectedResident(prev =>
            prev ? {
                ...prev,
                fullName: updatedData.fullName ?? prev.fullName,
                icNumber: updatedData.icNumber ?? prev.icNumber,
                phone: updatedData.phone ?? prev.phone,
                email: updatedData.email ?? prev.email,
                position: updatedData.position ?? prev.position,
                department: updatedData.department ?? prev.department,
                serviceLevel: updatedData.serviceLevel ?? prev.serviceLevel,
                status: updatedData.status ?? prev.status,
                description: updatedData.description ?? prev.description,
            } : null
        );
    };

    // Handler to remove resident from the list after successful deletion in PenghuniDetail.
    const handleResidentDelete = (residentId: string) => {
        // Remove the deleted resident from the list
        setResidents(residents.filter(resident => resident.id !== residentId));
    };

    // Filter handlers
    function handleFilterSearch(filters: PenghuniFilterState) {
        setFilterState(filters);
    }

    function handleFilterReset() {
        setFilterState({
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
    }

    return (
        <div className="flex flex-col gap-3 rounded-lg bg-light-blue p-1">
            {/* Header */}
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
                    <PenghuniFilter onSearch={handleFilterSearch} onReset={handleFilterReset} />
                </div>
            }

            {/* Table */}
            <div className="rounded-lg overflow-y-auto">
                <table className="w-full overflow-x-auto">
                    <thead>
                        <tr className="font-bold text-xs text-grey bg-background">
                            <th className="text-left px-3 py-3">Penghuni</th>
                            <th className="text-left px-3 py-3">Kuarters</th>
                            <th className="text-left px-3 py-3">Perhubungan</th>
                            <th className="text-right px-3 py-3">Tunggakan (RM)</th>
                            <th className="text-center px-3 py-3">Tindakan</th>
                        </tr>
                    </thead>
                    
                    <tbody className="bg-white">
                        {isLoading ? (
                            <tr className="text-sm">
                                <td className="px-3 py-4 text-center text-grey" colSpan={5}>Sedang membaca data penghuni...</td>
                            </tr>
                        ) : errorMessage ? (
                            <tr className="text-sm">
                                <td className="px-3 py-4 text-center text-red" colSpan={5}>{errorMessage}</td>
                            </tr>
                        ) : residents.length === 0 ? (
                            <tr className="text-sm">
                                <td className="px-3 py-4 text-center text-grey" colSpan={5}>Tiada data penghuni ditemui.</td>
                            </tr>
                        ) : filteredResidents.length === 0 ? (
                            <tr className="text-sm">
                                <td className="px-3 py-4 text-center text-grey" colSpan={5}>Tiada hasil mencari dengan penapis yang dipilih.</td>
                            </tr>
                        ) : (
                            currentResidents.map((resident) => (
                                <tr key={resident.id} className={`text-sm border-l-4 ${getStatusBadgeColor(resident.status)} border-b border-b-light-grey/20`}>
                                    {/* Penghuni */}
                                    <td className="px-3 py-2 text-left">
                                        <div className={`font-bold ${mainTextSize}`}>{resident.fullName}</div>
                                        <div className={`font-extralight ${subTextSize} text-grey`}>
                                            <PatternFormat value={resident.icNumber} format="######-##-####" disabled />
                                        </div>
                                    </td>

                                    {/* Kuarters */}
                                    <td className="px-3 py-2 text-left">
                                        <div className={`font-bold ${mainTextSize}`}>{resident.quarters?.quarterName ?? "N/A"}</div>
                                        <div className={`font-extralight ${subTextSize} text-grey`}>{resident.quarters?.unitCode ?? "N/A"}</div>
                                    </td>

                                    {/* Perhubungan */}
                                    <td className="px-3 py-2 text-left">
                                        <div className={`font-bold ${mainTextSize}`}>
                                            {resident.phone ? (
                                                <PatternFormat value={resident.phone} format="###-#### ####" disabled />
                                            ) : (
                                                "N/A"
                                            )}
                                        </div>
                                        <div className={`font-extralight ${subTextSize} text-grey`}>{resident.email ?? "N/A"}</div>
                                    </td>
                                    
                                    {/* Tunggakan */}
                                    <td className="px-3 py-2 text-right">
                                        <div className={`font-bold ${mainTextSize} ${getArrearsTextClass(resident.totalArrearsAmount?.totalArrearsAmount ?? 0)}`}>
                                            {formatCurrency(resident.totalArrearsAmount?.totalArrearsAmount ?? 0)}
                                        </div>
                                    </td>

                                    {/* Tindakan */}
                                    <td className="px-3 py-2 text-center align-middle w-px whitespace-nowrap">
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
                    {!isLoading && filteredResidents.length > 0 && (
                        <tfoot>
                            <tr>
                                <td colSpan={5} className="bg-white border-t border-light-grey/20 px-3 py-4">
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
                    )}
                </table>
            </div>

            {selectedResident && (
                <PenghuniDetail
                    {...selectedResident}
                    onClose={() => setSelectedResident(null)}
                    onSaveSuccess={handleResidentUpdate}
                    onDeleteSuccess={handleResidentDelete}
                />
            )}
        </div>
    );
}
