"use client";

import { PaginationControls } from "@/app/components/Pagination/Pagination";
import type { BayaranPaginationItem } from "@/lib/payments/bayaran-types";

export default function BayaranPagination({
  currentPage,
  firstVisibleRecord,
  lastVisibleRecord,
  onPageChange,
  totalPages,
  totalRecordCount,
  visiblePages,
}: {
  currentPage: number;
  firstVisibleRecord: number;
  lastVisibleRecord: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  totalRecordCount: number;
  visiblePages: BayaranPaginationItem[];
}) {
  return (
    <div className="border-t border-[#EEF1F7] px-6 py-4">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={Math.max(0, firstVisibleRecord - 1)}
        endIndex={lastVisibleRecord}
        totalRecords={totalRecordCount}
        paginationItems={visiblePages}
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
