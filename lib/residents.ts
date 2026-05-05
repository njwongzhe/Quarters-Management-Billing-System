import type { Resident, ResidentStatus } from "@prisma/client";

export type AvailableResidentListItem = {
  id: string;
  icNumber: string;
  fullName: string;
  status: ResidentStatus;
};

export function mapAvailableResidentForApi(
  resident: Pick<Resident, "id" | "icNumber" | "fullName" | "status">,
): AvailableResidentListItem {
  return {
    id: resident.id,
    icNumber: resident.icNumber,
    fullName: resident.fullName,
    status: resident.status,
  };
}
