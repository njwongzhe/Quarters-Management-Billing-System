import type { Resident, ResidentStatus } from "@prisma/client";

import {
  getTodayStartInMalaysia,
  isDateWithinOccupancy,
} from "@/lib/quarters/quarter-units";

export type AvailableResidentOccupancyRange = {
  id: string;
  unitId: string;
  moveInDate: string;
  moveOutDate: string | null;
  status: "CURRENT" | "PAST";
};

export type AvailableResidentListItem = {
  id: string;
  icNumber: string;
  fullName: string;
  status: ResidentStatus;
  hasCurrentUnit: boolean;
  occupancyRanges: AvailableResidentOccupancyRange[];
};

export function mapAvailableResidentForApi(
  resident: Pick<Resident, "id" | "icNumber" | "fullName" | "status"> & {
    occupancies?: Array<{
      id: string;
      unitId: string;
      moveInDate: Date;
      moveOutDate: Date | null;
      status: "CURRENT" | "PAST";
    }>;
  },
): AvailableResidentListItem {
  const referenceDate = getTodayStartInMalaysia();
  const occupancyRanges = (resident.occupancies ?? []).map((occupancy) => ({
    id: occupancy.id,
    unitId: occupancy.unitId,
    moveInDate: occupancy.moveInDate.toISOString(),
    moveOutDate: occupancy.moveOutDate?.toISOString() ?? null,
    status: occupancy.status,
  }));

  return {
    id: resident.id,
    icNumber: resident.icNumber,
    fullName: resident.fullName,
    status: resident.status,
    hasCurrentUnit: occupancyRanges.some((occupancy) =>
      isDateWithinOccupancy({
        moveInDate: new Date(occupancy.moveInDate),
        moveOutDate: occupancy.moveOutDate ? new Date(occupancy.moveOutDate) : null,
        referenceDate,
      }),
    ),
    occupancyRanges,
  };
}
