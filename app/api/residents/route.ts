import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";

    const residents = await prisma.resident.findMany({
      where: {
        ...(query.length > 0
          ? {
              OR: [
                {
                  fullName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  icNumber: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  phone: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ fullName: "asc" }, { icNumber: "asc" }],
      select: {
        id: true,
        fullName: true,
        icNumber: true,
        phone: true,
        email: true,
        position: true,
        department: true,
        serviceLevel: true,
        status: true,
        description: true,
        updatedAt: true,
        occupancies: {
          where: {
            status: "CURRENT",
          },
          orderBy: {
            moveInDate: "desc",
          },
          take: 1,
          select: {
            moveInDate: true,
            moveOutDate: true,
            unit: {
              select: {
                unitCode: true,
                quarterCategory: {
                  select: {
                    categoryName: true,
                    address: true,
                  },
                },
              },
            },
          },
        },
        arrearsSummary: {
          select: {
            totalArrearsAmount: true,
          },
        },
      },
    });

    const payloadResidents = residents.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      icNumber: r.icNumber,
      phone: r.phone ?? null,
      email: r.email ?? null,
      position: r.position ?? null,
      department: r.department ?? null,
      serviceLevel: r.serviceLevel ?? null,
      status: r.status ?? "",
      description: r.description ?? null,
      updatedAt: r.updatedAt.toISOString(),
      quarters:
        r.occupancies && r.occupancies.length > 0
          ? {
              unitCode: r.occupancies[0].unit.unitCode,
              quarterName: r.occupancies[0].unit.quarterCategory.categoryName,
              address: r.occupancies[0].unit.quarterCategory.address ?? null,
              moveInDate: r.occupancies[0].moveInDate
                ? r.occupancies[0].moveInDate.toISOString()
                : null,
              moveOutDate: r.occupancies[0].moveOutDate
                ? r.occupancies[0].moveOutDate.toISOString()
                : null,
            }
          : null,
      totalArrearsAmount: r.arrearsSummary
        ? { totalArrearsAmount: Number(r.arrearsSummary.totalArrearsAmount ?? 0) }
        : null,
    }));

    return NextResponse.json({
      success: true,
      message: "Data penghuni berjaya diambil.",
      data: {
        residents: payloadResidents,
        meta: {
          totalRecords: payloadResidents.length,
          query,
        },
      },
    });
  } catch (error) {
    console.error("Gagal mendapatkan senarai penghuni:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa mendapatkan senarai penghuni.",
      },
      {
        status: 500,
      },
    );
  }
}
