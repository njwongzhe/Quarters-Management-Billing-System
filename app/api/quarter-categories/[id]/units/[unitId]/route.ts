import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildQuarterUnitCurrentOccupancyInclude,
  buildQuarterUnitDeleteBlockedMessage,
  buildQuarterUnitDeletedMessage,
  buildQuarterUnitDuplicateMessage,
  buildQuarterUnitOccupancyConflictMessage,
  buildQuarterUnitResidentNotFoundMessage,
  buildQuarterUnitUpdatedMessage,
  getTodayStartInMalaysia,
  mapQuarterUnitDetailsForApi,
  mapQuarterUnitForApi,
  parseQuarterUnitUpdateBody,
  quarterUnitDetailsInclude,
  resolveQuarterUnitOccupancyState,
} from "@/lib/quarters/quarter-units";
import {
  formatAuditTarget,
  formatAuditValue,
  recordDataAuditLog,
} from "@/lib/audit/data-audit";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
    unitId: string;
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPrismaUniqueError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function isPrismaForeignKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2003"
  );
}

const changedFieldLabels: Record<
  "unitCode" | "occupant" | "moveInDate" | "moveOutDate",
  string
> = {
  unitCode: "Kod unit",
  occupant: "Penghuni",
  moveInDate: "Tarikh masuk",
  moveOutDate: "Tarikh keluar",
};

