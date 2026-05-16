import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildQuarterUnitCurrentOccupancyInclude,
  buildQuarterUnitDuplicateMessage,
  buildQuarterUnitOccupancyConflictMessage,
  buildQuarterUnitResidentNotFoundMessage,
  buildQuarterUnitUpdatedMessage,
  mapQuarterUnitForApi,
  parseQuarterUnitUpdateBody,
} from "@/lib/quarter-units";
import { createAuditLog } from "@/lib/audit-logs";
import { getCurrentAdmin } from "@/lib/current-admin";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; unitId: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPrismaUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as any).code === "P2002";
}

function isPrismaForeignKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as any).code === "P2003";
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, unitId } = await context.params;

  try {
    const currentAdmin = await getCurrentAdmin();
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Format JSON untuk permintaan kemas kini unit tidak sah." }, { status: 400 });
    }

    const parsedBody = parseQuarterUnitUpdateBody(body);

    if (!parsedBody.ok) {
      return NextResponse.json({ success: false, message: parsedBody.message }, { status: 400 });
    }

    const existingUnit = await prisma.unit.findFirst({ where: { id: unitId }, include: { ...buildQuarterUnitCurrentOccupancyInclude(), quarterCategory: { select: { id: true } } } });

    if (!existingUnit || existingUnit.quarterCategory.id !== id) {
      return NextResponse.json({ success: false, message: "Unit kuarters tidak ditemui." }, { status: 404 });
    }

    const currentOccupancy = existingUnit.occupancies[0];
    const currentOccupantIcNumber = currentOccupancy?.resident.icNumber ?? null;
    const nextUnitCode = parsedBody.data.updates.unitCode ?? existingUnit.unitCode;
    const changedFields: Array<"unitCode" | "occupant" | "moveInDate" | "moveOutDate"> = [];
    const unitUpdateData: Prisma.UnitUpdateInput = {};
    const occupancyUpdateData: Prisma.UnitOccupancyUpdateInput = {};

    if (nextUnitCode !== existingUnit.unitCode) {
      const conflictingUnit = await prisma.unit.findFirst({ where: { categoryId: id, unitCode: nextUnitCode, NOT: { id: unitId } }, select: { id: true } });

      if (conflictingUnit) {
        return NextResponse.json({ success: false, message: buildQuarterUnitDuplicateMessage(nextUnitCode) }, { status: 409 });
      }

      changedFields.push("unitCode");
      unitUpdateData.unitCode = nextUnitCode;
    }

    let nextResident: { id: string; fullName: string; icNumber: string } | null = null;
    let shouldReplaceOccupancy = false;

    if (parsedBody.data.providedFields.occupantIcNumber) {
      const requestedOccupantIcNumber = parsedBody.data.updates.occupantIcNumber ?? null;
      const nextStatus = requestedOccupantIcNumber ? "OCCUPIED" : "VACANT";

      if (requestedOccupantIcNumber === null) {
        if (currentOccupantIcNumber !== null || existingUnit.status !== "VACANT") {
          changedFields.push("occupant");
          shouldReplaceOccupancy = currentOccupantIcNumber !== null;
        }
      } else {
        if (requestedOccupantIcNumber !== currentOccupantIcNumber) {
          nextResident = await prisma.resident.findUnique({ where: { icNumber: requestedOccupantIcNumber }, select: { id: true, fullName: true, icNumber: true } });

          if (!nextResident) {
            return NextResponse.json({ success: false, message: buildQuarterUnitResidentNotFoundMessage(requestedOccupantIcNumber) }, { status: 404 });
          }

          changedFields.push("occupant");
          shouldReplaceOccupancy = true;
        } else if (existingUnit.status !== "OCCUPIED") {
          changedFields.push("occupant");
        }
      }

      if (existingUnit.status !== nextStatus) {
        unitUpdateData.status = nextStatus;
      }
    }

    if (parsedBody.data.providedFields.moveInDate) {
      if (!currentOccupancy && !nextResident) {
        return NextResponse.json({ success: false, message: "Tarikh masuk hanya boleh dikemas kini selepas penghuni dipilih." }, { status: 400 });
      }

      const nextMoveInDate = parsedBody.data.updates.moveInDate;

      if (nextMoveInDate && (!currentOccupancy || nextMoveInDate.getTime() !== currentOccupancy.moveInDate.getTime())) {
        changedFields.push("moveInDate");
        occupancyUpdateData.moveInDate = nextMoveInDate;
      }
    }

    if (parsedBody.data.providedFields.moveOutDate) {
      if (!currentOccupancy && !nextResident) {
        return NextResponse.json({ success: false, message: "Tarikh keluar hanya boleh dikemas kini selepas penghuni dipilih." }, { status: 400 });
      }

      const nextMoveOutDate = parsedBody.data.updates.moveOutDate ?? null;
      const currentMoveOutTime = currentOccupancy?.moveOutDate?.getTime() ?? null;
      const nextMoveOutTime = nextMoveOutDate?.getTime() ?? null;

      if (nextMoveOutTime !== currentMoveOutTime) {
        changedFields.push("moveOutDate");
        occupancyUpdateData.moveOutDate = nextMoveOutDate;
      }
    }

    const nextOccupancyMoveInDate = parsedBody.data.updates.moveInDate ?? currentOccupancy?.moveInDate ?? (nextResident ? new Date() : null);
    const nextOccupancyMoveOutDate = parsedBody.data.providedFields.moveOutDate ? (parsedBody.data.updates.moveOutDate ?? null) : (currentOccupancy?.moveOutDate ?? null);
    const nextOccupancyResidentId = nextResident?.id ?? currentOccupancy?.resident.id ?? null;
    const shouldEndOccupancy = Boolean(nextOccupancyMoveOutDate);
    const todayStart = getTodayStartInMalaysia();

    if (nextOccupancyMoveInDate && nextOccupancyMoveInDate.getTime() > todayStart.getTime()) {
      return NextResponse.json({ success: false, message: "Tarikh masuk tidak boleh selepas hari ini." }, { status: 400 });
    }

    if (nextOccupancyMoveOutDate && nextOccupancyMoveOutDate.getTime() > todayStart.getTime()) {
      return NextResponse.json({ success: false, message: "Tarikh keluar tidak boleh selepas hari ini." }, { status: 400 });
    }

    if (nextOccupancyMoveInDate && nextOccupancyMoveOutDate) {
      if (nextOccupancyMoveOutDate.getTime() < nextOccupancyMoveInDate.getTime()) {
        return NextResponse.json({ success: false, message: "Tarikh keluar tidak boleh lebih awal daripada tarikh masuk." }, { status: 400 });
      }
    }

    if (nextOccupancyResidentId && nextOccupancyMoveInDate && (parsedBody.data.providedFields.moveInDate || parsedBody.data.providedFields.moveOutDate || nextResident)) {
      const overlappingResidentOccupancy = await findOverlappingResidentOccupancy({ residentId: nextOccupancyResidentId, excludedOccupancyId: nextResident ? null : (currentOccupancy?.id ?? null), moveInDate: nextOccupancyMoveInDate, moveOutDate: nextOccupancyMoveOutDate });

      if (overlappingResidentOccupancy) {
        return NextResponse.json({ success: false, message: buildQuarterUnitOccupancyConflictMessage(overlappingResidentOccupancy.resident.fullName, overlappingResidentOccupancy.resident.icNumber, overlappingResidentOccupancy.unit.unitCode, overlappingResidentOccupancy.unit.quarterCategory.categoryName), data: { unitCode: overlappingResidentOccupancy.unit.unitCode } }, { status: 409 });
      }
    }

    if (nextOccupancyMoveInDate && (parsedBody.data.providedFields.moveInDate || parsedBody.data.providedFields.moveOutDate || nextResident)) {
      const hasOverlappingOccupancy = await hasOverlappingUnitOccupancy({ unitId, excludedOccupancyId: nextResident ? null : (currentOccupancy?.id ?? null), moveInDate: nextOccupancyMoveInDate, moveOutDate: nextOccupancyMoveOutDate });

      if (hasOverlappingOccupancy) {
        return NextResponse.json({ success: false, message: "Julat tarikh penghunian bertindih dengan rekod penghunian sedia ada untuk unit ini." }, { status: 409 });
      }
    }

    if (shouldEndOccupancy) {
      unitUpdateData.status = "VACANT";

      if (currentOccupancy && !shouldReplaceOccupancy) {
        occupancyUpdateData.status = "PAST";

        if (!changedFields.includes("occupant")) {
          changedFields.push("occupant");
        }
      }
    } else if (currentOccupancy && !shouldReplaceOccupancy && parsedBody.data.providedFields.moveOutDate) {
      occupancyUpdateData.status = "CURRENT";
      unitUpdateData.status = "OCCUPIED";
    }

    if (changedFields.length === 0) {
      return NextResponse.json({ success: true, message: buildQuarterUnitUpdatedMessage(existingUnit.unitCode, []), data: { unit: mapQuarterUnitForApi(existingUnit), changedFields } });
    }

    const updatedUnit = await prisma.$transaction(async (tx) => {
      if (parsedBody.data.providedFields.occupantIcNumber && shouldReplaceOccupancy) {
        await tx.unitOccupancy.updateMany({ where: { unitId, status: "CURRENT" }, data: { status: "PAST", moveOutDate: new Date() } });
      }

      if (nextResident) {
        await tx.unitOccupancy.create({ data: { residentId: nextResident.id, unitId, moveInDate: parsedBody.data.updates.moveInDate ?? new Date(), moveOutDate: parsedBody.data.updates.moveOutDate ?? null, status: shouldEndOccupancy ? "PAST" : "CURRENT" } });
      }

      if (currentOccupancy && !shouldReplaceOccupancy && Object.keys(occupancyUpdateData).length > 0) {
        await tx.unitOccupancy.update({ where: { id: currentOccupancy.id }, data: occupancyUpdateData });
      }

      if (Object.keys(unitUpdateData).length > 0) {
        await tx.unit.update({ where: { id: unitId }, data: unitUpdateData });
      }

      const unit = await tx.unit.findUniqueOrThrow({ where: { id: unitId }, include: buildQuarterUnitCurrentOccupancyInclude() });

      await createAuditLog(tx, { actor: currentAdmin, moduleName: "Pengurusan Kuarters", targetData: `Unit ${unit.unitCode}`, actionType: "UPDATE", entityType: "UNIT", entityId: unit.id, description: `Mengemaskini unit ${unit.unitCode}. Medan berubah: ${changedFields.join(", ")}.` });

      return unit;
    });

    revalidatePath("/pages/7_kuarters");
    revalidatePath(`/pages/7_kuarters/${id}`);

    return NextResponse.json({ success: true, message: buildQuarterUnitUpdatedMessage(updatedUnit.unitCode, changedFields), data: { unit: mapQuarterUnitForApi(updatedUnit), changedFields } });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return NextResponse.json({ success: false, message: "Kod unit yang diberikan sudah wujud dalam kategori ini." }, { status: 409 });
    }

    console.error("Gagal mengemas kini unit kuarters:", error);
    return NextResponse.json({ success: false, message: "Ralat pelayan berlaku semasa mengemas kini unit kuarters." }, { status: 500 });
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

function getTodayStartInMalaysia() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return new Date(`${year}-${month}-${day}T00:00:00.000+08:00`);
}
