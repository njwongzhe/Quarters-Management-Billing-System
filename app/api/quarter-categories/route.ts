import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildQuarterCategoryCreatedMessage,
  buildQuarterCategoryDuplicateMessage,
  getQuarterCategoriesPageData,
  mapQuarterCategoryForApi,
  parseQuarterCategoryCreateBody,
} from "@/lib/quarters/quarter-categories";
import {
  formatAuditTarget,
  recordDataAuditLog,
} from "@/lib/audit/data-audit";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // This API route uses Prisma which is not compatible with the Edge runtime, so we specify that it should run in a Node.js environment.
export const dynamic = "force-dynamic"; // This API route needs to always fetch fresh data from the database, so we disable any caching or static optimization by marking it as dynamic.

function isPrismaUniqueError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function GET() {
  try {
    const data = await getQuarterCategoriesPageData();

    return NextResponse.json({
      success: true,
      message: "Data kategori kuarters berjaya diambil.",
      data,
    });
  } catch (error) {
    console.error("Gagal mendapatkan data kategori kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa mendapatkan data kategori kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  let requestedCategoryName: string | null = null;
  let requestedAddress: string | null = null;

  try {
    const currentAdmin = await getCurrentAdmin();
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Format JSON untuk permintaan Tambah Kategori tidak sah.",
        },
        {
          status: 400,
        },
      );
    }

    const parsedBody = parseQuarterCategoryCreateBody(body);

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

    requestedCategoryName = parsedBody.data.categoryName;
    requestedAddress = parsedBody.data.address;

    const existingQuarterCategory = await prisma.quarterCategory.findFirst({
      where: {
        categoryName: parsedBody.data.categoryName,
        address: parsedBody.data.address,
      },
      select: {
        id: true,
      },
    });

    if (existingQuarterCategory) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterCategoryDuplicateMessage(
            parsedBody.data.categoryName,
            parsedBody.data.address,
          ),
        },
        {
          status: 409,
        },
      );
    }

    const createdQuarterCategory = await prisma.$transaction(async (tx) => {
      const quarterCategory = await tx.quarterCategory.create({
        data: parsedBody.data,
        include: {
          _count: {
            select: {
              units: true,
            },
          },
          units: {
            select: {
              status: true,
            },
          },
        },
      });

      await recordDataAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Pengurusan Kuarters",
        actionType: "CREATE",
        target: formatAuditTarget([quarterCategory.categoryName, quarterCategory.address]),
        entityType: "QUARTER_CATEGORY",
        entityId: quarterCategory.id,
        summary: "Menambah kategori kuarters baharu.",
        details: [
          `Harga sewa: RM ${Number(quarterCategory.rentalPrice).toFixed(2)}.`,
          `Caj penyelenggaraan: RM ${Number(quarterCategory.maintenancePrice).toFixed(2)}.`,
          `Caj penalti: RM ${Number(quarterCategory.penaltyPrice).toFixed(2)}.`,
        ],
      });

      return quarterCategory;
    });

    revalidatePath("/pages/7_kuarters");

    return NextResponse.json(
      {
        success: true,
        message: buildQuarterCategoryCreatedMessage(createdQuarterCategory.categoryName),
        data: {
          quarterCategory: mapQuarterCategoryForApi(createdQuarterCategory),
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

    console.error("Gagal menambah kategori kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa menambah kategori kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}
