"use client";

import {
  buildPaginationItems,
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
        paginationItems={buildPaginationItems(currentPage, totalPages)}
        onPageChange={(action, pageNum) => {
          const nextPage =
            action === "prev"
              ? Math.max(1, currentPage - 1)
              : action === "next"
                ? Math.min(totalPages, currentPage + 1)
                : pageNum;

          if (!nextPage || nextPage === currentPage) {
            return;
          }

          onPageChange(nextPage);
        }}
      />
    </div>
  );
}
