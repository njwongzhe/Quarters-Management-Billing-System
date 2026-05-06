import { useEffect, useState } from "react";
import Icon from "@/app/components/Icon";

// Pagination management function.
export function usePaginationLogic(totalItems: number, itemsPerPage: number) {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

    // Adjust page if out of range.
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalItems, currentPage, totalPages]);

    const handlePageChange = (action: 'prev' | 'next' | 'goto', pageNum?: number) => {
        switch (action) {
            case 'prev':
                setCurrentPage(prev => Math.max(prev - 1, 1));
                break;
            case 'next':
                setCurrentPage(prev => Math.min(prev + 1, totalPages));
                break;
            case 'goto':
                if (pageNum !== undefined && pageNum >= 1 && pageNum <= totalPages) {
                    setCurrentPage(pageNum);
                }
                break;
        }
    };

    const getPaginationItems = () => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (currentPage <= 3) {
            return currentPage === 3
                ? [1, 2, 3, 4, "ellipsis", totalPages]
                : [1, 2, 3, "ellipsis", totalPages];
        }
        if (currentPage >= totalPages - 2) {
            return currentPage === totalPages - 2
                ? [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
                : [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
    };

    return {
        currentPage,
        totalPages,
        startIndex,
        endIndex,
        handlePageChange,
        paginationItems: getPaginationItems() as (number | "ellipsis")[],
    };
}

// PaginationControls component.
export function PaginationControls({
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    totalRecords,
    paginationItems,
    onPageChange,
}: {
    currentPage: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
    totalRecords: number;
    paginationItems: (number | "ellipsis")[];
    onPageChange: (action: 'prev' | 'next' | 'goto', pageNum?: number) => void;
}) {
    const PageButtonComponent = ({ item, currentPage, onPageChange }: { item: number | "ellipsis"; currentPage: number; onPageChange: (action: 'prev' | 'next' | 'goto', pageNum?: number) => void }) => {
        if (item === "ellipsis") {
            return (
                <span className="px-1 text-sm font-semibold text-grey" aria-hidden="true">
                    ...
                </span>
            );
        }

        const isActive = item === currentPage;

        return (
            <button
                type="button"
                className={`min-h-8 min-w-8 rounded-md border px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    isActive
                        ? "border-dark-blue bg-dark-blue font-bold text-white"
                        : "border-light-grey/30 bg-white text-grey hover:border-dark-blue hover:text-dark-blue"
                }`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onPageChange('goto', item)}
            >
                {item}
            </button>
        );
    };

    return (
        <div className="flex flex-row items-center justify-between w-full">
            {/* Pagination Buttons */}
            <div className="flex flex-row items-center gap-2">
                {/* Previous Button */}
                <button
                    type="button"
                    onClick={() => onPageChange('prev')}
                    disabled={currentPage === 1}
                    className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-light-grey/30 bg-white text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Halaman sebelumnya"
                >
                    <Icon icon="chevronLeft" size={18} />
                </button>

                {/* Page Buttons */}
                {paginationItems.map((item, index) => (
                    <PageButtonComponent key={`${item}-${index}`} item={item} currentPage={currentPage} onPageChange={onPageChange} />
                ))}

                {/* Next Button */}
                <button
                    type="button"
                    onClick={() => onPageChange('next')}
                    disabled={currentPage === totalPages}
                    className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-light-grey/30 bg-white text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Halaman seterusnya"
                >
                    <Icon icon="chevronRight" size={18} />
                </button>
            </div>

            {/* Displaying Record Range Info */}
            <div className="text-xs text-grey">
                Memaparkan <span className="font-bold">{startIndex + 1}</span> - <span className="font-bold">{endIndex}</span> Daripada <span className="font-bold">{totalRecords}</span> Rekod
            </div>
        </div>
    );
}
