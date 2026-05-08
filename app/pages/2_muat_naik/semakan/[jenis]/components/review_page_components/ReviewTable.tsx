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

type ReviewTableProps = {
  kind: ReviewKind;
  bayaranRecords: ExtractedBayaranRecord[];
  onBayaranTotalAmountChange?: (totalAmount: string) => void;
  onBayaranRecordsChange?: (
    records: ExtractedBayaranRecord[],
    totalAmount: string,
  ) => void;
  penghuniRecords: ExtractedPenghuniRecord[];
  kuartersRecords: ExtractedQuarterRecord[];
  onKuartersRecordsChange?: (records: ExtractedQuarterRecord[]) => Promise<void>;
  tunggakanRecords: ExtractedTunggakanRecord[];
  onTunggakanRecordsChange?: (
    records: ExtractedTunggakanRecord[],
    totalAmount: string,
  ) => void;
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
};

export default function ReviewTable({
  kind,
  bayaranRecords,
  onBayaranTotalAmountChange,
  onBayaranRecordsChange,
  penghuniRecords,
  kuartersRecords,
  onKuartersRecordsChange,
  tunggakanRecords,
  onTunggakanRecordsChange,
  selectedKeys,
  onSelectedKeysChange,
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
        selectedKeys={selectedKeys}
        onSelectedKeysChange={onSelectedKeysChange}
      />
    );
  }

  return (
    <KuartersReviewTable
      key={kuartersRecords.map((record) => record.categoryId ?? record.id).join("|")}
      records={kuartersRecords}
      onRecordsChange={onKuartersRecordsChange}
      selectedKeys={selectedKeys}
      onSelectedKeysChange={onSelectedKeysChange}
    />
  );
}
