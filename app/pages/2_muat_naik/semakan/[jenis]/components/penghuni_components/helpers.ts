import type { ExtractedPenghuniRecord } from "../../../../components/extract-review-shared";

export function getPenghuniRecordKey(record: ExtractedPenghuniRecord) {
  return record.residentId ?? record.noKadPengenalan;
}
