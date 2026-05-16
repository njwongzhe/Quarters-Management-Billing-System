"use client";

import { useState } from "react";
import { PatternFormat } from "react-number-format";

import Icon from "@/app/components/Icon/Icon";
import KuartersFeedbackBanner from "@/app/pages/7_kuarters/components/KuartersFeedbackBanner";
import type { KuartersNotice } from "@/app/pages/7_kuarters/components/kuartersHelpers";
import { PaginationControls, usePaginationLogic } from "@/app/components/Pagination/Pagination";
import type { ExtractedPenghuniRecord } from "../../../../components/extract-review-shared";
import { getPenghuniRecordKey } from "./helpers";
import PenghuniReviewDetail from "./PenghuniReviewDetail";

const mainTextSize = "text-[12px]";
const subTextSize = "text-[11px]";

type PenghuniReviewTableProps = {
  records: ExtractedPenghuniRecord[];
  onRecordsChange?: (
    records: ExtractedPenghuniRecord[],
  ) => ExtractedPenghuniRecord | void | Promise<ExtractedPenghuniRecord | void>;
  onRecordDelete?: (record: ExtractedPenghuniRecord) => void | Promise<void>;
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
  onNotice?: (tone: KuartersNotice["tone"], message: string) => void;
};

export default function PenghuniReviewTable({
  records,
  onRecordsChange,
  onRecordDelete,
  selectedKeys = [],
  onSelectedKeysChange,
  onNotice,
}: PenghuniReviewTableProps) {
  const [selectedResident, setSelectedResident] =
    useState<ExtractedPenghuniRecord | null>(null);
  const [notice, setNotice] = useState<KuartersNotice | null>(null);
  const itemsPerPage = 10;
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    handlePageChange,
    paginationItems,
  } = usePaginationLogic(records.length, itemsPerPage);
  const currentRecords = records.slice(startIndex, endIndex);
  const selectedKeySet = new Set(selectedKeys);
  const selectableRecordKeys = records
    .filter((record) => !record.isExisted)
    .map(getPenghuniRecordKey);
  const selectableRecordKeySet = new Set(selectableRecordKeys);
  const selectedSelectableKeys = selectedKeys.filter((key) =>
    selectableRecordKeySet.has(key),
  );
  const isAllSelected =
    selectableRecordKeys.length > 0 &&
    selectableRecordKeys.every((key) => selectedKeySet.has(key));
  const isPartiallySelected =
    selectedSelectableKeys.length > 0 && !isAllSelected;

  const showNotice = (tone: KuartersNotice["tone"], message: string) => {
    if (!onNotice) {
      setNotice({ tone, message });
    }
    onNotice?.(tone, message);
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

  const saveResident = async (updatedResident: ExtractedPenghuniRecord) => {
    const updatedResidentKey = getPenghuniRecordKey(updatedResident);
    const updatedIc = normalizeIc(updatedResident.noKadPengenalan);
    const duplicateRecord = records.find(
      (record) =>
        getPenghuniRecordKey(record) !== updatedResidentKey &&
        normalizeIc(record.noKadPengenalan) === updatedIc,
    );

    if (duplicateRecord) {
      showNotice(
        "error",
        `No. K/P ${updatedResident.noKadPengenalan} telah wujud dalam dokumen ini.`,
      );
      throw new Error(`No. K/P ${updatedResident.noKadPengenalan} telah wujud dalam dokumen ini.`);
    }

    const updatedRecords = records.map((record) =>
      getPenghuniRecordKey(record) === updatedResidentKey
        ? updatedResident
        : record,
    );

    const savedResident = await onRecordsChange?.(updatedRecords);
    setSelectedResident(savedResident ?? updatedResident);
    if (!onNotice) {
      showNotice("success", "Rekod penghuni berjaya dikemas kini.");
    }
  };

  const deleteResident = async (resident: ExtractedPenghuniRecord) => {
    const residentKey = getPenghuniRecordKey(resident);

    if (onRecordDelete) {
      await onRecordDelete(resident);
    } else {
      const nextRecords = records.filter(
        (record) => getPenghuniRecordKey(record) !== residentKey,
      );
      await onRecordsChange?.(nextRecords);
      showNotice("success", "Rekod penghuni berjaya dipadam.");
    }

    onSelectedKeysChange?.(selectedKeys.filter((key) => key !== residentKey));
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-light-blue p-1">
      <div className="rounded-lg overflow-x-auto overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="font-bold text-xs text-grey bg-background">
              <th className="text-left px-3 py-3 w-10 whitespace-nowrap">
                <input
                  type="checkbox"
                  aria-label="Pilih semua rekod penghuni"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = isPartiallySelected;
                    }
                  }}
                  disabled={selectableRecordKeys.length === 0}
                  className="h-4 w-4 accent-dark-blue"
                  onChange={(event) => toggleAllRows(event.target.checked)}
                />
              </th>
              <th className="text-left px-3 py-3 w-min whitespace-nowrap">Penghuni</th>
              <th className="text-left px-3 py-3 w-min whitespace-nowrap">
                Perhubungan
              </th>
              <th className="text-left px-3 py-3 w-min whitespace-nowrap">Pekerjaan</th>
              <th className="text-left px-3 py-3 w-min whitespace-nowrap">
                Taraf Perkhidmatan
              </th>
              <th className="text-left px-3 py-3 w-min whitespace-nowrap">Kuarters</th>
              <th className="text-center px-3 py-3 w-min whitespace-nowrap">
                Tindakan
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {records.length === 0 ? (
              <tr className="text-sm">
                <td className="px-3 py-4 text-center text-grey" colSpan={7}>
                  Tiada rekod penghuni baharu ditemui.
                </td>
              </tr>
            ) : (
              currentRecords.map((resident) => {
                const recordKey = getPenghuniRecordKey(resident);
                const isSelectable = !resident.isExisted;

                return (
                  <tr
                    key={recordKey}
                    className={[
                      "text-sm border-l-4 border-b border-b-light-grey/20",
                      resident.isExisted
                        ? "border-amber-400 bg-amber-50"
                        : "border-transparent",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2 text-left w-10 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelectable && selectedKeySet.has(recordKey)}
                        disabled={!isSelectable}
                        className="h-4 w-4 accent-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
                        onChange={(event) =>
                          isSelectable
                            ? toggleSelectedRow(recordKey, event.target.checked)
                            : undefined
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>{resident.nama}</div>
                      <div className={`font-extralight ${subTextSize} text-grey`}>
                        <PatternFormat
                          value={resident.noKadPengenalan}
                          format="######-##-####"
                          displayType="text"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>
                        {resident.perhubungan ? (
                          <PatternFormat
                            value={resident.perhubungan}
                            format="###-#### ####"
                            displayType="text"
                          />
                        ) : (
                          "N/A"
                        )}
                      </div>
                      <div className={`font-extralight ${subTextSize} text-grey`}>
                        {resident.gmail || "N/A"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>
                        {resident.pekerjaan || "N/A"}
                      </div>
                      <div className={`font-extralight ${subTextSize} text-grey`}>
                        {resident.jabatan || "N/A"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>
                        {resident.tarafPerkhidmatan || "N/A"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-left w-min whitespace-nowrap">
                      <div className={`font-bold ${mainTextSize}`}>
                        {resident.kuarters || "N/A"}
                      </div>
                      <div className={`font-extralight ${subTextSize} text-grey`}>
                        {formatQuarterAddress(resident)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center align-middle w-min whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          aria-label={`Lihat butiran ${resident.nama}`}
                          className="flex items-center justify-center"
                          onClick={() => setSelectedResident(resident)}
                        >
                          <Icon icon="eye" className="text-dark-blue" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {records.length > 0 ? (
            <tfoot>
              <tr>
                <td
                  colSpan={7}
                  className="bg-white border-t border-light-grey/20 px-3 py-4"
                >
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalRecords={records.length}
                    paginationItems={paginationItems}
                    onPageChange={handlePageChange}
                  />
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {selectedResident ? (
        <PenghuniReviewDetail
          resident={selectedResident}
          onClose={() => setSelectedResident(null)}
          onSave={saveResident}
          onDelete={deleteResident}
          onNotice={showNotice}
        />
      ) : null}
      {!onNotice ? (
        <KuartersFeedbackBanner notice={notice} onDismiss={() => setNotice(null)} />
      ) : null}
    </div>
  );
}

function formatQuarterAddress(resident: ExtractedPenghuniRecord) {
  if (resident.unit && resident.alamatKuarters) {
    return `${resident.unit}, ${resident.alamatKuarters}`;
  }

  return resident.unit || resident.alamatKuarters || "N/A";
}

function normalizeIc(value: string) {
  return value.replace(/\D/g, "");
}
