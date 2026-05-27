type SearchingDetailDataOverlayProps = {
  mode: "loading" | "warning";
  loadingMessage?: string;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function SearchingDetailDataOverlay({
  mode,
  loadingMessage = "Loading...",
  title = "Maklumat Tidak Dapat Dipaparkan",
  message = "Data tidak dapat dimuatkan buat masa ini.",
  onRetry,
  retryLabel = "Cuba Lagi",
}: SearchingDetailDataOverlayProps) {
  if (mode === "loading") {
    return (
      <div className="p-6 bg-light-blue overflow-y-auto">
        <div className="flex min-h-108 items-center justify-center">
          <div className="text-center">
            <div
              className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-dark-blue/20 border-t-dark-blue"
              aria-hidden="true"
            />
            <p className="mt-4 text-sm font-semibold text-grey">
              {loadingMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-light-blue overflow-y-auto">
      <div className="flex min-h-108 items-center justify-center">
        <div className="w-full max-w-md rounded-xl border border-red/20 bg-white p-6 text-center">
          <h4 className="text-lg font-extrabold text-dark-grey">
            {title}
          </h4>
          <p className="mt-2 text-sm leading-6 text-grey">{message}</p>
          {onRetry ? (
            <button
              type="button"
              className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-dark-blue px-4 py-2 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
              onClick={onRetry}
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
