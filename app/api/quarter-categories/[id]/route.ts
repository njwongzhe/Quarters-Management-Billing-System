import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildQuarterCategoryDeleteBlockedMessage,
  buildQuarterCategoryDuplicateMessage,
  buildQuarterCategoryUpdatedMessage,
  getChangedQuarterCategoryFields,
  mapQuarterCategoryForApi,
  parseQuarterCategoryUpdateBody,
} from "@/lib/quarters/quarter-categories";
import {
  buildAuditChanges,
  formatAuditTarget,
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

function isPrismaForeignKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2003"
  );
}

function isPrismaUniqueError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let requestedCategoryName: string | null = null;
  let requestedAddress: string | null = null;

  try {
    const currentAdmin = await getCurrentAdmin();
    let body: unknown; // We declare body here so that we can assign it inside the try-catch block where we attempt to parse the JSON. This allows us to handle JSON parsing errors gracefully and return a proper error response if the JSON is invalid.

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Format JSON untuk permintaan kemas kini tidak sah.",
        },
        {
          status: 400,
        },
      );
    }

    const parsedBody = parseQuarterCategoryUpdateBody(body);

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

    requestedCategoryName =
      typeof parsedBody.data.categoryName === "string"
        ? parsedBody.data.categoryName
        : null;
    requestedAddress =
      typeof parsedBody.data.address === "string" ? parsedBody.data.address : null;

    const existingQuarterCategory = await prisma.quarterCategory.findUnique({
      where: { id },
      // We need the unit count to determine if the category can be deleted and to include in the response after update, so we include it in the query here.
      include: {
        _count: {
          select: {
            units: true,
          },
        },
      },
    });

    if (!existingQuarterCategory) {
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

    const changedFields = getChangedQuarterCategoryFields(
      existingQuarterCategory,
      parsedBody.data,
    );

    const nextCategoryName =
      parsedBody.data.categoryName ?? existingQuarterCategory.categoryName;
    const nextAddress =
      parsedBody.data.address !== undefined
        ? parsedBody.data.address
        : existingQuarterCategory.address;

    requestedCategoryName = nextCategoryName;
    requestedAddress = nextAddress;

    if (changedFields.length === 0) {
      return NextResponse.json({
        success: true,
        message: buildQuarterCategoryUpdatedMessage(
          existingQuarterCategory.categoryName,
          changedFields,
        ),
        data: {
          quarterCategory: mapQuarterCategoryForApi(existingQuarterCategory),
          changedFields,
        },
      });
    }

    const duplicateQuarterCategory = await prisma.quarterCategory.findFirst({
      where: {
        categoryName: nextCategoryName,
        address: nextAddress,
        NOT: {
          id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateQuarterCategory) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterCategoryDuplicateMessage(
            nextCategoryName,
            nextAddress,
          ),
        },
        {
          status: 409,
        },
      );
    }

    const updatedQuarterCategory = await prisma.$transaction(async (tx) => {
      const quarterCategory = await tx.quarterCategory.update({
        where: { id },
        data: parsedBody.data,
        include: {
          _count: {
            select: {
              units: true,
            },
          },
        },
      });

      await recordDataAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Pengurusan Kuarters",
        actionType: "UPDATE",
        target: formatAuditTarget([quarterCategory.categoryName, quarterCategory.address]),
        entityType: "QUARTER_CATEGORY",
        entityId: quarterCategory.id,
        summary: "Mengemaskini maklumat kategori kuarters.",
        changes: buildAuditChanges(
          {
            categoryName: existingQuarterCategory.categoryName,
            address: existingQuarterCategory.address,
            rentalPrice: Number(existingQuarterCategory.rentalPrice).toFixed(2),
            maintenancePrice: Number(existingQuarterCategory.maintenancePrice).toFixed(2),
            penaltyPrice: Number(existingQuarterCategory.penaltyPrice).toFixed(2),
          },
          {
            categoryName: quarterCategory.categoryName,
            address: quarterCategory.address,
            rentalPrice: Number(quarterCategory.rentalPrice).toFixed(2),
            maintenancePrice: Number(quarterCategory.maintenancePrice).toFixed(2),
            penaltyPrice: Number(quarterCategory.penaltyPrice).toFixed(2),
          },
          {
            categoryName: "Nama kategori",
            address: "Alamat",
            rentalPrice: "Harga sewa",
            maintenancePrice: "Caj penyelenggaraan",
            penaltyPrice: "Caj penalti",
          },
        ),
      });

      return quarterCategory;
    });

    revalidatePath("/pages/7_kuarters");

    return NextResponse.json({
      success: true,
      message: buildQuarterCategoryUpdatedMessage(
        updatedQuarterCategory.categoryName,
        changedFields,
      ),
      data: {
        quarterCategory: mapQuarterCategoryForApi(updatedQuarterCategory),
        changedFields,
      },
    });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterCategoryDuplicateMessage(
            requestedCategoryName ?? "tersebut",
            requestedAddress,
          ),
        },
        {
          status: 409,
        },
      );
    }

    console.error("Gagal mengemas kini kategori kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa mengemas kini kategori kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const currentAdmin = await getCurrentAdmin();
    const existingQuarterCategory = await prisma.quarterCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            units: true,
          },
        },
      },
    });

    if (!existingQuarterCategory) {
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

    if (existingQuarterCategory._count.units > 0) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterCategoryDeleteBlockedMessage(
            existingQuarterCategory.categoryName,
            existingQuarterCategory._count.units,
          ),
          data: {
            unitCount: existingQuarterCategory._count.units,
          },
        },
        {
          status: 409,
        },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.quarterCategory.delete({
        where: { id },
      });

      await recordDataAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Pengurusan Kuarters",
        actionType: "DELETE",
        target: formatAuditTarget([
          existingQuarterCategory.categoryName,
          existingQuarterCategory.address,
        ]),
        entityType: "QUARTER_CATEGORY",
        entityId: existingQuarterCategory.id,
        summary: "Memadam kategori kuarters.",
        details: [
          `Jumlah unit sebelum dipadam: ${existingQuarterCategory._count.units}.`,
        ],
      });
    });

    revalidatePath("/pages/7_kuarters");

    return NextResponse.json({
      success: true,
      message: `${existingQuarterCategory.categoryName} berjaya dipadam.`,
      data: {
        id: existingQuarterCategory.id,
      },
    });
  } catch (error) {
    if (isPrismaForeignKeyError(error)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Kategori kuarters tidak boleh dipadam kerana masih mempunyai unit yang dirujuk.",
        },
        {
          status: 409,
        },
      );
    }

    console.error("Gagal memadam kategori kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa memadam kategori kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}
