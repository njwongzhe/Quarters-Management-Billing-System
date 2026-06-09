import type {
  ExtractedBayaranRecord,
  ExtractedPenghuniRecord,
  ExtractedQuarterRecord,
  ExtractedTunggakanRecord,
} from "../../../../components/extract-review-shared";
import ReviewTable from "./ReviewTable";
import type { ReviewKind } from "./types";
import type { GlobalFixedNotice } from "@/app/components/Message/GlobalFixedMessage";

type ReviewPreviewPanelProps = {
  kind: ReviewKind;
  isLoading?: boolean;
  bayaranRecords: ExtractedBayaranRecord[];
  onBayaranTotalAmountChange?: (totalAmount: string) => void;
  onBayaranRecordsChange?: (
    records: ExtractedBayaranRecord[],
    totalAmount: string,
  ) => ExtractedBayaranRecord | void | Promise<ExtractedBayaranRecord | void>;
  bayaranParsingMode?: "strict" | "assisted";
  penghuniRecords: ExtractedPenghuniRecord[];
  penghuniParsingMode?: "strict" | "assisted";
  onPenghuniRecordsChange?: (
    records: ExtractedPenghuniRecord[],
  ) => ExtractedPenghuniRecord | void | Promise<ExtractedPenghuniRecord | void>;
  onPenghuniRecordDelete?: (record: ExtractedPenghuniRecord) => Promise<void>;
  kuartersRecords: ExtractedQuarterRecord[];
  kuartersParsingMode?: "strict" | "assisted";
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
  onKuartersCategoryDelete?: (params: { categoryId: string }) => Promise<void>;
  onKuartersUnitDelete?: (params: {
    categoryId: string;
    unitId: string;
  }) => Promise<void>;
  tunggakanRecords: ExtractedTunggakanRecord[];
  tunggakanParsingMode?: "strict" | "assisted";
  onTunggakanRecordsChange?: (
    records: ExtractedTunggakanRecord[],
    totalAmount: string,
  ) => ExtractedTunggakanRecord | void | Promise<ExtractedTunggakanRecord | void>;
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
  onNotice?: (tone: GlobalFixedNotice["tone"], message: string) => void;
  onFilteredStatsChange?: (stats: {
    recordCount?: number;
    totalAmount?: string;
    totalUnits?: number;
    categoryCount?: number;
  }) => void;
};

export default function ReviewPreviewPanel(props: ReviewPreviewPanelProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE7FF] bg-light-blue shadow-sm">
      <ReviewTable {...props} />
    </div>
  );
}

