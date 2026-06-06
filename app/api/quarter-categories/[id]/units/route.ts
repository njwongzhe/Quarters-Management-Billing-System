import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildQuarterCategoryUnitsDetailInclude,
  buildQuarterUnitCurrentOccupancyInclude,
  buildQuarterUnitCreatedMessage,
  buildQuarterUnitDuplicateMessage,
  buildQuarterUnitResidentNotFoundMessage,
  getTodayStartInMalaysia,
  mapQuarterCategoryUnitsDetailForApi,
  mapQuarterUnitForApi,
  parseQuarterUnitCreateBody,
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

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const quarterCategory = await prisma.quarterCategory.findFirst({
      where: { id },
      include: buildQuarterCategoryUnitsDetailInclude(),
    });

    if (!quarterCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Kategori kuarters tidak ditemui.",
        },
        {
          status: 404,
        },
      );
    }

    const detail = mapQuarterCategoryUnitsDetailForApi(quarterCategory);

    return NextResponse.json({
      success: true,
      message: "Data unit kuarters berjaya diambil.",
      data: {
        quarterCategory: detail,
        meta: {
          totalRecords: detail.units.length,
        },
      },
    });
  } catch (error) {
    console.error("Gagal mendapatkan data unit kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa mendapatkan data unit kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let requestedUnitCode: string | null = null;

  try {
    const currentAdmin = await getCurrentAdmin();
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Format JSON untuk permintaan tambah unit tidak sah.",
        },
        {
          status: 400,
        },
      );
    }

    const parsedBody = parseQuarterUnitCreateBody(body);

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

    requestedUnitCode = parsedBody.data.unitCode;

    const quarterCategory = await prisma.quarterCategory.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        categoryName: true,
      },
    });

    if (!quarterCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "Kategori kuarters tidak ditemui.",
        },
        {
          status: 404,
        },
      );
    }

    const existingUnit = await prisma.unit.findFirst({
      where: {
        categoryId: id,
        unitCode: parsedBody.data.unitCode,
      },
      select: {
        id: true,
      },
    });

    if (existingUnit) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterUnitDuplicateMessage(parsedBody.data.unitCode),
        },
        {
          status: 409,
        },
      );
    }

    let resident:
      | {
          id: string;
          fullName: string;
          icNumber: string;
        }
      | null = null;

    if (parsedBody.data.occupantIcNumber) {
      resident = await prisma.resident.findUnique({
        where: {
          icNumber: parsedBody.data.occupantIcNumber,
        },
        select: {
          id: true,
          fullName: true,
          icNumber: true,
        },
      });

      if (!resident) {
        return NextResponse.json(
          {
            success: false,
            message: buildQuarterUnitResidentNotFoundMessage(
              parsedBody.data.occupantIcNumber,
            ),
          },
          {
            status: 404,
          },
        );
      }

      const moveInDate = parsedBody.data.moveInDate ?? getTodayStartInMalaysia();
      const moveOutDate = parsedBody.data.moveOutDate ?? null;

      if (moveOutDate && moveOutDate.getTime() < moveInDate.getTime()) {
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

    const createdUnit = await prisma.$transaction(async (tx) => {
      const moveInDate = parsedBody.data.moveInDate ?? getTodayStartInMalaysia();
      const moveOutDate = parsedBody.data.moveOutDate ?? null;
      const occupancyState = resolveQuarterUnitOccupancyState({
        moveInDate,
        moveOutDate,
      });
      const unit = await tx.unit.create({
        data: {
          unitCode: parsedBody.data.unitCode,
          status: resident ? occupancyState.unitStatus : "VACANT",
          categoryId: id,
          occupancies: resident
            ? {
                create: {
                  residentId: resident.id,
                  moveInDate,
                  moveOutDate,
                  status: occupancyState.occupancyStatus,
                },
              }
            : undefined,
        },
        include: buildQuarterUnitCurrentOccupancyInclude(),
      });

      await recordDataAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Pengurusan Kuarters",
        actionType: "CREATE",
        target: formatAuditTarget([quarterCategory.categoryName, `Unit ${unit.unitCode}`]),
        entityType: "UNIT",
        entityId: unit.id,
        summary: "Menambah unit kuarters baharu.",
        details: [
          `Status unit: ${formatAuditValue(unit.status)}.`,
          resident
            ? `Penghuni ditetapkan: ${resident.fullName} (No. KP ${resident.icNumber}).`
            : "Tiada penghuni ditetapkan semasa unit dicipta.",
          resident ? `Tarikh masuk: ${formatAuditValue(moveInDate)}.` : null,
          resident ? `Tarikh keluar: ${formatAuditValue(moveOutDate)}.` : null,
        ],
      });

      return unit;
    });

    revalidatePath("/pages/7_kuarters");
    revalidatePath(`/pages/7_kuarters/${id}`);

    return NextResponse.json(
      {
        success: true,
        message: buildQuarterUnitCreatedMessage(
          createdUnit.unitCode,
          quarterCategory.categoryName,
        ),
        data: {
          unit: mapQuarterUnitForApi(createdUnit),
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterUnitDuplicateMessage(
            requestedUnitCode ?? "tersebut",
          ),
        },
        {
          status: 409,
        },
      );
    }

    console.error("Gagal menambah unit kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa menambah unit kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}
