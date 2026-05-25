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
import type { GlobalFixedNotice } from "@/app/components/Message/GlobalFixedMessage";

type ReviewTableProps = {
  kind: ReviewKind;
  bayaranRecords: ExtractedBayaranRecord[];
  onBayaranTotalAmountChange?: (totalAmount: string) => void;
  onBayaranRecordsChange?: (
    records: ExtractedBayaranRecord[],
    totalAmount: string,
  ) => ExtractedBayaranRecord | void | Promise<ExtractedBayaranRecord | void>;
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
  onKuartersCategoryDelete?: (params: { categoryId: string }) => Promise<void>;
  onKuartersUnitDelete?: (params: {
    categoryId: string;
    unitId: string;
  }) => Promise<void>;
  tunggakanRecords: ExtractedTunggakanRecord[];
  onTunggakanRecordsChange?: (
    records: ExtractedTunggakanRecord[],
    totalAmount: string,
  ) => ExtractedTunggakanRecord | void | Promise<ExtractedTunggakanRecord | void>;
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
  onNotice?: (tone: GlobalFixedNotice["tone"], message: string) => void;
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
  onKuartersCategoryDelete,
  onKuartersUnitDelete,
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
          .map((record) => record.arrearsSummaryId ?? `${record.noKadPengenalan}-${record.nama}`)
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
      onCategoryDelete={onKuartersCategoryDelete}
      onUnitDelete={onKuartersUnitDelete}
      selectedKeys={selectedKeys}
      onSelectedKeysChange={onSelectedKeysChange}
    />
  );
}
