"use client";

import {
  PaginationControls,
} from "@/app/components/Pagination/Pagination";

export default function BayaranPagination({
  currentPage,
  firstVisibleRecord,
  lastVisibleRecord,
  onPageChange,
  totalPages,
  totalRecordCount,
}: {
  currentPage: number;
  firstVisibleRecord: number;
  lastVisibleRecord: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  totalRecordCount: number;
}) {
  return (
    <div className="border-t border-light-grey/20 bg-white px-4 py-4 sm:px-5">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={Math.max(0, firstVisibleRecord - 1)}
        endIndex={lastVisibleRecord}
        totalRecords={totalRecordCount}
        onPageChange={onPageChange}
      />
    </div>
  );
}
