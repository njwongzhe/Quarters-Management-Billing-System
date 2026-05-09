import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  applyVerifiedPenghuniOccupancy,
  mapUploadedDocumentForReview,
} from "@/lib/uploaded-documents";
import { getCurrentAdmin } from "@/lib/current-admin";
import { prisma } from "@/lib/prisma";
import type { ExtractResult } from "@/app/pages/2_muat_naik/components/extract-review-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadedDocumentTransactionOptions = {
  maxWait: 30000,
  timeout: 300000,
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

type VerifyResult = {
  verifiedRows: number;
  failedMessages: string[];
};

async function findResidentIdByIc(tx: Prisma.TransactionClient, icNumber: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "Resident"
    WHERE regexp_replace("icNumber", '\\D', '', 'g') =
      regexp_replace(${icNumber}, '\\D', '', 'g')
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;

  return rows[0]?.id ?? "";
}

async function findQuarterCategoryByNameAddress(
  tx: Prisma.TransactionClient,
  categoryName: string,
  address: string | null,
) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "QuarterCategory"
    WHERE UPPER(TRIM(regexp_replace("categoryName", '\\s+', ' ', 'g'))) =
      UPPER(TRIM(regexp_replace(${categoryName}, '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE("address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(COALESCE(${address}::text, ''), '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return rows[0]?.id ?? "";
}

async function findUnitByCategoryIdAndCode(
  tx: Prisma.TransactionClient,
  categoryId: string,
  unitCode: string,
) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "Unit"
    WHERE "categoryId" = ${categoryId}::uuid
      AND UPPER(TRIM(regexp_replace("unitCode", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${unitCode}, '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return rows[0]?.id ?? "";
}

async function ensureResidentFromDraft(
  tx: Prisma.TransactionClient,
  draft: {
    fullName: string;
    icNumber: string;
    phone?: string | null;
    position?: string | null;
    department?: string | null;
    description?: string | null;
  },
) {
  const existingResidentId = await findResidentIdByIc(tx, draft.icNumber);

  if (existingResidentId) {
    return existingResidentId;
  }

  const resident = await tx.resident.create({
    data: {
      fullName: draft.fullName,
      icNumber: draft.icNumber,
      phone: draft.phone ?? null,
      position: draft.position ?? null,
      department: draft.department ?? null,
      description: draft.description ?? null,
    },
    select: { id: true },
  });

  return resident.id;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await getCurrentAdmin();
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const selectedKeys = Array.isArray(body?.selectedKeys)
      ? body.selectedKeys.filter((key: unknown): key is string => typeof key === "string")
      : [];

    if (selectedKeys.length === 0) {
      return NextResponse.json(
        { success: false, message: "Sila pilih sekurang-kurangnya satu rekod untuk disahkan." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const document = await tx.uploadedDocument.findUnique({
          where: { id },
          include: { uploadedBy: { select: { fullName: true } } },
        });

        if (!document) {
          throw new Error("Dokumen tidak ditemui.");
        }

        let verifyResult: VerifyResult;

        if (document.category === "BAYARAN") {
          verifyResult = await verifyBayaranDrafts(tx, id, selectedKeys);
        } else if (document.category === "TUNGGAKAN") {
          verifyResult = await verifyTunggakanDrafts(tx, id, selectedKeys);
        } else if (document.category === "PENGHUNI") {
          verifyResult = await verifyPenghuniDrafts(tx, id, selectedKeys);
        } else {
          verifyResult = await verifyKuartersDrafts(tx, id, selectedKeys);
        }

        const remainingDocument = await tx.uploadedDocument.findUnique({
          where: { id },
          include: { uploadedBy: { select: { fullName: true } } },
        });

        if (!remainingDocument) {
          throw new Error("Dokumen tidak ditemui.");
        }

        return {
          ...verifyResult,
          document: remainingDocument,
        };
      },
      uploadedDocumentTransactionOptions,
    );

    const remainingDraft = await mapUploadedDocumentForReview(result.document);
    const failedSuffix =
      result.failedMessages.length > 0
        ? ` ${result.failedMessages.join(" ")}`
        : "";

    return NextResponse.json({
      success: true,
      message:
        result.verifiedRows > 0
          ? `Data berjaya disahkan.${failedSuffix}`
          : `Tiada rekod baharu disahkan.${failedSuffix}`,
      data: {
        remainingExtractResult: remainingDraft?.extractResult ?? null,
        failedMessages: result.failedMessages,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal mengesahkan data.",
      },
      { status: 500 },
    );
  }
}

async function verifyBayaranDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const drafts = await tx.paymentDraft.findMany({
    where: { uploadedDocumentId, id: { in: selectedKeys } },
  });
  const failedMessages: string[] = [];
  let verifiedRows = 0;

  for (const draft of drafts) {
    const residentId = await ensureResidentFromDraft(tx, {
      fullName: draft.residentName,
      icNumber: draft.residentIcNumber,
      department: draft.department,
    });
    const existingPayment = await tx.payment.findFirst({
      where: {
        residentId,
        paymentDate: draft.paymentDate,
        receiptNo: draft.referenceNo ?? draft.receiptNo ?? undefined,
      },
      select: { id: true },
    });

    if (existingPayment) {
      failedMessages.push(`Bayaran ${draft.referenceNo ?? draft.residentName} telah wujud.`);
      await tx.paymentDraft.update({
        where: { id: draft.id },
        data: { isExisted: true, originalPaymentId: existingPayment.id },
      });
      continue;
    }

    await tx.payment.create({
      data: {
        residentId,
        paymentDate: draft.paymentDate,
        receiptNo: draft.referenceNo ?? draft.receiptNo,
        amount: draft.amount,
        description: draft.description,
      },
    });
    await tx.paymentDraft.delete({ where: { id: draft.id } });
    verifiedRows += 1;
  }

  return { verifiedRows, failedMessages };
}

async function verifyTunggakanDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const drafts = await tx.arrearsSummaryDraft.findMany({
    where: { uploadedDocumentId, id: { in: selectedKeys } },
  });
  const failedMessages: string[] = [];
  let verifiedRows = 0;

  for (const draft of drafts) {
    const residentId = await ensureResidentFromDraft(tx, {
      fullName: draft.residentName,
      icNumber: draft.residentIcNumber,
    });
    const existingSummary = await tx.arrearsSummary.findUnique({
      where: { residentId },
      select: { id: true },
    });

    if (existingSummary) {
      failedMessages.push(`Tunggakan ${draft.residentName} telah wujud.`);
      await tx.arrearsSummaryDraft.update({
        where: { id: draft.id },
        data: { isExisted: true, originalSummaryId: existingSummary.id },
      });
      continue;
    }

    await tx.arrearsSummary.create({
      data: {
        residentId,
        totalArrearsAmount: draft.totalArrearsAmount,
        description: draft.description,
      },
    });
    await tx.arrearsSummaryDraft.delete({ where: { id: draft.id } });
    verifiedRows += 1;
  }

  return { verifiedRows, failedMessages };
}

async function verifyPenghuniDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const drafts = await tx.residentDraft.findMany({
    where: { uploadedDocumentId, id: { in: selectedKeys } },
  });
  const failedMessages: string[] = [];
  let verifiedRows = 0;
  const verifiedRecords: ExtractResult = {
    documentType: "penghuni",
    recordCount: 0,
    records: [],
  };

  for (const draft of drafts) {
    const existingResidentId = await findResidentIdByIc(tx, draft.icNumber);

    if (existingResidentId) {
      failedMessages.push(`Penghuni ${draft.fullName} telah wujud.`);
      await tx.residentDraft.update({
        where: { id: draft.id },
        data: { isExisted: true, originalResidentId: existingResidentId },
      });
      continue;
    }

    const resident = await tx.resident.create({
      data: {
        fullName: draft.fullName,
        icNumber: draft.icNumber,
        phone: draft.phone,
        position: draft.position,
        department: draft.department,
        serviceLevel: draft.serviceLevel,
        status: draft.status,
        description: draft.description,
      },
      select: { id: true },
    });
    const rawRecord =
      draft.rawData && typeof draft.rawData === "object" && !Array.isArray(draft.rawData)
        ? draft.rawData
        : {};

    verifiedRecords.records.push({
      ...rawRecord,
      originalResidentId: resident.id,
      nama: draft.fullName,
      noKadPengenalan: draft.icNumber,
      kuarters: "kuarters" in rawRecord ? String(rawRecord.kuarters) : "",
      unit: "unit" in rawRecord ? String(rawRecord.unit) : "",
      alamatKuarters: draft.description ?? "",
      perhubungan: draft.phone ?? "",
      pekerjaan: draft.position ?? "",
      jabatan: draft.department ?? "",
      sourceSheet: "sourceSheet" in rawRecord ? String(rawRecord.sourceSheet) : "",
      sourceRow: "sourceRow" in rawRecord ? Number(rawRecord.sourceRow) : 0,
    });
    await tx.residentDraft.delete({ where: { id: draft.id } });
    verifiedRows += 1;
  }

  verifiedRecords.recordCount = verifiedRecords.records.length;
  await applyVerifiedPenghuniOccupancy(tx, verifiedRecords);

  return { verifiedRows, failedMessages };
}

async function verifyKuartersDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const selectedKeySet = new Set(selectedKeys);
  const categoryDrafts = await tx.quarterCategoryDraft.findMany({
    where: { uploadedDocumentId },
    include: { units: true },
    orderBy: { createdAt: "asc" },
  });
  const categoryIdByDraftId = new Map<string, string>();
  const failedMessages: string[] = [];
  let verifiedRows = 0;

  for (const draft of categoryDrafts) {
    const categorySelected = selectedKeySet.has(draft.id);
    let categoryId = await findQuarterCategoryByNameAddress(
      tx,
      draft.categoryName,
      draft.address,
    );

    if (categorySelected) {
      if (categoryId) {
        failedMessages.push(`Kategori ${draft.categoryName} telah wujud.`);
        await tx.quarterCategoryDraft.update({
          where: { id: draft.id },
          data: { isExisted: true, originalCategoryId: categoryId },
        });
      } else {
        const category = await tx.quarterCategory.create({
          data: {
            categoryName: draft.categoryName,
            address: draft.address,
            rentalPrice: draft.rentalPrice,
            maintenancePrice: draft.maintenancePrice,
            penaltyPrice: draft.penaltyPrice,
            uploadedDocumentId,
          },
          select: { id: true },
        });
        categoryId = category.id;
        await tx.quarterCategoryDraft.update({
          where: { id: draft.id },
          data: { isExisted: true, originalCategoryId: categoryId },
        });
        verifiedRows += 1;
      }
    }

    if (categoryId) {
      categoryIdByDraftId.set(draft.id, categoryId);
    }
  }

  for (const draft of categoryDrafts) {
    const categoryId =
      categoryIdByDraftId.get(draft.id) ??
      (await findQuarterCategoryByNameAddress(tx, draft.categoryName, draft.address));

    if (!categoryId) {
      continue;
    }

    for (const unit of draft.units) {
      if (!selectedKeySet.has(unit.id)) {
        continue;
      }

      const existingUnitId = await findUnitByCategoryIdAndCode(
        tx,
        categoryId,
        unit.unitCode,
      );

      if (existingUnitId) {
        failedMessages.push(`Unit ${unit.unitCode} telah wujud.`);
        await tx.unitDraft.update({
          where: { id: unit.id },
          data: { isExisted: true, originalUnitId: existingUnitId },
        });
        continue;
      }

      await tx.unit.create({
        data: {
          unitCode: unit.unitCode,
          status: "VACANT",
          categoryId,
          uploadedDocumentId,
        },
      });
      await tx.unitDraft.delete({ where: { id: unit.id } });
      verifiedRows += 1;
    }
  }

  await tx.quarterCategoryDraft.deleteMany({
    where: {
      uploadedDocumentId,
      units: { none: {} },
    },
  });

  return { verifiedRows, failedMessages };
}
