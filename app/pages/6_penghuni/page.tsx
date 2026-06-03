"use client";

import { Suspense, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { PenghuniHeader } from "./components/PenghuniHeader";
import PenghuniTable from "./components/PenghuniTable";
import PenghuniCreate from "./components/PenghuniCreate";
import Icon from "@/app/components/Icon/Icon";
import { handleCreateSuccess } from "./controller/DatabaseControl";

export type ResidentsQuarterInfo = {
    unitCode: string;
    quarterName: string;
    address: string | null;
    moveInDate: string | null;
    moveOutDate: string | null;
    unitId?: string;
    categoryId?: string;
};

export type ResidentsArrearsInfo = {
    totalArrearsAmount: number | null;
};

export type ResidentRecord = {
    id: string;
    fullName: string;
    icNumber: string;
    phone: string | null;
    email: string | null;
    position: string | null;
    department: string | null;
    serviceLevel: string | null;
    status: string;
    description: string | null;
    updatedAt: string;
    quarters: ResidentsQuarterInfo | null;
    totalArrearsAmount: ResidentsArrearsInfo | null;
};

export type PenghuniHeaderProps = {
    residents: ResidentRecord[];
};

export type PenghuniTableProps = {
    residents: ResidentRecord[];
    isLoading: boolean;
    errorMessage: string | null;
    setResidents: Dispatch<SetStateAction<ResidentRecord[]>>;
};

type ResidentsResponse = {
    success: boolean;
    message: string;
    data?: {
        residents: ResidentRecord[];
        meta: {
            totalRecords: number;
            query: string;
        };
    };
};

function getErrorMessage(error: unknown, fallbackMessage: string) {
    return error instanceof Error ? error.message : fallbackMessage;
}

export default function PenghuniPage() {
    const [residents, setResidents] = useState<ResidentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Fetch all residents data on component mount.
    useEffect(() => {
        const controller = new AbortController();

        async function loadResidents() {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const response = await fetch("/api/residents", {
                    signal: controller.signal,
                });
                const payload = (await response.json().catch(() => null)) as ResidentsResponse | null;

                if (!response.ok || !payload?.success) {
                    throw new Error(payload?.message ?? "Gagal mendapatkan senarai penghuni.");
                }

                setResidents(payload.data?.residents ?? []);
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                setResidents([]);
                setErrorMessage(getErrorMessage(error, "Gagal mendapatkan senarai penghuni."));
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadResidents();

        return () => {
            controller.abort();
        };
    }, []);

    // Apabila rekod berjaya dicipta, tambahkannya ke senarai hadapan
    const onCreateSuccess = handleCreateSuccess.bind(null, setResidents);

    return (
        <div className="flex flex-col gap-4">
            {/* Page Header */}
            <PenghuniHeader residents={residents} />

            {/* Table */}
            <Suspense>
                <PenghuniTable
                    residents={residents}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    setResidents={setResidents}
                />
            </Suspense>

            {/* Floating Action Button (FAB) */}
            <button
                onClick={() => setIsCreateOpen(true)}
                aria-label="Tambah Penghuni Baru"
                className="fixed bottom-8 right-8 z-40 flex gap-1 p-4 items-center justify-center rounded-lg bg-dark-blue text-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 active:scale-95"
            >
                <Icon icon="add" size={15} />
                <span className="font-bold text-xs">Tambah Penghuni</span>
            </button>

            {/* Overlay Window untuk Tambah Penghuni */}
            {isCreateOpen && (
                <PenghuniCreate
                    onClose={() => setIsCreateOpen(false)}
                    onCreateSuccess={onCreateSuccess}
                />
            )}
        </div>
    );
}