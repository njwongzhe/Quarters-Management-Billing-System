import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildQuarterUnitDeleteBlockedMessage,
  buildQuarterUnitDeletedMessage,
  buildQuarterUnitDuplicateMessage,
  buildQuarterUnitOccupancyConflictMessage,
  buildQuarterUnitResidentNotFoundMessage,
  buildQuarterUnitUpdatedMessage,
  mapQuarterUnitDetailsForApi,
  mapQuarterUnitForApi,
  parseQuarterUnitUpdateBody,
  quarterUnitCurrentOccupancyInclude,
  quarterUnitDetailsInclude,
} from "@/lib/quarter-units";
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

// Used to fetch the details of a specific quarter unit, including its current occupancy and occupancy history, for display in the unit details overlay.
export async function GET(_request: Request, context: RouteContext) {
  const { id, unitId } = await context.params;

  try {
    const unit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        recordStatus: "VERIFIED",
      },
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

    const existingUnit = await prisma.unit.findUnique({
      where: {
        id: unitId,
      },
      include: {
        ...quarterUnitCurrentOccupancyInclude,
        quarterCategory: {
          select: {
            id: true,
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
    const changedFields: Array<"unitCode" | "occupant"> = [];
    const unitUpdateData: Prisma.UnitUpdateInput = {};

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
      const nextStatus = requestedOccupantIcNumber ? "OCCUPIED" : "VACANT";

      if (requestedOccupantIcNumber === null) {
        if (currentOccupantIcNumber !== null || existingUnit.status !== "VACANT") {
          changedFields.push("occupant");
          shouldReplaceOccupancy = currentOccupantIcNumber !== null;
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

          const conflictingOccupancy = await prisma.unitOccupancy.findFirst({
            where: {
              residentId: nextResident.id,
              status: "CURRENT",
              NOT: {
                unitId,
              },
            },
            include: {
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

          if (conflictingOccupancy) {
            return NextResponse.json(
              {
                success: false,
                message: buildQuarterUnitOccupancyConflictMessage(
                  nextResident.fullName,
                  nextResident.icNumber,
                  conflictingOccupancy.unit.unitCode,
                  conflictingOccupancy.unit.quarterCategory.categoryName,
                ),
                data: {
                  unitCode: conflictingOccupancy.unit.unitCode,
                },
              },
              {
                status: 409,
              },
            );
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
      if (parsedBody.data.providedFields.occupantIcNumber && shouldReplaceOccupancy) {
        await tx.unitOccupancy.updateMany({
          where: {
            unitId,
            status: "CURRENT",
          },
          data: {
            status: "PAST",
            moveOutDate: new Date(),
          },
        });
      }

      if (nextResident) {
        await tx.unitOccupancy.create({
          data: {
            residentId: nextResident.id,
            unitId,
            moveInDate: new Date(),
            status: "CURRENT",
          },
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

      return tx.unit.findUniqueOrThrow({
        where: {
          id: unitId,
        },
        include: quarterUnitCurrentOccupancyInclude,
      });
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

// Used to delete a quarter unit, with validations to prevent deletion if the unit has current occupancies or associated monthly charges, and handling of related business logic such as revalidating relevant pages after deletion.
export async function DELETE(_request: Request, context: RouteContext) {
  const { id, unitId } = await context.params;

  try {
    const existingUnit = await prisma.unit.findUnique({
      where: {
        id: unitId,
      },
      include: {
        quarterCategory: {
          select: {
            id: true,
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

    await prisma.unit.delete({
      where: {
        id: unitId,
      },
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
