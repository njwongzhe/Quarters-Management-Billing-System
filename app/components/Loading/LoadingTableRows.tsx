type LoadingTableRowsMode = "loading" | "message";

type LoadingTableRowsProps = {
  mode: LoadingTableRowsMode;
  columnCount: number;
  message?: string;
  rowCount: number;
};

// Reusable table-state renderer for loading skeleton rows and single-row messages.
export function loadingTableRows({
  mode,
  columnCount,
  message = "",
  rowCount,
}: LoadingTableRowsProps) {
  if (mode === "message") {
    return (
      <tr className="border-t border-light-grey/20">
        <td
          colSpan={columnCount}
          className="px-3 py-4 text-center text-sm font-medium text-grey"
        >
          {message}
        </td>
      </tr>
    );
  }

  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <tr key={rowIndex} className="border-t border-light-grey/20">
          {Array.from({ length: columnCount }, (_, columnIndex) => (
            <td key={`${rowIndex}-${columnIndex}`} className="px-3 py-3">
              <div className="h-4 w-full animate-pulse rounded bg-light-blue" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
