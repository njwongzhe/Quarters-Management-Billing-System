import type {
  ExtractedBayaranRecord,
  ExtractedPenghuniRecord,
  ExtractedQuarterRecord,
  ExtractedTunggakanRecord,
} from "../../../../components/extract-review-shared";
import BayaranReviewTable from "../bayaran_components";
import KuartersReviewTable from "../kuarters_components";
import PenghuniReviewTable from "../penghuni_components";
import TunggakanReviewTable from "../tunggakan_components";
import type { ReviewKind } from "./types";
import type { KuartersNotice } from "@/app/pages/7_kuarters/components/kuartersHelpers";

type ReviewTableProps = {
  kind: ReviewKind;
  bayaranRecords: ExtractedBayaranRecord[];
  onBayaranTotalAmountChange?: (totalAmount: string) => void;
  onBayaranRecordsChange?: (
    records: ExtractedBayaranRecord[],
    totalAmount: string,
  ) => void;
  penghuniRecords: ExtractedPenghuniRecord[];
  onPenghuniRecordsChange?: (
    records: ExtractedPenghuniRecord[],
  ) => ExtractedPenghuniRecord | void | Promise<ExtractedPenghuniRecord | void>;
  onPenghuniRecordDelete?: (record: ExtractedPenghuniRecord) => Promise<void>;
  kuartersRecords: ExtractedQuarterRecord[];
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

export default function ReviewTable({
  kind,
  bayaranRecords,
  onBayaranTotalAmountChange,
  onBayaranRecordsChange,
  penghuniRecords,
  onPenghuniRecordsChange,
  onPenghuniRecordDelete,
  kuartersRecords,
  onKuartersRecordsChange,
  onKuartersCategoryChange,
  onKuartersUnitChange,
  tunggakanRecords,
  onTunggakanRecordsChange,
  selectedKeys,
  onSelectedKeysChange,
  onNotice,
}: ReviewTableProps) {
  if (kind === "bayaran") {
    return (
      <BayaranReviewTable
        key={bayaranRecords
          .map(
            (record) =>
              record.paymentId ??
              `${record.page}-${record.bil}-${record.noGajiNoKp}`,
          )
          .join("|")}
        records={bayaranRecords}
        onTotalAmountChange={onBayaranTotalAmountChange}
        onRecordsChange={onBayaranRecordsChange}
        selectedKeys={selectedKeys}
        onSelectedKeysChange={onSelectedKeysChange}
      />
    );
  }

  if (kind === "tunggakan") {
    return (
      <TunggakanReviewTable
        key={tunggakanRecords
          .map((record) => record.arrearsSummaryId ?? record.sourceRow)
          .join("|")}
        records={tunggakanRecords}
        onRecordsChange={onTunggakanRecordsChange}
        selectedKeys={selectedKeys}
        onSelectedKeysChange={onSelectedKeysChange}
      />
    );
  }

  if (kind === "penghuni") {
    return (
      <PenghuniReviewTable
        records={penghuniRecords}
        onRecordsChange={onPenghuniRecordsChange}
        onRecordDelete={onPenghuniRecordDelete}
        selectedKeys={selectedKeys}
        onSelectedKeysChange={onSelectedKeysChange}
        onNotice={onNotice}
      />
    );
  }

  return (
    <KuartersReviewTable
      key={kuartersRecords.map((record) => record.categoryId ?? record.id).join("|")}
      records={kuartersRecords}
      onRecordsChange={onKuartersRecordsChange}
      onCategoryChange={onKuartersCategoryChange}
      onUnitChange={onKuartersUnitChange}
      selectedKeys={selectedKeys}
      onSelectedKeysChange={onSelectedKeysChange}
    />
  );
}
