import type { Prisma } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";

import { prisma } from "@/lib/prisma";

export type ResidentsQuarterInfo = {
  unitCode: string;
  quarterName: string;
  address: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  unitId?: string;
  categoryId?: string;
};

export type ResidentsArrearsInfo = {
  totalArrearsAmount: number | null;
};

export type ResidentRecord = {
  id: string;
  fullName: string;
  icNumber: string;
  phone: string | null;
  email: string | null;
  position: string | null;
  department: string | null;
  serviceLevel: string | null;
  status: string;
  description: string | null;
  updatedAt: string;
  quarters: ResidentsQuarterInfo | null;
  totalArrearsAmount: ResidentsArrearsInfo | null;
};

export type PenghuniHeaderProps = {
  residents: ResidentRecord[];
};

export type PenghuniTableProps = {
  residents: ResidentRecord[];
  isLoading: boolean;
  errorMessage: string | null;
  setResidents: Dispatch<SetStateAction<ResidentRecord[]>>;
  onFilteredResidentsChange: (rows: ResidentRecord[]) => void;
};

export const residentRecordSelect = {
  id: true,
  fullName: true,
  icNumber: true,
  phone: true,
  email: true,
  position: true,
  department: true,
  serviceLevel: true,
  status: true,
  description: true,
  updatedAt: true,
  occupancies: {
    where: {
      status: "CURRENT",
    },
    orderBy: {
      moveInDate: "desc",
    },
    take: 1,
    select: {
      moveInDate: true,
      moveOutDate: true,
      unit: {
        select: {
          id: true,
          categoryId: true,
          unitCode: true,
          quarterCategory: {
            select: {
              categoryName: true,
              address: true,
            },
          },
        },
      },
    },
  },
  arrearsSummary: {
    select: {
      totalArrearsAmount: true,
    },
  },
} satisfies Prisma.ResidentSelect;

type ResidentRecordQuery = Prisma.ResidentGetPayload<{
  select: typeof residentRecordSelect;
}>;

export async function getResidentsList(query = ""): Promise<ResidentRecord[]> {
  const normalizedQuery = query.trim();
  const strippedQuery = normalizedQuery.replace(/-/g, "");
  const residents = await prisma.resident.findMany({
    where: {
      ...(normalizedQuery.length > 0
        ? {
            OR: [
              {
                fullName: {
                  contains: normalizedQuery,
                  mode: "insensitive" as const,
                },
              },
              {
                icNumber: {
                  contains: strippedQuery,
                  mode: "insensitive" as const,
                },
              },
              {
                phone: {
                  contains: normalizedQuery,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: normalizedQuery,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ fullName: "asc" }, { icNumber: "asc" }],
    select: residentRecordSelect,
  });

  return residents.map(mapResidentRecord);
}

export function mapResidentRecord(
  resident: ResidentRecordQuery,
): ResidentRecord {
  const occupancy = resident.occupancies[0];

  return {
    id: resident.id,
    fullName: resident.fullName,
    icNumber: resident.icNumber,
    phone: resident.phone ?? null,
    email: resident.email ?? null,
    position: resident.position ?? null,
    department: resident.department ?? null,
    serviceLevel: resident.serviceLevel ?? null,
    status: resident.status,
    description: resident.description ?? null,
    updatedAt: resident.updatedAt.toISOString(),
    quarters: occupancy
      ? {
          unitCode: occupancy.unit.unitCode,
          quarterName: occupancy.unit.quarterCategory.categoryName,
          address: occupancy.unit.quarterCategory.address ?? null,
          moveInDate: occupancy.moveInDate.toISOString(),
          moveOutDate: occupancy.moveOutDate?.toISOString() ?? null,
          unitId: occupancy.unit.id,
          categoryId: occupancy.unit.categoryId,
        }
      : null,
    totalArrearsAmount: resident.arrearsSummary
      ? {
          totalArrearsAmount: Number(
            resident.arrearsSummary.totalArrearsAmount ?? 0,
          ),
        }
      : null,
  };
}
