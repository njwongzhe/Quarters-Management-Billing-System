import Icon from "../../../components/Icon";
import type { Category } from "./types";

const kuartersSampleDocuments = [
  "/sample-documents/Quarters_Sample.pdf",
  "/sample-documents/Quarters_Sample.xlsx",
];

type DemoDocumentButtonProps = {
  activeCategory: Category;
};

export default function DemoDocumentButton({
  activeCategory,
}: DemoDocumentButtonProps) {
  const canDownload = activeCategory === "Kuarters";

  function handleDownloadSamples() {
    if (!canDownload) {
      return;
    }

    kuartersSampleDocuments.forEach((href) => {
      const link = document.createElement("a");
      link.href = href;
      link.download = href.split("/").pop() ?? "";
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  return (
    <button
      type="button"
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#DCE2F1] bg-white px-5 text-xs font-extrabold text-dark-blue shadow-sm transition hover:border-[#C8D2EA] hover:bg-[#FBFCFF] disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!canDownload}
      onClick={handleDownloadSamples}
    >
      <Icon icon="download" size={17} weight={600} />
      Sample Document
    </button>
  );
}
