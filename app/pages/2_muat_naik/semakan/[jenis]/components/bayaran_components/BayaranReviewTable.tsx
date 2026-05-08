"use client";

import { useMemo, useState } from "react";
import {
  type ExtractedBayaranRecord,
  Pagination,
  RESIDENTS_PER_PAGE,
} from "../../../../components/extract-review-shared";
import BayaranDeleteDialog from "./BayaranDeleteDialog";
import BayaranReviewRow from "./BayaranReviewRow";
import type { BayaranReviewRowModel } from "./types";

export default function BayaranReviewTable({
  records,
  onTotalAmountChange,
  onRecordsChange,
  selectedKeys = [],
  onSelectedKeysChange,
}: {
  records: ExtractedBayaranRecord[];
  onTotalAmountChange?: (totalAmount: string) => void;
  onRecordsChange?: (records: ExtractedBayaranRecord[], totalAmount: string) => void;
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
}) {
  const initialRows = useMemo(
    () =>
      records.map((record, index) => ({
        ...record,
        catatan: record.catatan || "bayaran",
        id: `${record.page}-${record.bil}-${record.noGajiNoKp}-${index}`,
      })),
    [records],
  );
  const [savedRows, setSavedRows] = useState(initialRows);
  const [draftRows, setDraftRows] = useState(initialRows);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(savedRows.length / RESIDENTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * RESIDENTS_PER_PAGE;
  const pageRows = savedRows.slice(pageStartIndex, pageStartIndex + RESIDENTS_PER_PAGE);
  const displayStart = savedRows.length === 0 ? 0 : pageStartIndex + 1;
  const displayEnd = pageStartIndex + pageRows.length;
  const pendingDeleteRow =
    savedRows.find((row) => row.id === pendingDeleteId) ?? null;
  const selectedKeySet = new Set(selectedKeys);
  const allRecordKeys = savedRows.map(getBayaranRecordKey);
  const isAllSelected =
    allRecordKeys.length > 0 && allRecordKeys.every((key) => selectedKeySet.has(key));

  const calculateTotalAmount = (rows: BayaranReviewRowModel[]) =>
    rows.reduce((total, row) => total + (Number(row.amaunRm) || 0), 0).toFixed(2);
  const stripRowIds = (rows: BayaranReviewRowModel[]): ExtractedBayaranRecord[] =>
    rows.map((row) => ({
      paymentId: row.paymentId,
      residentId: row.residentId,
      residentRecordStatus: row.residentRecordStatus,
      page: row.page,
      jabatanCode: row.jabatanCode,
      jabatanName: row.jabatanName,
      ptjpkCode: row.ptjpkCode,
      ptjpkName: row.ptjpkName,
      bil: row.bil,
      noRujukan: row.noRujukan,
      noGajiNoKp: row.noGajiNoKp,
      nama: row.nama,
      amaunRm: row.amaunRm,
      tarikh: row.tarikh,
      noResit: row.noResit,
      catatan: row.catatan,
    }));

  const updateDraft = (id: string, field: "amaunRm" | "catatan", value: string) => {
    setDraftRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const saveRow = (id: string) => {
    const draft = draftRows.find((row) => row.id === id);

    if (!draft) {
      setEditingId(null);
      return;
    }

    setSavedRows((currentRows) =>
      {
        const nextRows = currentRows.map((row) =>
          row.id === id ? { ...row, ...draft } : row,
        );
        const totalAmount = calculateTotalAmount(nextRows);
        onTotalAmountChange?.(totalAmount);
        onRecordsChange?.(stripRowIds(nextRows), totalAmount);
        return nextRows;
      },
    );
    setEditingId(null);
  };

  const confirmDeleteRow = () => {
    if (!pendingDeleteId) {
      return;
    }

    const id = pendingDeleteId;
    setSavedRows((currentRows) => {
      const nextRows = currentRows.filter((row) => row.id !== id);
      const totalAmount = calculateTotalAmount(nextRows);
      onTotalAmountChange?.(totalAmount);
      onRecordsChange?.(stripRowIds(nextRows), totalAmount);
      return nextRows;
    });
    setDraftRows((currentRows) => currentRows.filter((row) => row.id !== id));
    setEditingId((currentId) => (currentId === id ? null : currentId));
    setPendingDeleteId(null);
  };

  const startEdit = (id: string) => {
    const saved = savedRows.find((row) => row.id === id);

    if (saved) {
      setDraftRows((currentRows) =>
        currentRows.map((row) => (row.id === id ? { ...row, ...saved } : row)),
      );
    }

    setEditingId(id);
  };

  const toggleSelectedRow = (key: string, checked: boolean) => {
    const nextKeys = new Set(selectedKeys);

    if (checked) {
      nextKeys.add(key);
    } else {
      nextKeys.delete(key);
    }

    onSelectedKeysChange?.([...nextKeys]);
  };

  const toggleAllRows = (checked: boolean) => {
    const nextKeys = new Set(selectedKeys);

    allRecordKeys.forEach((key) => {
      if (checked) {
        nextKeys.add(key);
      } else {
        nextKeys.delete(key);
      }
    });

    onSelectedKeysChange?.([...nextKeys]);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[#DCE2F1] bg-white">
      <table className="min-w-7xl table-fixed text-left text-xs">
        <thead className="bg-[#F7F9FF] text-[10px] font-extrabold uppercase text-[#667085]">
          <tr>
            <th className="w-14 px-5 py-4">
              <input
                type="checkbox"
                aria-label="Pilih semua rekod bayaran"
                checked={isAllSelected}
                className="h-4 w-4 accent-dark-blue"
                onChange={(event) => toggleAllRows(event.target.checked)}
              />
            </th>
            <th className="w-56 px-4 py-4">Penghuni</th>
            <th className="w-40 px-4 py-4 whitespace-nowrap">PTJPK / Jabatan</th>
            <th className="w-72 px-4 py-4">Nama PTJPK</th>
            <th className="w-72 px-4 py-4">Nama Jabatan</th>
            <th className="w-48 px-4 py-4 whitespace-nowrap">No. Rujukan</th>
            <th className="w-56 px-4 py-4">Catatan</th>
            <th className="w-44 px-4 py-4 text-right whitespace-nowrap">
              Amaun Bayar (RM)
            </th>
            <th className="w-36 px-4 py-4 text-center">Tindakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF1F7]">
          {pageRows.map((resident) => {
            const isEditing = editingId === resident.id;
            const draft = draftRows.find((row) => row.id === resident.id) ?? resident;
            const selectionKey = getBayaranRecordKey(resident);

            return (
              <BayaranReviewRow
                key={resident.id}
                row={resident}
                draft={draft}
                isEditing={isEditing}
                isSelected={selectedKeySet.has(selectionKey)}
                onSelectionChange={(checked) =>
                  toggleSelectedRow(selectionKey, checked)
                }
                onDraftChange={(field, value) =>
                  updateDraft(resident.id, field, value)
                }
                onSave={() => saveRow(resident.id)}
                onEdit={() => startEdit(resident.id)}
                onDelete={() => setPendingDeleteId(resident.id)}
              />
          )})}
        </tbody>
      </table>
      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        label={`Memaparkan ${displayStart}-${displayEnd} Daripada ${savedRows.length} Rekod`}
      />
      <BayaranDeleteDialog
        row={pendingDeleteRow}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDeleteRow}
      />
    </div>
  );
}

function getBayaranRecordKey(record: ExtractedBayaranRecord) {
  return (
    record.paymentId ??
    `${record.page}-${record.bil}-${record.noGajiNoKp}-${record.noRujukan}`
  );
}
