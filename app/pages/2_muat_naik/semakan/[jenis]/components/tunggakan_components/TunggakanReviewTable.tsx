"use client";

import { useMemo, useState } from "react";
import {
  Pagination,
  RESIDENTS_PER_PAGE,
  type ExtractedTunggakanRecord,
} from "../../../../components/extract-review-shared";
import { getTunggakanRowKey } from "./helpers";
import TunggakanReviewRow from "./TunggakanReviewRow";

type TunggakanReviewTableProps = {
  records: ExtractedTunggakanRecord[];
  onRecordsChange?: (
    records: ExtractedTunggakanRecord[],
    totalAmount: string,
  ) => void;
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
};

export default function TunggakanReviewTable({
  records,
  onRecordsChange,
  selectedKeys = [],
  onSelectedKeysChange,
}: TunggakanReviewTableProps) {
  const [savedRows, setSavedRows] = useState(records);
  const [draftRows, setDraftRows] = useState(records);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const selectedKeySet = new Set(selectedKeys);
  const allRecordKeys = savedRows.map(getTunggakanRowKey);
  const isAllSelected =
    allRecordKeys.length > 0 && allRecordKeys.every((key) => selectedKeySet.has(key));

  const totalPages = Math.max(1, Math.ceil(savedRows.length / RESIDENTS_PER_PAGE));
  const paginatedRows = useMemo(
    () =>
      savedRows.slice(
        (currentPage - 1) * RESIDENTS_PER_PAGE,
        currentPage * RESIDENTS_PER_PAGE,
      ),
    [currentPage, savedRows],
  );

  const updateDraftAmount = (key: string, jumlahTunggakan: string) => {
    setDraftRows((currentRows) =>
      currentRows.map((row) =>
        getTunggakanRowKey(row) === key ? { ...row, jumlahTunggakan } : row,
      ),
    );
  };

  const persistRows = (rows: ExtractedTunggakanRecord[]) => {
    const totalAmount = rows
      .filter((row) => row.importStatus !== "IGNORED")
      .reduce((total, row) => total + Number(row.jumlahTunggakan || 0), 0)
      .toFixed(2);

    onRecordsChange?.(rows, totalAmount);
  };

  const saveRow = (key: string) => {
    const draft = draftRows.find((row) => getTunggakanRowKey(row) === key);

    if (!draft) {
      setEditingKey(null);
      return;
    }

    const nextRows = savedRows.map((row) =>
      getTunggakanRowKey(row) === key ? { ...row, ...draft } : row,
    );

    setSavedRows(nextRows);
    setEditingKey(null);
    persistRows(nextRows);
  };

  const deleteRow = (key: string) => {
    const nextRows = savedRows.filter((row) => getTunggakanRowKey(row) !== key);

    setSavedRows(nextRows);
    setDraftRows((currentRows) =>
      currentRows.filter((row) => getTunggakanRowKey(row) !== key),
    );
    setEditingKey(null);
    persistRows(nextRows);
  };

  const startEdit = (key: string) => {
    const saved = savedRows.find((row) => getTunggakanRowKey(row) === key);

    if (saved) {
      setDraftRows((currentRows) =>
        currentRows.map((row) =>
          getTunggakanRowKey(row) === key ? { ...row, ...saved } : row,
        ),
      );
    }

    setEditingKey(key);
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
    <div className="overflow-hidden rounded-lg border border-[#DCE2F1] bg-white">
      <table className="w-full table-fixed text-left text-xs">
        <thead className="bg-[#F7F9FF] text-[10px] font-extrabold uppercase text-[#667085]">
          <tr>
            <th className="w-10 px-5 py-4">
              <input
                type="checkbox"
                aria-label="Pilih semua rekod tunggakan"
                checked={isAllSelected}
                className="h-4 w-4 accent-dark-blue"
                onChange={(event) => toggleAllRows(event.target.checked)}
              />
            </th>
            <th className="px-4 py-4">Penghuni</th>
            <th className="w-[18%] px-4 py-4 text-right">Jumlah Tunggakan (RM)</th>
            <th className="w-[16%] px-4 py-4 text-center">Tindakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF1F7]">
          {paginatedRows.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-6 py-10 text-center text-sm font-semibold text-[#667085]"
              >
                Tiada rekod tunggakan ditemui.
              </td>
            </tr>
          ) : (
            paginatedRows.map((resident) => {
              const key = getTunggakanRowKey(resident);
              const isEditing = editingKey === key;
              const draft =
                draftRows.find((row) => getTunggakanRowKey(row) === key) ??
                resident;

              return (
                <TunggakanReviewRow
                  key={key}
                  row={resident}
                  draft={draft}
                  isEditing={isEditing}
                  isSelected={selectedKeySet.has(key)}
                  onSelectionChange={(checked) => toggleSelectedRow(key, checked)}
                  onDraftAmountChange={(jumlahTunggakan) =>
                    updateDraftAmount(key, jumlahTunggakan)
                  }
                  onSave={() => saveRow(key)}
                  onDelete={() => deleteRow(key)}
                  onEdit={() => startEdit(key)}
                />
              );
            })
          )}
        </tbody>
      </table>
      <Pagination
        label={`Memaparkan ${paginatedRows.length} Daripada ${savedRows.length} Rekod`}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
