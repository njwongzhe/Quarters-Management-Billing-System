import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapTunggakanForApi } from "@/lib/arrears/arrears"; // Make sure this path is correct!

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // <-- Update the type to a Promise
) {
  try {
    const { id: residentId } = await params;

    // 1. Fetch the resident, their active unit, all monthly charges, AND their transactions
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
      include: {
        occupancies: {
          where: { status: "CURRENT" },
          include: {
            unit: { include: { quarterCategory: true } },
          },
        },
        monthlyCharges: {
          include: {
            additionalCharges: true,
            rebates: true,
          },
        },
        // Pull their full transaction ledger, newest first
        transactions: {
          orderBy: { transactionDate: 'desc' },
        }
      },
    });

    if (!resident) {
      return NextResponse.json({ ok: false, message: "Penghuni tidak dijumpai." }, { status: 404 });
    }

    // 2. Format the Profile Data
    const activeOccupancy = resident.occupancies[0];
    const mappedCharges = mapTunggakanForApi(resident); // Reuse our math helper!
    
    // Quick heuristic to calculate age from IC Number (e.g., 850214-XX-XXXX)
    let age = 0;
    if (resident.icNumber && resident.icNumber.length >= 6) {
        const yearStr = resident.icNumber.substring(0, 2);
        const year = parseInt(yearStr, 10);
        const fullYear = year > 50 ? 1900 + year : 2000 + year; 
        age = new Date().getFullYear() - fullYear;
    }

    const profile = {
      fullName: resident.fullName,
      icNumber: resident.icNumber,
      age: age,
      kelas: activeOccupancy?.unit.quarterCategory.categoryName || "Tiada",
      unit: activeOccupancy?.unit.unitCode || "Tiada",
      tarikhMasuk: activeOccupancy?.createdAt ? new Date(activeOccupancy.createdAt).toLocaleDateString('en-GB') : "N/A",
      tarikhKeluar: "N/A",
      status: activeOccupancy ? "Aktif" : "Tidak Aktif",
      charges: {
        sewa: mappedCharges.sewa,
        senggara: mappedCharges.senggara,
        penalti: mappedCharges.penalti,
        tambahan: mappedCharges.tambahan,
        rebat: mappedCharges.rebat,
        total: mappedCharges.jumlahTunggakan,
      }
    };

    // 3. Format the Historical Ledger Data
    const history = resident.transactions.map(t => ({
      tarikh: new Date(t.transactionDate).toLocaleDateString('en-GB'),
      id: t.id.substring(0, 8).toUpperCase(), // Create a short transaction ID for the UI
      kategori: t.status === "NORMAL" ? t.category.replace(/_/g, ' ') : `${t.category.replace(/_/g, ' ')} (${t.status})`,
      catatan: t.description || "-",
      debit: Number(t.debitAmount || 0),
      kredit: Number(t.creditAmount || 0),
    }));

    // 4. Send it back to the frontend
    return NextResponse.json({
      ok: true,
      data: {
        profile,
        history
      }
    });

  } catch (error) {
    console.error("[API_ARREAR_DETAILS_GET] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Ralat pangkalan data berlaku semasa mengambil butiran." },
      { status: 500 }
    );
  }
}
