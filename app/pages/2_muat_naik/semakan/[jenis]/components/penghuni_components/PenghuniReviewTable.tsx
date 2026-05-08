"use client";

import { useState } from "react";
import {
  type ExtractedPenghuniRecord,
  Pagination,
  RESIDENTS_PER_PAGE,
} from "../../../../components/extract-review-shared";
import { getPenghuniRecordKey } from "./helpers";
import PenghuniReviewRow from "./PenghuniReviewRow";

export default function PenghuniReviewTable({
  records,
  selectedKeys = [],
  onSelectedKeysChange,
}: {
  records: ExtractedPenghuniRecord[];
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const displayRecords = records;
  const totalPages = Math.max(1, Math.ceil(displayRecords.length / RESIDENTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * RESIDENTS_PER_PAGE;
  const pageRecords = displayRecords.slice(
    pageStartIndex,
    pageStartIndex + RESIDENTS_PER_PAGE,
  );
  const displayStart = displayRecords.length === 0 ? 0 : pageStartIndex + 1;
  const displayEnd = pageStartIndex + pageRecords.length;
  const selectedKeySet = new Set(selectedKeys);
  const allRecordKeys = displayRecords.map(getPenghuniRecordKey);
  const isAllSelected =
    allRecordKeys.length > 0 && allRecordKeys.every((key) => selectedKeySet.has(key));

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
                aria-label="Pilih semua rekod penghuni"
                checked={isAllSelected}
                className="h-4 w-4 accent-dark-blue"
                onChange={(event) => toggleAllRows(event.target.checked)}
              />
            </th>
            <th className="px-4 py-4">Penghuni</th>
            <th className="px-4 py-4">Kuarters</th>
            <th className="px-4 py-4">Perhubungan</th>
            <th className="px-4 py-4">Pekerjaan</th>
            <th className="w-[12%] px-4 py-4 text-center">Tindakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF1F7]">
          {pageRecords.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-6 py-10 text-center text-sm font-semibold text-[#667085]"
              >
                Tiada rekod penghuni baharu ditemui.
              </td>
            </tr>
          ) : (
            pageRecords.map((resident) => (
              <PenghuniReviewRow
                key={`${resident.sourceSheet}-${resident.sourceRow}`}
                resident={resident}
                isSelected={selectedKeySet.has(getPenghuniRecordKey(resident))}
                onSelectionChange={toggleSelectedRow}
              />
            ))
          )}
        </tbody>
      </table>
      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        label={`Memaparkan ${displayStart}-${displayEnd} Daripada ${displayRecords.length} Rekod`}
      />
    </div>
  );
}
