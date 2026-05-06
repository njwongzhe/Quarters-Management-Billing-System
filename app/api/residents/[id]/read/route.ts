import { NextResponse } from "next/server";

import { prisma } from "../../../../../lib/prisma";

// Error response helper
function createResidentErrorResponse(
  message: string,
  status: number,
  errorCode: string,
) {
  return NextResponse.json(
    {
      success: false,
      message,
      errorCode,
    },
    { status },
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const resident = await prisma.resident.findUnique({
      where: { id },
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
          where: { status: "CURRENT" },
          orderBy: { moveInDate: "desc" },
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

    if (!resident) {
      return createResidentErrorResponse(
        "Penghuni tidak ditemui.",
        404,
        "RESIDENT_NOT_FOUND",
      );
    }

    // Map to response format
    const mappedResident = {
      id: resident.id,
      fullName: resident.fullName,
      icNumber: resident.icNumber,
      phone: resident.phone,
      email: resident.email,
      position: resident.position,
      department: resident.department,
      serviceLevel: resident.serviceLevel,
      status: resident.status,
      description: resident.description,
      updatedAt: resident.updatedAt.toISOString(),
      quarters:
        resident.occupancies.length > 0
          ? {
              unitCode: resident.occupancies[0].unit.unitCode,
              quarterName:
                resident.occupancies[0].unit.quarterCategory.categoryName,
              moveInDate: resident.occupancies[0].moveInDate
                ? resident.occupancies[0].moveInDate.toISOString()
                : null,
              moveOutDate: resident.occupancies[0].moveOutDate
                ? resident.occupancies[0].moveOutDate.toISOString()
                : null,
            }
          : null,
      totalArrearsAmount: resident.arrearsSummary
        ? {
            totalArrearsAmount: resident.arrearsSummary.totalArrearsAmount,
          }
        : null,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Maklumat penghuni berjaya diambil.",
        data: mappedResident,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching resident:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mendapatkan maklumat penghuni.", errorCode: "READ_FAILED" },
      { status: 500 },
    );
  }
}
