import {
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
        onPageChange={onPageChange}
      />
    </footer>
  );
}
