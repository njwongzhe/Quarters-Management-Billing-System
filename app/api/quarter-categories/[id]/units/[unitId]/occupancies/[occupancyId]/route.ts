import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  formatAuditTarget,
  formatAuditValue,
  recordDataAuditLog,
} from "@/lib/audit/data-audit";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { prisma } from "@/lib/prisma";
import {
  buildQuarterUnitResidentNotFoundMessage,
  mapQuarterUnitDetailsForApi,
  parseQuarterUnitUpdateBody,
  quarterUnitDetailsInclude,
  resolveQuarterUnitOccupancyState,
} from "@/lib/quarters/quarter-units";
import {
  createOccupancyBillingAdjustments,
  syncQuarterUnitStatuses,
  validateUnitOccupancyPeriod,
} from "@/lib/quarters/unit-occupancy-rules";

type RouteContext = {
  params: Promise<{
    id: string;
    unitId: string;
    occupancyId: string;
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: RouteContext) {
  const { id, unitId, occupancyId } = await context.params;

  try {
    const currentAdmin = await getCurrentAdmin();
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Format JSON untuk kemas kini rekod penghunian tidak sah.",
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

    const existingOccupancy = await prisma.unitOccupancy.findFirst({
      where: {
        id: occupancyId,
        unitId,
        unit: {
          categoryId: id,
        },
      },
      include: occupancyAdjustmentInclude,
    });

    if (!existingOccupancy) {
      return NextResponse.json(
        {
          success: false,
          message: "Rekod penghunian unit tidak ditemui.",
        },
        {
          status: 404,
        },
      );
    }

    const nextResident = parsedBody.data.providedFields.occupantIcNumber
      ? await prisma.resident.findUnique({
          where: {
            icNumber: parsedBody.data.updates.occupantIcNumber ?? "",
          },
          select: {
            id: true,
            fullName: true,
            icNumber: true,
            status: true,
          },
        })
      : null;

    if (
      parsedBody.data.providedFields.occupantIcNumber &&
      !parsedBody.data.updates.occupantIcNumber
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Penghuni wajib dipilih untuk rekod penghunian.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      parsedBody.data.providedFields.occupantIcNumber &&
      parsedBody.data.updates.occupantIcNumber &&
      !nextResident
    ) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterUnitResidentNotFoundMessage(
            parsedBody.data.updates.occupantIcNumber,
          ),
        },
        {
          status: 404,
        },
      );
    }

    const nextMoveInDate =
      parsedBody.data.updates.moveInDate ?? existingOccupancy.moveInDate;
    const nextMoveOutDate = parsedBody.data.providedFields.moveOutDate
      ? (parsedBody.data.updates.moveOutDate ?? null)
      : existingOccupancy.moveOutDate;
    const nextResidentId = nextResident?.id ?? existingOccupancy.residentId;
    const periodValidation = await prisma.$transaction((tx) =>
      validateUnitOccupancyPeriod(tx, {
        unitId,
        excludedOccupancyId: occupancyId,
        moveInDate: nextMoveInDate,
        moveOutDate: nextMoveOutDate,
      }),
    );

    if (!periodValidation.ok) {
      return NextResponse.json(
        {
          success: false,
          message: periodValidation.message,
        },
        {
          status: periodValidation.status,
        },
      );
    }

    const occupancyState = resolveQuarterUnitOccupancyState({
      moveInDate: nextMoveInDate,
      moveOutDate: nextMoveOutDate,
    });

    const updatedUnit = await prisma.$transaction(async (tx) => {
      const updatedOccupancy = await tx.unitOccupancy.update({
        where: {
          id: occupancyId,
        },
        data: {
          residentId: nextResidentId,
          moveInDate: nextMoveInDate,
          moveOutDate: nextMoveOutDate,
          status: occupancyState.occupancyStatus,
          description: "Dikemas kini melalui sejarah penghunian kuarters.",
        },
        include: occupancyAdjustmentInclude,
      });

      await createOccupancyBillingAdjustments(
        tx,
        existingOccupancy,
        updatedOccupancy.residentId === existingOccupancy.residentId
          ? {
              residentId: updatedOccupancy.residentId,
              unitId: updatedOccupancy.unitId,
              moveInDate: updatedOccupancy.moveInDate,
              moveOutDate: updatedOccupancy.moveOutDate,
              residentStatus: updatedOccupancy.resident.status,
              rentalPrice: Number(
                updatedOccupancy.unit.quarterCategory.rentalPrice,
              ),
              penaltyPrice: Number(
                updatedOccupancy.unit.quarterCategory.penaltyPrice,
              ),
            }
          : null,
      );

      await syncQuarterUnitStatuses(tx, [unitId]);

      const unit = await tx.unit.findUniqueOrThrow({
        where: {
          id: unitId,
        },
        include: quarterUnitDetailsInclude,
      });

      await recordDataAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Pengurusan Kuarters",
        actionType: "UPDATE",
        target: formatAuditTarget([
          existingOccupancy.unit.quarterCategory.categoryName,
          `Unit ${existingOccupancy.unit.unitCode}`,
        ]),
        entityType: "UNIT_OCCUPANCY",
        entityId: occupancyId,
        summary: "Mengemaskini rekod sejarah penghunian kuarters.",
        changes: [
          {
            label: "Penghuni",
            before: `${existingOccupancy.resident.fullName} (No. KP ${existingOccupancy.resident.icNumber})`,
            after: `${updatedOccupancy.resident.fullName} (No. KP ${updatedOccupancy.resident.icNumber})`,
          },
          {
            label: "Tarikh masuk",
            before: existingOccupancy.moveInDate,
            after: updatedOccupancy.moveInDate,
          },
          {
            label: "Tarikh keluar",
            before: existingOccupancy.moveOutDate,
            after: updatedOccupancy.moveOutDate,
          },
        ],
        details: [
          `Status rekod selepas kemas kini: ${formatAuditValue(updatedOccupancy.status)}.`,
        ],
      });

      return unit;
    });

    revalidatePath("/pages/7_kuarters");
    revalidatePath(`/pages/7_kuarters/${id}`);

    return NextResponse.json({
      success: true,
      message: "Rekod penghunian unit berjaya dikemas kini.",
      data: {
        unit: mapQuarterUnitDetailsForApi(updatedUnit),
      },
    });
  } catch (error) {
    console.error("Gagal mengemas kini rekod penghunian unit:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Ralat pelayan berlaku semasa mengemas kini rekod penghunian unit.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id, unitId, occupancyId } = await context.params;

  try {
    const currentAdmin = await getCurrentAdmin();
    const existingOccupancy = await prisma.unitOccupancy.findFirst({
      where: {
        id: occupancyId,
        unitId,
        unit: {
          categoryId: id,
        },
      },
      include: occupancyAdjustmentInclude,
    });

    if (!existingOccupancy) {
      return NextResponse.json(
        {
          success: false,
          message: "Rekod penghunian unit tidak ditemui.",
        },
        {
          status: 404,
        },
      );
    }

    const updatedUnit = await prisma.$transaction(async (tx) => {
      await tx.unitOccupancy.delete({
        where: {
          id: occupancyId,
        },
      });

      await createOccupancyBillingAdjustments(tx, existingOccupancy, null);
      await syncQuarterUnitStatuses(tx, [unitId]);

      const unit = await tx.unit.findUniqueOrThrow({
        where: {
          id: unitId,
        },
        include: quarterUnitDetailsInclude,
      });

      await recordDataAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Pengurusan Kuarters",
        actionType: "DELETE",
        target: formatAuditTarget([
          existingOccupancy.unit.quarterCategory.categoryName,
          `Unit ${existingOccupancy.unit.unitCode}`,
        ]),
        entityType: "UNIT_OCCUPANCY",
        entityId: occupancyId,
        summary: "Memadam rekod sejarah penghunian kuarters.",
        details: [
          `Penghuni dipadam: ${existingOccupancy.resident.fullName} (No. KP ${existingOccupancy.resident.icNumber}).`,
          `Tarikh masuk asal: ${formatAuditValue(existingOccupancy.moveInDate)}.`,
          `Tarikh keluar asal: ${formatAuditValue(existingOccupancy.moveOutDate)}.`,
        ],
      });

      return unit;
    });

    revalidatePath("/pages/7_kuarters");
    revalidatePath(`/pages/7_kuarters/${id}`);

    return NextResponse.json({
      success: true,
      message: "Rekod penghunian unit berjaya dipadam.",
      data: {
        unit: mapQuarterUnitDetailsForApi(updatedUnit),
      },
    });
  } catch (error) {
    console.error("Gagal memadam rekod penghunian unit:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa memadam rekod penghunian unit.",
      },
      {
        status: 500,
      },
    );
  }
}

const occupancyAdjustmentInclude = {
  resident: {
    select: {
      fullName: true,
      icNumber: true,
      status: true,
    },
  },
  unit: {
    select: {
      unitCode: true,
      quarterCategory: {
        select: {
          id: true,
          categoryName: true,
          rentalPrice: true,
          penaltyPrice: true,
        },
      },
    },
  },
} satisfies Prisma.UnitOccupancyInclude;
