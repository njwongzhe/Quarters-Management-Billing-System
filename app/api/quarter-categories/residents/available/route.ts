import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { mapAvailableResidentForApi } from "@/lib/quarters/quarter-residents-map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const strippedQuery = query.replace(/-/g, "");

    const residents = await prisma.resident.findMany({
      where: {
        ...(query.length > 0
          ? {
              OR: [
                {
                  icNumber: {
                    contains: strippedQuery,
                    mode: "insensitive",
                  },
                },
                {
                  fullName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [
        {
          fullName: "asc",
        },
        {
          icNumber: "asc",
        },
      ],
      select: {
        id: true,
        icNumber: true,
        fullName: true,
        status: true,
        occupancies: {
          orderBy: {
            moveInDate: "desc",
          },
          select: {
            id: true,
            unitId: true,
            moveInDate: true,
            moveOutDate: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Senarai penghuni yang boleh ditetapkan berjaya diambil.",
      data: {
        residents: residents.map(mapAvailableResidentForApi),
        meta: {
          totalRecords: residents.length,
          query,
        },
      },
    });
  } catch (error) {
    console.error(
      "Gagal mendapatkan senarai penghuni yang boleh ditetapkan:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Ralat pelayan berlaku semasa mendapatkan senarai penghuni yang boleh ditetapkan.",
      },
      {
        status: 500,
      },
    );
  }
}
