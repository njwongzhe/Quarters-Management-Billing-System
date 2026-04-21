import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildQuarterClassCreatedMessage,
  buildQuarterClassDuplicateMessage,
  buildQuarterClassSummary,
  mapQuarterClassForApi,
  parseQuarterClassCreateBody,
} from "@/lib/quarter-classes";
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
    const [quarterClasses, totalUnits, occupiedUnits, vacantUnits] =
      await prisma.$transaction([
        prisma.quarterClass.findMany({
          orderBy: {
            className: "asc",
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
      message: "Data kelas kuarters berjaya diambil.",
      data: {
        summary: buildQuarterClassSummary({
          totalUnits,
          occupiedUnits,
          vacantUnits,
        }),
        quarterClasses: quarterClasses.map(mapQuarterClassForApi),
        meta: {
          totalRecords: quarterClasses.length,
        },
      },
    });
  } catch (error) {
    console.error("Gagal mendapatkan data kelas kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa mendapatkan data kelas kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  let requestedClassName: string | null = null;

  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Format JSON untuk permintaan tambah kelas tidak sah.",
        },
        {
          status: 400,
        },
      );
    }

    const parsedBody = parseQuarterClassCreateBody(body);

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

    requestedClassName = parsedBody.data.className;

    const existingQuarterClass = await prisma.quarterClass.findUnique({
      where: {
        className: parsedBody.data.className,
      },
      select: {
        id: true,
      },
    });

    if (existingQuarterClass) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterClassDuplicateMessage(parsedBody.data.className),
        },
        {
          status: 409,
        },
      );
    }

    const createdQuarterClass = await prisma.quarterClass.create({
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
        message: buildQuarterClassCreatedMessage(createdQuarterClass.className),
        data: {
          quarterClass: mapQuarterClassForApi(createdQuarterClass),
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
          message: buildQuarterClassDuplicateMessage(
            requestedClassName ?? "tersebut",
          ),
        },
        {
          status: 409,
        },
      );
    }

    console.error("Gagal menambah kelas kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa menambah kelas kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}
