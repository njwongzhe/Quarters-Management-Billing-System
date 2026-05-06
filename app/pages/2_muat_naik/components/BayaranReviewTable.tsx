"use client";

import { useMemo, useState } from "react";
import Icon from "../../../components/Icon";
import {
  type ExtractedBayaranRecord,
  Pagination,
  RESIDENTS_PER_PAGE,
} from "./extract-review-shared";

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

  const calculateTotalAmount = (rows: typeof draftRows) =>
    rows.reduce((total, row) => total + (Number(row.amaunRm) || 0), 0).toFixed(2);
  const stripRowIds = (rows: typeof draftRows): ExtractedBayaranRecord[] =>
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

  return (
    <div className="overflow-x-auto rounded-lg border border-[#DCE2F1] bg-white">
      <table className="min-w-7xl table-fixed text-left text-xs">
        <thead className="bg-[#F7F9FF] text-[10px] font-extrabold uppercase text-[#667085]">
          <tr>
            <th className="w-14 px-5 py-4">
              <input type="checkbox" className="h-4 w-4" />
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
            <tr key={resident.id}>
              <td className="px-5 py-4">
                <input
                  type="checkbox"
                  checked={selectedKeySet.has(selectionKey)}
                  onChange={(event) =>
                    toggleSelectedRow(selectionKey, event.target.checked)
                  }
                  className="h-4 w-4 accent-dark-blue"
                />
              </td>
              <td className="px-4 py-4">
                <p className="font-extrabold leading-5 text-[#172033]">
                  {resident.nama}
                </p>
                <p className="text-[10px] font-semibold text-[#667085]">
                  {resident.noGajiNoKp}
                </p>
              </td>
              <td className="px-4 py-4">
                <p className="whitespace-nowrap font-extrabold text-[#172033]">
                  {resident.ptjpkCode}
                </p>
                <p className="whitespace-nowrap text-[10px] font-medium text-[#667085]">
                  Jabatan {resident.jabatanCode}
                </p>
              </td>
              <td className="px-4 py-4 font-semibold leading-5 text-[#172033]">
                {resident.ptjpkName || "-"}
              </td>
              <td className="px-4 py-4 font-semibold leading-5 text-[#172033]">
                {resident.jabatanName || "-"}
              </td>
              <td className="px-4 py-4 wrap-break-word">{resident.noRujukan || "-"}</td>
              <td className="px-4 py-4">
                {isEditing ? (
                  <input
                    className="h-10 w-full rounded-lg border border-[#E6EAF2] px-3 text-xs"
                    placeholder="Tambah catatan..."
                    value={draft.catatan}
                    onChange={(event) =>
                      updateDraft(resident.id, "catatan", event.target.value)
                    }
                  />
                ) : (
                  resident.catatan || "bayaran"
                )}
              </td>
              <td className="px-4 py-4 text-right">
                {isEditing ? (
                  <input
                    className="h-10 w-23 rounded-lg border border-[#E6EAF2] px-3 text-right font-extrabold"
                    value={draft.amaunRm}
                    onChange={(event) =>
                      updateDraft(resident.id, "amaunRm", event.target.value)
                    }
                  />
                ) : (
                  <span className="font-extrabold text-[#172033]">
                    {resident.amaunRm}
                  </span>
                )}
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-center gap-4">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        aria-label="Simpan perubahan bayaran"
                        onClick={() => saveRow(resident.id)}
                      >
                        <Icon icon="save" size={16} weight={700} className="text-green" />
                      </button>
                      <button
                        type="button"
                        aria-label="Padam bayaran"
                        onClick={() => setPendingDeleteId(resident.id)}
                      >
                        <Icon icon="delete" size={16} weight={700} className="text-red" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      aria-label="Edit bayaran"
                      onClick={() => startEdit(resident.id)}
                    >
                      <Icon icon="edit" size={16} weight={700} className="text-dark-blue" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        label={`Memaparkan ${displayStart}-${displayEnd} Daripada ${savedRows.length} Rekod`}
      />
      {pendingDeleteRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07162F]/35 px-4">
          <div className="w-full max-w-md rounded-xl border border-[#F3C7C7] bg-white p-6 shadow-[0_22px_55px_rgba(15,23,42,0.22)]">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#FFF0F0] text-red">
                <Icon icon="delete" size={24} weight={700} />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold leading-6 text-[#07162F]">
                  Padam Rekod Bayaran?
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-[#4B5567]">
                  Sahkan untuk memadam maklumat bayaran penghuni ini daripada
                  senarai semakan.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-[#EEF1F7] bg-[#F8FAFF] px-4 py-3">
              <p className="text-[10px] font-extrabold uppercase text-[#667085]">
                Penghuni
              </p>
              <p className="mt-1 font-extrabold text-[#172033]">
                {pendingDeleteRow.nama}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#667085]">
                {pendingDeleteRow.noGajiNoKp} · RM {pendingDeleteRow.amaunRm}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="h-11 rounded-lg border border-[#DCE2F1] bg-white px-5 text-xs font-extrabold text-[#344054] shadow-sm transition hover:bg-[#F8FAFF]"
                onClick={() => setPendingDeleteId(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="h-11 rounded-lg bg-red px-5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#B42318]"
                onClick={confirmDeleteRow}
              >
                Ya, Padam
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getBayaranRecordKey(record: ExtractedBayaranRecord) {
  return (
    record.paymentId ??
    `${record.page}-${record.bil}-${record.noGajiNoKp}-${record.noRujukan}`
  );
}
