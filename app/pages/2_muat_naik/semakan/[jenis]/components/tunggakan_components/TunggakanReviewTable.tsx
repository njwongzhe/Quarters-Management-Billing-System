"use client";

import { useEffect, useMemo, useState } from "react";
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
  ) => ExtractedTunggakanRecord | void | Promise<ExtractedTunggakanRecord | void>;
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
  const selectableRecordKeys = savedRows
    .filter((row) => row.importStatus !== "IGNORED")
    .map(getTunggakanRowKey);
  const isAllSelected =
    selectableRecordKeys.length > 0 &&
    selectableRecordKeys.every((key) => selectedKeySet.has(key));

  const totalPages = Math.max(1, Math.ceil(savedRows.length / RESIDENTS_PER_PAGE));
  const paginatedRows = useMemo(
    () =>
      savedRows.slice(
        (currentPage - 1) * RESIDENTS_PER_PAGE,
        currentPage * RESIDENTS_PER_PAGE,
      ),
    [currentPage, savedRows],
  );

  useEffect(() => {
    setSavedRows(records);
    setDraftRows(records);
    setEditingKey(null);
  }, [records]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!editingKey) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest("[data-tunggakan-editor='true']")) {
        return;
      }

      setDraftRows(savedRows);
      setEditingKey(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [editingKey, savedRows]);

  const updateDraftField = (
    key: string,
    field: "nama" | "noKadPengenalan" | "jumlahTunggakan",
    value: string,
  ) => {
    setDraftRows((currentRows) =>
      currentRows.map((row) =>
        getTunggakanRowKey(row) === key ? { ...row, [field]: value } : row,
      ),
    );
  };

  const persistRows = (rows: ExtractedTunggakanRecord[]) => {
    const totalAmount = rows
      .filter((row) => row.importStatus !== "IGNORED")
      .reduce((total, row) => total + parseSignedAmount(row.jumlahTunggakan), 0)
      .toFixed(2);

    return onRecordsChange?.(rows, totalAmount);
  };

  const saveRow = async (key: string) => {
    const draft = draftRows.find((row) => getTunggakanRowKey(row) === key);

    if (!draft) {
      setEditingKey(null);
      return;
    }

    const nextRows = savedRows.map((row) =>
      getTunggakanRowKey(row) === key ? { ...row, ...draft } : row,
    );

    try {
      const updatedRecord = await persistRows(nextRows);
      const committedRows = updatedRecord
        ? nextRows.map((row) =>
            getTunggakanRowKey(row) === key ? updatedRecord : row,
          )
        : nextRows;

      setSavedRows(committedRows);
      setDraftRows(committedRows);
      if (updatedRecord?.importStatus === "IGNORED") {
        const nextKeys = new Set(selectedKeys);
        nextKeys.delete(key);
        nextKeys.delete(getTunggakanRowKey(updatedRecord));
        onSelectedKeysChange?.([...nextKeys]);
      }
      setEditingKey(null);
    } catch {
      setEditingKey(key);
    }
  };

  const deleteRow = (key: string) => {
    const nextRows = savedRows.filter((row) => getTunggakanRowKey(row) !== key);

    setSavedRows(nextRows);
    setDraftRows((currentRows) =>
      currentRows.filter((row) => getTunggakanRowKey(row) !== key),
    );
    const nextKeys = new Set(selectedKeys);
    nextKeys.delete(key);
    onSelectedKeysChange?.([...nextKeys]);
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

    selectableRecordKeys.forEach((key) => {
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-180 border-collapse text-left">
          <thead className="bg-background">
          <tr>
            <th className="w-10 whitespace-nowrap px-3 py-3 text-left">
              <input
                type="checkbox"
                aria-label="Pilih semua rekod tunggakan"
                checked={isAllSelected}
                className="h-4 w-4 accent-dark-blue"
                onChange={(event) => toggleAllRows(event.target.checked)}
              />
            </th>
            <th className="w-min whitespace-nowrap px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
              Nama Penghuni
            </th>
            <th className="w-[22%] px-3 py-4 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
              No. Kad Pengenalan
            </th>
            <th className="w-[20%] px-3 py-4 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
              Jumlah Tunggakan (RM)
            </th>
            <th className="w-24 px-3 py-4 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-grey">
              Tindakan
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedRows.length === 0 ? (
            <tr className="border-t border-light-grey/20">
              <td
                colSpan={5}
                className="px-6 py-10 text-center text-xs font-semibold text-grey"
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
                  onDraftFieldChange={(field, value) =>
                    updateDraftField(key, field, value)
                  }
                  onSave={() => void saveRow(key)}
                  onDelete={() => deleteRow(key)}
                  onEdit={() => startEdit(key)}
                />
              );
            })
          )}
        </tbody>
      </table>
      </div>
      <Pagination
        label={`Memaparkan ${paginatedRows.length} Daripada ${savedRows.length} Rekod`}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

function parseSignedAmount(value: string) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return 0;
  }

  const normalizedSign = normalizedValue.replace(/[−–—]/g, "-");
  const isParenthesizedNegative = /^\(.*\)$/.test(normalizedSign);
  const hasNegativeSign = normalizedSign.includes("-");
  const numericValue = Number(
    normalizedSign
      .replace(/RM/gi, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "")
      .replace(/[()]/g, "")
      .replace(/-/g, ""),
  );

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return (isParenthesizedNegative || hasNegativeSign) && numericValue > 0
    ? numericValue * -1
    : numericValue;
}
