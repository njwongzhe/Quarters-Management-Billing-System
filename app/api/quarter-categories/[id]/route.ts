import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildQuarterCategoryDeleteBlockedMessage,
  buildQuarterCategoryUpdatedMessage,
  getChangedQuarterCategoryFields,
  mapQuarterCategoryForApi,
  parseQuarterCategoryUpdateBody,
} from "@/lib/quarter-categories";
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

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
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

    const existingQuarterCategory = await prisma.quarterCategory.findUnique({
      where: { id },
      // We need the unit count to determine if the class can be deleted and to include in the response after update, so we include it in the query here.
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

    const updatedQuarterCategory = await prisma.quarterCategory.update({
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

    await prisma.quarterCategory.delete({
      where: { id },
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
