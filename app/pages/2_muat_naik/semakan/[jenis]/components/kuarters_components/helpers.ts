import type { ExtractedQuarterRecord } from "../../../../components/extract-review-shared";

export function getKuartersRecordKey(record: ExtractedQuarterRecord) {
  return record.categoryId ?? record.id;
}

export function getUnitKey(unit: {
  unitId?: string;
  unitCode: string;
}) {
  return unit.unitId ?? unit.unitCode;
}
