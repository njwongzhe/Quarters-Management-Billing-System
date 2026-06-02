import {
  buildPaginationItems,
  PaginationControls,
} from "@/app/components/Pagination/Pagination";

type AuditPagination = {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  firstRecord: number;
  lastRecord: number;
  perPage: number;
};

export default function AuditLogPagination({
  pagination,
  onPageChange,
}: {
  pagination: AuditPagination;
  onPageChange: (page: number) => void;
}) {
  const startIndex = Math.max(0, pagination.firstRecord - 1);
  const endIndex = pagination.lastRecord;

  return (
    <footer className="border-t border-light-grey/20 bg-white px-4 py-4 sm:px-5 max-lg:min-w-245">
      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalRecords={pagination.totalRecords}
        paginationItems={buildPaginationItems(
          pagination.currentPage,
          pagination.totalPages,
        )}
        onPageChange={(action, pageNum) => {
          if (action === "prev") {
            onPageChange(Math.max(1, pagination.currentPage - 1));
            return;
          }

          if (action === "next") {
            onPageChange(
              Math.min(pagination.totalPages, pagination.currentPage + 1),
            );
            return;
          }

          if (pageNum) {
            onPageChange(pageNum);
          }
        }}
      />
    </footer>
  );
}
