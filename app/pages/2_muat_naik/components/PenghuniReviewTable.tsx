"use client";

import { useState } from "react";
import Icon from "../../../components/Icon";
import {
  type ExtractedPenghuniRecord,
  Pagination,
  RESIDENTS_PER_PAGE,
} from "./extract-review-shared";

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
              <tr key={`${resident.sourceSheet}-${resident.sourceRow}`}>
                <td className="px-5 py-4">
                  <input
                    type="checkbox"
                    checked={selectedKeySet.has(getPenghuniRecordKey(resident))}
                    className="h-4 w-4 accent-dark-blue"
                    onChange={(event) =>
                      toggleSelectedRow(
                        getPenghuniRecordKey(resident),
                        event.target.checked,
                      )
                    }
                  />
                </td>
                <td className="px-4 py-4">
                  <p className="font-extrabold text-[#172033]">{resident.nama}</p>
                  <p className="text-[10px] font-semibold text-[#667085]">
                    {resident.noKadPengenalan}
                  </p>
                </td>
                <td className="whitespace-pre-line px-4 py-4">
                  {[resident.kuarters, resident.unit, resident.alamatKuarters]
                    .filter(Boolean)
                    .join("\n")}
                </td>
                <td className="whitespace-pre-line px-4 py-4">
                  {resident.perhubungan || "-"}
                </td>
                <td className="whitespace-pre-line px-4 py-4">
                  {[resident.pekerjaan, resident.jabatan].filter(Boolean).join("\n")}
                </td>
                <td className="px-4 py-4 text-center">
                  <Icon
                    icon="visibility"
                    size={17}
                    weight={700}
                    className="text-dark-blue"
                  />
                </td>
              </tr>
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

function getPenghuniRecordKey(record: ExtractedPenghuniRecord) {
  return (
    record.residentId ??
    `${record.noKadPengenalan}-${record.sourceSheet}-${record.sourceRow}`
  );
}