// Used to fetch the details of a specific quarter unit, including its current occupancy and occupancy history, for display in the unit details overlay.
export async function GET(_request: Request, context: RouteContext) {
  const { id, unitId } = await context.params;

  try {
    const unit = await prisma.unit.findFirst({
      where: { id: unitId },
      include: quarterUnitDetailsInclude,
    });

    if (!unit || unit.quarterCategory.id !== id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit kuarters tidak ditemui.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Maklumat unit kuarters berjaya diambil.",
      data: {
        unit: mapQuarterUnitDetailsForApi(unit),
      },
    });
  } catch (error) {
    console.error("Gagal mendapatkan maklumat unit kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa mendapatkan maklumat unit kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}

// Used to update the unit code and/or occupant of a quarter unit. Handles all necessary validations and business logic related to these updates, such as checking for duplicate unit codes, validating occupant IC numbers, and managing unit occupancies accordingly.
export async function PATCH(request: Request, context: RouteContext) {
  const { id, unitId } = await context.params;

  try {
    const currentAdmin = await getCurrentAdmin();
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Format JSON untuk permintaan kemas kini unit tidak sah.",
        },
        {
          status: 400,
        },
      );
    }

    const parsedBody = parseQuarterUnitUpdateBody(body);

    if (!parsedBody.ok) {
      return NextResponse.json(
        {
          success: false,
          message: parsedBody.message,
        },
        {
          status: 400,
        },
      );
    }

    const existingUnit = await prisma.unit.findFirst({
      where: { id: unitId },
      include: {
        ...buildQuarterUnitCurrentOccupancyInclude(),
        quarterCategory: {
          select: {
            id: true,
            categoryName: true,
          },
        },
      },
    });

    if (!existingUnit || existingUnit.quarterCategory.id !== id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit kuarters tidak ditemui.",
        },
        {
          status: 404,
        },
      );
    }

    const currentOccupancy = existingUnit.occupancies[0];
    const currentOccupantIcNumber = currentOccupancy?.resident.icNumber ?? null;
    const nextUnitCode = parsedBody.data.updates.unitCode ?? existingUnit.unitCode;
    const changedFields: Array<
      "unitCode" | "occupant" | "moveInDate" | "moveOutDate"
    > = [];
    const unitUpdateData: Prisma.UnitUpdateInput = {};
    const occupancyUpdateData: Prisma.UnitOccupancyUpdateInput = {};

    if (nextUnitCode !== existingUnit.unitCode) {
      const conflictingUnit = await prisma.unit.findFirst({
        where: {
          categoryId: id,
          unitCode: nextUnitCode,
          NOT: {
            id: unitId,
          },
        },
        select: {
          id: true,
        },
      });

      if (conflictingUnit) {
        return NextResponse.json(
          {
            success: false,
            message: buildQuarterUnitDuplicateMessage(nextUnitCode),
          },
          {
            status: 409,
          },
        );
      }

      changedFields.push("unitCode");
      unitUpdateData.unitCode = nextUnitCode;
    }

    let nextResident:
      | {
          id: string;
          fullName: string;
          icNumber: string;
        }
      | null = null;
    let shouldReplaceOccupancy = false;

    if (parsedBody.data.providedFields.occupantIcNumber) {
      const requestedOccupantIcNumber =
        parsedBody.data.updates.occupantIcNumber ?? null;

      if (requestedOccupantIcNumber === null) {
        if (currentOccupantIcNumber !== null || existingUnit.status !== "VACANT") {
          changedFields.push("occupant");
          shouldReplaceOccupancy = currentOccupantIcNumber !== null;
          unitUpdateData.status = "VACANT";
        }
      } else {
        if (requestedOccupantIcNumber !== currentOccupantIcNumber) {
          nextResident = await prisma.resident.findUnique({
            where: {
              icNumber: requestedOccupantIcNumber,
            },
            select: {
              id: true,
              fullName: true,
              icNumber: true,
            },
          });

          if (!nextResident) {
            return NextResponse.json(
              {
                success: false,
                message: buildQuarterUnitResidentNotFoundMessage(
                  requestedOccupantIcNumber,
                ),
              },
              {
                status: 404,
              },
            );
          }

          changedFields.push("occupant");
          shouldReplaceOccupancy = true;
        } else if (existingUnit.status !== "OCCUPIED") {
          changedFields.push("occupant");
        }
      }
    }

    if (parsedBody.data.providedFields.moveInDate) {
      if (!currentOccupancy && !nextResident) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Tarikh masuk hanya boleh dikemas kini selepas penghuni dipilih.",
          },
          {
            status: 400,
          },
        );
      }

      const nextMoveInDate = parsedBody.data.updates.moveInDate;

      if (
        nextMoveInDate &&
        (!currentOccupancy ||
          nextMoveInDate.getTime() !== currentOccupancy.moveInDate.getTime())
      ) {
        changedFields.push("moveInDate");
        occupancyUpdateData.moveInDate = nextMoveInDate;
      }
    }

    if (parsedBody.data.providedFields.moveOutDate) {
      if (!currentOccupancy && !nextResident) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Tarikh keluar hanya boleh dikemas kini selepas penghuni dipilih.",
          },
          {
            status: 400,
          },
        );
      }

      const nextMoveOutDate = parsedBody.data.updates.moveOutDate ?? null;
      const currentMoveOutTime = currentOccupancy?.moveOutDate?.getTime() ?? null;
      const nextMoveOutTime = nextMoveOutDate?.getTime() ?? null;

      if (nextMoveOutTime !== currentMoveOutTime) {
        changedFields.push("moveOutDate");
        occupancyUpdateData.moveOutDate = nextMoveOutDate;
      }
    }

    const nextOccupancyMoveInDate =
      parsedBody.data.updates.moveInDate ??
      currentOccupancy?.moveInDate ??
      (nextResident ? getTodayStartInMalaysia() : null);
    const nextOccupancyMoveOutDate = parsedBody.data.providedFields.moveOutDate
      ? (parsedBody.data.updates.moveOutDate ?? null)
      : (currentOccupancy?.moveOutDate ?? null);
    const nextOccupancyResidentId =
      nextResident?.id ?? currentOccupancy?.resident.id ?? null;
    const nextOccupancyState =
      nextOccupancyMoveInDate && nextOccupancyResidentId
        ? resolveQuarterUnitOccupancyState({
            moveInDate: nextOccupancyMoveInDate,
            moveOutDate: nextOccupancyMoveOutDate,
          })
        : null;

    if (nextOccupancyMoveInDate && nextOccupancyMoveOutDate) {
      if (nextOccupancyMoveOutDate.getTime() < nextOccupancyMoveInDate.getTime()) {
        return NextResponse.json(
          {
            success: false,
            message: "Tarikh keluar tidak boleh lebih awal daripada tarikh masuk.",
          },
          {
            status: 400,
          },
        );
      }
    }

    if (
      nextOccupancyResidentId &&
      nextOccupancyMoveInDate &&
      (parsedBody.data.providedFields.moveInDate ||
        parsedBody.data.providedFields.moveOutDate ||
        nextResident)
    ) {
      const overlappingResidentOccupancy =
        await findOverlappingResidentOccupancy({
          residentId: nextOccupancyResidentId,
          excludedOccupancyId: nextResident
            ? null
            : (currentOccupancy?.id ?? null),
          moveInDate: nextOccupancyMoveInDate,
          moveOutDate: nextOccupancyMoveOutDate,
        });

      if (overlappingResidentOccupancy) {
        return NextResponse.json(
          {
            success: false,
            message: buildQuarterUnitOccupancyConflictMessage(
              overlappingResidentOccupancy.resident.fullName,
              overlappingResidentOccupancy.resident.icNumber,
              overlappingResidentOccupancy.unit.unitCode,
              overlappingResidentOccupancy.unit.quarterCategory.categoryName,
            ),
            data: {
              unitCode: overlappingResidentOccupancy.unit.unitCode,
            },
          },
          {
            status: 409,
          },
        );
      }
    }

    if (
      nextOccupancyMoveInDate &&
      (parsedBody.data.providedFields.moveInDate ||
        parsedBody.data.providedFields.moveOutDate ||
        nextResident)
    ) {
      const hasOverlappingOccupancy = await hasOverlappingUnitOccupancy({
        unitId,
        excludedOccupancyId: nextResident ? null : (currentOccupancy?.id ?? null),
        moveInDate: nextOccupancyMoveInDate,
        moveOutDate: nextOccupancyMoveOutDate,
      });

      if (hasOverlappingOccupancy) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Julat tarikh penghunian bertindih dengan rekod penghunian sedia ada untuk unit ini.",
          },
          {
            status: 409,
          },
        );
      }
    }

    if (nextOccupancyState) {
      unitUpdateData.status = nextOccupancyState.unitStatus;

      if (currentOccupancy && !shouldReplaceOccupancy) {
        occupancyUpdateData.status = nextOccupancyState.occupancyStatus;

        if (
          nextOccupancyState.occupancyStatus === "PAST" &&
          !changedFields.includes("occupant")
        ) {
          changedFields.push("occupant");
        }
      }
    }

    if (changedFields.length === 0) {
      return NextResponse.json({
        success: true,
        message: buildQuarterUnitUpdatedMessage(existingUnit.unitCode, []),
        data: {
          unit: mapQuarterUnitForApi(existingUnit),
          changedFields,
        },
      });
    }

    const updatedUnit = await prisma.$transaction(async (tx) => {
      if (
        parsedBody.data.providedFields.occupantIcNumber &&
        shouldReplaceOccupancy &&
        currentOccupancy
      ) {
        await tx.unitOccupancy.update({
          where: {
            id: currentOccupancy.id,
          },
          data: {
            status: "PAST",
            moveOutDate: getTodayStartInMalaysia(),
          },
        });
      }

      if (nextResident) {
        await tx.unitOccupancy.create({
          data: {
            residentId: nextResident.id,
            unitId,
            moveInDate: nextOccupancyMoveInDate ?? getTodayStartInMalaysia(),
            moveOutDate: parsedBody.data.updates.moveOutDate ?? null,
            status: nextOccupancyState?.occupancyStatus ?? "CURRENT",
          },
        });
      }

      if (
        currentOccupancy &&
        !shouldReplaceOccupancy &&
        Object.keys(occupancyUpdateData).length > 0
      ) {
        await tx.unitOccupancy.update({
          where: {
            id: currentOccupancy.id,
          },
          data: occupancyUpdateData,
        });
      }

      if (Object.keys(unitUpdateData).length > 0) {
        await tx.unit.update({
          where: {
            id: unitId,
          },
          data: unitUpdateData,
        });
      }

      const unit = await tx.unit.findUniqueOrThrow({
        where: {
          id: unitId,
        },
        include: buildQuarterUnitCurrentOccupancyInclude(),
      });

      const updatedOccupancy = unit.occupancies[0];

      await recordDataAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Pengurusan Kuarters",
        actionType: "UPDATE",
        target: formatAuditTarget([
          existingUnit.quarterCategory.categoryName,
          `Unit ${unit.unitCode}`,
        ]),
        entityType: "UNIT",
        entityId: unit.id,
        summary: "Mengemaskini maklumat unit kuarters.",
        changes: [
          {
            label: "Kod unit",
            before: existingUnit.unitCode,
            after: unit.unitCode,
          },
          {
            label: "Status unit",
            before: existingUnit.status,
            after: unit.status,
          },
          {
            label: "Penghuni",
            before: currentOccupancy
              ? `${currentOccupancy.resident.fullName} (No. KP ${currentOccupancy.resident.icNumber})`
              : null,
            after: updatedOccupancy
              ? `${updatedOccupancy.resident.fullName} (No. KP ${updatedOccupancy.resident.icNumber})`
              : null,
          },
          {
            label: "Tarikh masuk",
            before: currentOccupancy?.moveInDate ?? null,
            after: updatedOccupancy?.moveInDate ?? null,
          },
          {
            label: "Tarikh keluar",
            before: currentOccupancy?.moveOutDate ?? null,
            after: updatedOccupancy?.moveOutDate ?? null,
          },
        ],
        details: [
          `Medan dikemaskini: ${changedFields.map((field) => changedFieldLabels[field]).join(", ")}.`,
        ],
      });

      return unit;
    });

    revalidatePath("/pages/7_kuarters");
    revalidatePath(`/pages/7_kuarters/${id}`);

    return NextResponse.json({
      success: true,
      message: buildQuarterUnitUpdatedMessage(updatedUnit.unitCode, changedFields),
      data: {
        unit: mapQuarterUnitForApi(updatedUnit),
        changedFields,
      },
    });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: "Kod unit yang diberikan sudah wujud dalam kategori ini.",
        },
        {
          status: 409,
        },
      );
    }

    console.error("Gagal mengemas kini unit kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa mengemas kini unit kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}

async function hasOverlappingUnitOccupancy({
  unitId,
  excludedOccupancyId,
  moveInDate,
  moveOutDate,
}: {
  unitId: string;
  excludedOccupancyId: string | null;
  moveInDate: Date;
  moveOutDate: Date | null;
}) {
  const overlappingOccupancy = await prisma.unitOccupancy.findFirst({
    where: {
      unitId,
      ...(excludedOccupancyId
        ? {
            NOT: {
              id: excludedOccupancyId,
            },
          }
        : {}),
      moveInDate: {
        lte: moveOutDate ?? new Date("9999-12-31T23:59:59.999Z"),
      },
      OR: [
        {
          moveOutDate: null,
        },
        {
          moveOutDate: {
            gte: moveInDate,
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(overlappingOccupancy);
}

async function findOverlappingResidentOccupancy({
  residentId,
  excludedOccupancyId,
  moveInDate,
  moveOutDate,
}: {
  residentId: string;
  excludedOccupancyId: string | null;
  moveInDate: Date;
  moveOutDate: Date | null;
}) {
  return prisma.unitOccupancy.findFirst({
    where: {
      residentId,
      ...(excludedOccupancyId
        ? {
            NOT: {
              id: excludedOccupancyId,
            },
          }
        : {}),
      moveInDate: {
        lte: moveOutDate ?? new Date("9999-12-31T23:59:59.999Z"),
      },
      OR: [
        {
          moveOutDate: null,
        },
        {
          moveOutDate: {
            gte: moveInDate,
          },
        },
      ],
    },
    include: {
      resident: {
        select: {
          fullName: true,
          icNumber: true,
        },
      },
      unit: {
        select: {
          unitCode: true,
          quarterCategory: {
            select: {
              categoryName: true,
            },
          },
        },
      },
    },
  });
}

// Used to delete a quarter unit, with validations to prevent deletion if the unit has current occupancies or associated monthly charges, and handling of related business logic such as revalidating relevant pages after deletion.
export async function DELETE(_request: Request, context: RouteContext) {
  const { id, unitId } = await context.params;

  try {
    const currentAdmin = await getCurrentAdmin();
    const existingUnit = await prisma.unit.findFirst({
      where: { id: unitId },
      include: {
        quarterCategory: {
          select: {
            id: true,
            categoryName: true,
          },
        },
        _count: {
          select: {
            occupancies: true,
            monthlyCharges: true,
          },
        },
      },
    });

    if (!existingUnit || existingUnit.quarterCategory.id !== id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit kuarters tidak ditemui.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      existingUnit._count.occupancies > 0 ||
      existingUnit._count.monthlyCharges > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterUnitDeleteBlockedMessage(existingUnit.unitCode, {
            occupancies: existingUnit._count.occupancies,
            monthlyCharges: existingUnit._count.monthlyCharges,
          }),
          data: {
            occupancies: existingUnit._count.occupancies,
            monthlyCharges: existingUnit._count.monthlyCharges,
          },
        },
        {
          status: 409,
        },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.unit.delete({
        where: {
          id: unitId,
        },
      });

      await recordDataAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Pengurusan Kuarters",
        actionType: "DELETE",
        target: formatAuditTarget([
          existingUnit.quarterCategory.categoryName,
          `Unit ${existingUnit.unitCode}`,
        ]),
        entityType: "UNIT",
        entityId: existingUnit.id,
        summary: "Memadam unit kuarters.",
        details: [
          `Jumlah rekod penghunian sebelum dipadam: ${formatAuditValue(existingUnit._count.occupancies)}.`,
          `Jumlah caj bulanan berkaitan sebelum dipadam: ${formatAuditValue(existingUnit._count.monthlyCharges)}.`,
        ],
      });
    });

    revalidatePath("/pages/7_kuarters");
    revalidatePath(`/pages/7_kuarters/${id}`);

    return NextResponse.json({
      success: true,
      message: buildQuarterUnitDeletedMessage(existingUnit.unitCode),
      data: {
        id: existingUnit.id,
      },
    });
  } catch (error) {
    if (isPrismaForeignKeyError(error)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unit kuarters tidak boleh dipadam kerana masih mempunyai rekod yang dirujuk.",
        },
        {
          status: 409,
        },
      );
    }

    console.error("Gagal memadam unit kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa memadam unit kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}
