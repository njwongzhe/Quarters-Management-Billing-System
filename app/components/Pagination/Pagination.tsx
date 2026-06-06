import { useEffect, useState } from "react";

// Helper function to manage pagination state and logic.
export function usePaginationLogic(totalItems: number, itemsPerPage: number) {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

    useEffect(() => {
        setCurrentPage((previousPage) => Math.min(previousPage, totalPages));
    }, [totalPages]);

    const handlePageChange = (nextPage: number) => {
        setCurrentPage(Math.max(1, Math.min(nextPage, totalPages)));
    };

    return { currentPage, totalPages, startIndex, endIndex, handlePageChange, setCurrentPage };
}

// PaginationControls component.
export function PaginationControls({
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    totalRecords,
    onPageChange,
    disabled = false,
}: {
    currentPage: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
    totalRecords: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
}) {
    // 处理输入框逻辑，移除浏览器默认的上下箭头样式
    const [inputValue, setInputValue] = useState(currentPage.toString());

    useEffect(() => { setInputValue(currentPage.toString()); }, [currentPage]);

    const isDisabled = disabled || totalRecords === 0;

    const goToPage = (nextPage: number) => {
        const safePage = Math.max(1, Math.min(nextPage, totalPages));
        if (safePage === currentPage) return;
        onPageChange(safePage);
    };

    const handleBlur = () => {
        const val = parseInt(inputValue);
        if (!isNaN(val)) {
            goToPage(val);
        }
        else setInputValue(currentPage.toString());
    };

    const btnClass = "flex h-8 w-8 items-center justify-center rounded-md border border-light-grey/30 bg-white text-grey hover:border-dark-blue hover:text-dark-blue disabled:opacity-30 disabled:pointer-events-none";

    return (
        <div className="flex flex-row items-center justify-between w-full gap-4">
            <div className="flex flex-row items-center gap-1.5">
                <button className={btnClass} onClick={() => goToPage(1)} disabled={isDisabled || currentPage === 1}>«</button>
                <button className={btnClass} onClick={() => goToPage(currentPage - 1)} disabled={isDisabled || currentPage === 1}>‹</button>

                <button 
                    className={btnClass} 
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={isDisabled || currentPage <= 1}
                >
                    {currentPage > 1 ? currentPage - 1 : ""}
                </button>

                <input
                    type="text"
                    inputMode="numeric"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
                    onBlur={handleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                    disabled={isDisabled}
                    className="h-8 w-10 rounded-md border-2 bg-dark-blue border-dark-blue text-white text-center font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />

                <button 
                    className={btnClass} 
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={isDisabled || currentPage >= totalPages}
                >
                    {currentPage < totalPages ? currentPage + 1 : ""}
                </button>

                <button className={btnClass} onClick={() => goToPage(currentPage + 1)} disabled={isDisabled || currentPage === totalPages}>›</button>
                <button className={btnClass} onClick={() => goToPage(totalPages)} disabled={isDisabled || currentPage === totalPages}>»</button>
            </div>

            <div className="text-xs text-grey">
                Memaparkan <span className="font-bold">{totalRecords === 0 ? 0 : startIndex + 1}</span> - <span className="font-bold">{endIndex}</span> Daripada <span className="font-bold">{totalRecords}</span> Rekod
            </div>
        </div>
    );
}