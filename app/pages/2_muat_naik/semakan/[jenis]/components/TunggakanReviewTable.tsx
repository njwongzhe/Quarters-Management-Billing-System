"use client";

import { useMemo, useState } from "react";
import Icon from "../../../../../components/Icon";
import {
  Pagination,
  RESIDENTS_PER_PAGE,
  type ExtractedTunggakanRecord,
} from "./extract-review-shared";

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
        getRowKey(row) === key ? { ...row, jumlahTunggakan } : row,
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
    const draft = draftRows.find((row) => getRowKey(row) === key);

    if (!draft) {
      setEditingKey(null);
      return;
    }

    const nextRows = savedRows.map((row) =>
      getRowKey(row) === key ? { ...row, ...draft } : row,
    );

    setSavedRows(nextRows);
    setEditingKey(null);
    persistRows(nextRows);
  };

  const deleteRow = (key: string) => {
    const nextRows = savedRows.filter((row) => getRowKey(row) !== key);

    setSavedRows(nextRows);
    setDraftRows((currentRows) =>
      currentRows.filter((row) => getRowKey(row) !== key),
    );
    setEditingKey(null);
    persistRows(nextRows);
  };

  const startEdit = (key: string) => {
    const saved = savedRows.find((row) => getRowKey(row) === key);

    if (saved) {
      setDraftRows((currentRows) =>
        currentRows.map((row) => (getRowKey(row) === key ? { ...row, ...saved } : row)),
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

  return (
    <div className="overflow-hidden rounded-lg border border-[#DCE2F1] bg-white">
      <table className="w-full table-fixed text-left text-xs">
        <thead className="bg-[#F7F9FF] text-[10px] font-extrabold uppercase text-[#667085]">
          <tr>
            <th className="w-10 px-5 py-4">
              <input type="checkbox" className="h-4 w-4" />
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
              const key = getRowKey(resident);
              const isEditing = editingKey === key;
              const draft = draftRows.find((row) => getRowKey(row) === key) ?? resident;

              return (
                <tr key={key}>
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedKeySet.has(key)}
                      disabled={resident.importStatus === "IGNORED"}
                      className="h-4 w-4 accent-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
                      onChange={(event) =>
                        toggleSelectedRow(key, event.target.checked)
                      }
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold text-[#172033]">{resident.nama}</p>
                      {resident.importStatus === "IGNORED" ? (
                        <span className="rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#B54708]">
                          Diabaikan
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] font-semibold text-[#667085]">
                      {resident.noKadPengenalan}
                    </p>
                    {resident.importMessage ? (
                      <p className="mt-1 text-[10px] font-semibold text-[#B54708]">
                        {resident.importMessage}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {isEditing ? (
                      <input
                        className="h-10 w-24 rounded-lg border border-[#E6EAF2] px-3 text-right font-extrabold"
                        value={draft.jumlahTunggakan}
                        onChange={(event) =>
                          updateDraftAmount(key, event.target.value)
                        }
                      />
                    ) : (
                      <span className="font-extrabold text-[#172033]">
                        {Number(resident.jumlahTunggakan || 0).toLocaleString(
                          "ms-MY",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-4">
                      {resident.importStatus === "IGNORED" ? (
                        <Icon
                          icon="block"
                          size={16}
                          weight={700}
                          className="text-[#B54708]"
                        />
                      ) : isEditing ? (
                        <>
                          <button
                            type="button"
                            aria-label="Simpan perubahan tunggakan"
                            onClick={() => saveRow(key)}
                          >
                            <Icon
                              icon="save"
                              size={16}
                              weight={700}
                              className="text-green"
                            />
                          </button>
                          <button
                            type="button"
                            aria-label="Padam tunggakan"
                            onClick={() => deleteRow(key)}
                          >
                            <Icon
                              icon="delete"
                              size={16}
                              weight={700}
                              className="text-red"
                            />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          aria-label="Edit tunggakan"
                          onClick={() => startEdit(key)}
                        >
                          <Icon
                            icon="edit"
                            size={16}
                            weight={700}
                            className="text-dark-blue"
                          />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
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

function getRowKey(row: ExtractedTunggakanRecord) {
  return row.arrearsSummaryId ?? `${row.noKadPengenalan}-${row.sourceSheet}-${row.sourceRow}`;
}
