"use client";

import { Suspense, useState } from "react";

import Icon from "@/app/components/Icon/Icon";
import type { ResidentRecord } from "@/lib/residents/resident-list";

import { handleCreateSuccess } from "../controller/DatabaseControl";
import PenghuniCreate from "./PenghuniCreate";
import { PenghuniHeader } from "./PenghuniHeader";
import PenghuniTable from "./PenghuniTable";

export default function PenghuniPageClient({
  initialResidents,
}: {
  initialResidents: ResidentRecord[];
}) {
  const [residents, setResidents] =
    useState<ResidentRecord[]>(initialResidents);
  const [filteredResidents, setFilteredResidents] =
    useState<ResidentRecord[]>(initialResidents);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const onCreateSuccess = handleCreateSuccess.bind(null, setResidents);

  return (
    <div className="flex flex-col gap-4">
      <PenghuniHeader residents={filteredResidents} />

      <Suspense>
        <PenghuniTable
          residents={residents}
          isLoading={false}
          errorMessage={null}
          setResidents={setResidents}
          onFilteredResidentsChange={setFilteredResidents}
        />
      </Suspense>

      <button
        onClick={() => setIsCreateOpen(true)}
        aria-label="Tambah Penghuni Baru"
        className="fixed bottom-8 right-8 z-40 flex items-center justify-center gap-1 rounded-lg bg-dark-blue p-4 text-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 active:scale-95"
      >
        <Icon icon="add" size={15} />
        <span className="text-xs font-bold">Tambah Penghuni</span>
      </button>

      {isCreateOpen ? (
        <PenghuniCreate
          onClose={() => setIsCreateOpen(false)}
          onCreateSuccess={onCreateSuccess}
        />
      ) : null}
    </div>
  );
}
