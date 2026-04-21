import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildQuarterClassDeleteBlockedMessage,
  buildQuarterClassUpdatedMessage,
  getChangedQuarterClassFields,
  mapQuarterClassForApi,
  parseQuarterClassUpdateBody,
} from "@/lib/quarter-classes";
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

    const parsedBody = parseQuarterClassUpdateBody(body);

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

    const existingQuarterClass = await prisma.quarterClass.findUnique({
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

    if (!existingQuarterClass) {
      return NextResponse.json(
        {
          success: false,
          message: "Kelas kuarters tidak ditemui.",
        },
        {
          status: 404,
        },
      );
    }

    const changedFields = getChangedQuarterClassFields(
      existingQuarterClass,
      parsedBody.data,
    );

    if (changedFields.length === 0) {
      return NextResponse.json({
        success: true,
        message: buildQuarterClassUpdatedMessage(
          existingQuarterClass.className,
          changedFields,
        ),
        data: {
          quarterClass: mapQuarterClassForApi(existingQuarterClass),
          changedFields,
        },
      });
    }

    const updatedQuarterClass = await prisma.quarterClass.update({
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

    revalidatePath("/pages/6_penghuni");

    return NextResponse.json({
      success: true,
      message: buildQuarterClassUpdatedMessage(
        updatedQuarterClass.className,
        changedFields,
      ),
      data: {
        quarterClass: mapQuarterClassForApi(updatedQuarterClass),
        changedFields,
      },
    });
  } catch (error) {
    console.error("Gagal mengemas kini kelas kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa mengemas kini kelas kuarters.",
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
    const existingQuarterClass = await prisma.quarterClass.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            units: true,
          },
        },
      },
    });

    if (!existingQuarterClass) {
      return NextResponse.json(
        {
          success: false,
          message: "Kelas kuarters tidak ditemui.",
        },
        {
          status: 404,
        },
      );
    }

    if (existingQuarterClass._count.units > 0) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterClassDeleteBlockedMessage(
            existingQuarterClass.className,
            existingQuarterClass._count.units,
          ),
          data: {
            unitCount: existingQuarterClass._count.units,
          },
        },
        {
          status: 409,
        },
      );
    }

    await prisma.quarterClass.delete({
      where: { id },
    });

    revalidatePath("/pages/6_penghuni");

    return NextResponse.json({
      success: true,
      message: `${existingQuarterClass.className} berjaya dipadam.`,
      data: {
        id: existingQuarterClass.id,
      },
    });
  } catch (error) {
    if (isPrismaForeignKeyError(error)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Kelas kuarters tidak boleh dipadam kerana masih mempunyai unit yang dirujuk.",
        },
        {
          status: 409,
        },
      );
    }

    console.error("Gagal memadam kelas kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa memadam kelas kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}
