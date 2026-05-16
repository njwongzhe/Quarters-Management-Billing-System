import Icon from "../../../../../../components/Icon/Icon";
import type {
  ExtractedBayaranRecord,
  ExtractedPenghuniRecord,
  ExtractedQuarterRecord,
  ExtractedTunggakanRecord,
  KuartersExtractResult,
  PenghuniExtractResult,
} from "../../../../components/extract-review-shared";
import ReviewTable from "./ReviewTable";
import type { ReviewKind } from "./types";
import type { KuartersNotice } from "@/app/pages/7_kuarters/components/kuartersHelpers";

type ReviewPreviewPanelProps = {
  kind: ReviewKind;
  isLoading?: boolean;
  bayaranRecords: ExtractedBayaranRecord[];
  onBayaranTotalAmountChange?: (totalAmount: string) => void;
  onBayaranRecordsChange?: (
    records: ExtractedBayaranRecord[],
    totalAmount: string,
  ) => void;
  penghuniRecords: ExtractedPenghuniRecord[];
  penghuniParsingMode?: PenghuniExtractResult["parsingMode"];
  onPenghuniRecordsChange?: (
    records: ExtractedPenghuniRecord[],
  ) => ExtractedPenghuniRecord | void | Promise<ExtractedPenghuniRecord | void>;
  onPenghuniRecordDelete?: (record: ExtractedPenghuniRecord) => Promise<void>;
  kuartersRecords: ExtractedQuarterRecord[];
  kuartersParsingMode?: KuartersExtractResult["parsingMode"];
  onKuartersRecordsChange?: (records: ExtractedQuarterRecord[]) => Promise<void>;
  onKuartersCategoryChange?: (params: {
    categoryId: string;
    categoryName: string;
    address: string;
    rentalPrice: string;
    maintenancePrice: string;
    penaltyPrice: string;
  }) => Promise<void>;
  onKuartersUnitChange?: (params: {
    categoryId: string;
    unitId: string;
    unitCode: string;
  }) => Promise<void>;
  tunggakanRecords: ExtractedTunggakanRecord[];
  onTunggakanRecordsChange?: (
    records: ExtractedTunggakanRecord[],
    totalAmount: string,
  ) => void;
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
  onNotice?: (tone: KuartersNotice["tone"], message: string) => void;
};

export default function ReviewPreviewPanel(props: ReviewPreviewPanelProps) {
  return (
    <div className="mb-10 overflow-hidden rounded-xl border border-[#DCE7FF] bg-light-blue shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-5">
        <div>
          <h2 className="text-lg font-extrabold text-[#07162F]">
            Pratinjau Data Ekstrak
          </h2>
          <p className="text-xs font-medium text-[#344054]">
            Sila semak maklumat sebelum pengesahan.
          </p>
        </div>
        {props.kind === "kuarters" || props.kind === "penghuni" ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold">
            <span className="rounded border border-[#C9D6F2] bg-white px-3 py-1 text-dark-blue">
              {(props.kind === "kuarters"
                ? props.kuartersParsingMode
                : props.penghuniParsingMode) === "assisted"
                ? "Mod Bantuan AI"
                : "Mod Ketat"}
            </span>
          </div>
        ) : (
          <Icon icon="filter_alt" size={22} weight={500} className="text-[#667085]" />
        )}
      </div>
      <div className="px-2 pb-2">
        {props.isLoading ? <ReviewTableLoading /> : <ReviewTable {...props} />}
      </div>
    </div>
  );
}

function ReviewTableLoading() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-xl border border-light-grey/20 bg-white px-6 py-16 text-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-light-grey/40 border-t-dark-blue"
        aria-hidden="true"
      />
      <div>
        <p className="text-sm font-extrabold text-dark-blue">
          Memuatkan data semakan...
        </p>
        <p className="mt-1 text-xs font-medium text-grey">
          Sila tunggu sebentar sementara rekod disediakan.
        </p>
      </div>
    </div>
  );
}
