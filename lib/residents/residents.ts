import type { Resident, ResidentStatus } from "@prisma/client";

export type AvailableResidentListItem = {
  id: string;
  icNumber: string;
  fullName: string;
  status: ResidentStatus;
  hasCurrentUnit: boolean;
};

export function mapAvailableResidentForApi(
  resident: Pick<Resident, "id" | "icNumber" | "fullName" | "status"> & {
    occupancies?: Array<{ id: string }>;
  },
): AvailableResidentListItem {
  return {
    id: resident.id,
    icNumber: resident.icNumber,
    fullName: resident.fullName,
    status: resident.status,
    hasCurrentUnit: (resident.occupancies?.length ?? 0) > 0,
  };
}