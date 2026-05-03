import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildQuarterCategoryCreatedMessage,
  buildQuarterCategoryDuplicateMessage,
  buildQuarterCategorySummary,
  mapQuarterCategoryForApi,
  parseQuarterCategoryCreateBody,
} from "@/lib/quarter-categories";
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
    const [quarterCategories, totalUnits, occupiedUnits, vacantUnits] =
      await prisma.$transaction([
        prisma.quarterCategory.findMany({
          orderBy: {
            categoryName: "asc",
          },
          include: {
            _count: {
              select: {
                units: true,
              },
            },
          },
        }),
        prisma.unit.count(),
        prisma.unit.count({
          where: {
            status: "OCCUPIED",
          },
        }),
        prisma.unit.count({
          where: {
            status: "VACANT",
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      message: "Data kategori kuarters berjaya diambil.",
      data: {
        summary: buildQuarterCategorySummary({
          totalUnits,
          occupiedUnits,
          vacantUnits,
        }),
        quarterCategories: quarterCategories.map(mapQuarterCategoryForApi),
        meta: {
          totalRecords: quarterCategories.length,
        },
      },
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

  try {
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

    const existingQuarterCategory = await prisma.quarterCategory.findUnique({
      where: {
        categoryName: parsedBody.data.categoryName,
      },
      select: {
        id: true,
      },
    });

    if (existingQuarterCategory) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterCategoryDuplicateMessage(parsedBody.data.categoryName),
        },
        {
          status: 409,
        },
      );
    }

    const createdQuarterCategory = await prisma.quarterCategory.create({
      data: parsedBody.data,
      include: {
        _count: {
          select: {
            units: true,
          },
        },
      },
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
