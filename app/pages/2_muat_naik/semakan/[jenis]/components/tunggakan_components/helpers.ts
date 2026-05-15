import type { ExtractedTunggakanRecord } from "../../../../components/extract-review-shared";

export function getTunggakanRowKey(row: ExtractedTunggakanRecord) {
  return row.arrearsSummaryId ?? `${row.noKadPengenalan}-${row.nama}`;
}
