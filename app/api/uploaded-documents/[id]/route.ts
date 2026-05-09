import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  getBayaranPaymentDate,
  mapUploadedDocumentForReview,
} from "@/lib/uploaded-documents";
import { createAuditLog } from "@/lib/audit-logs";
import { getCurrentAdmin } from "@/lib/current-admin";
import { prisma } from "@/lib/prisma";
import type { ExtractedQuarterRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadedDocumentTransactionOptions = {
  maxWait: 30000,
  timeout: 300000,
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeKuartersText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeKuartersMoney(value: unknown) {
  const normalizedValue =
    typeof value === "string" ? value.trim() : String(value ?? "");
  const amount = Number(normalizedValue.replace(/,/g, ""));

  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function rawData(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {}));
}

async function findCategoryConflictInSameDocument(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  categoryDraftId: string,
  categoryName: string,
  address: string,
) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "QuarterCategoryDraft"
    WHERE "id" <> ${categoryDraftId}::uuid
      AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
      AND UPPER(TRIM(regexp_replace("categoryName", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${categoryName}, '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE("address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(COALESCE(${address}::text, ''), '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return rows[0]?.id ?? "";
}

async function findUnitConflictInSameDraftCategory(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  categoryDraftId: string,
  unitDraftId: string,
  unitCode: string,
) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "UnitDraft"
    WHERE "id" <> ${unitDraftId}::uuid
      AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
      AND "categoryDraftId" = ${categoryDraftId}::uuid
      AND UPPER(TRIM(regexp_replace("unitCode", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${unitCode}, '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return rows[0]?.id ?? "";
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const document = await prisma.uploadedDocument.findUnique({
      where: { id },
      include: { uploadedBy: { select: { fullName: true } } },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, message: "Dokumen tidak ditemui." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { document: await mapUploadedDocumentForReview(document) },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal mendapatkan dokumen.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const currentAdmin = await getCurrentAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const { action, extractResult } = body ?? {};

    const document = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const existingDocument = await tx.uploadedDocument.findUnique({
          where: { id },
          include: { uploadedBy: { select: { fullName: true } } },
        });

        if (!existingDocument) {
          throw new Error("Dokumen tidak ditemui.");
        }

        if (action === "update-kuarters-category") {
          const categoryId = normalizeKuartersText(body?.categoryId);
          const categoryName = normalizeKuartersText(body?.categoryName);
          const address = normalizeKuartersText(body?.address, "N/A");
          const rentalPrice = normalizeKuartersMoney(body?.rentalPrice);
          const maintenancePrice = normalizeKuartersMoney(body?.maintenancePrice);
          const penaltyPrice = normalizeKuartersMoney(body?.penaltyPrice);

          if (!categoryId || !categoryName) {
            throw new Error("Data kategori kuarters tidak lengkap.");
          }

          const conflictId = await findCategoryConflictInSameDocument(
            tx,
            id,
            categoryId,
            categoryName,
            address,
          );

          if (conflictId) {
            throw new Error(
              `Kategori dan alamat kuarters bertindih dalam dokumen ini: ${categoryName}.`,
            );
          }

          const currentCategory = await tx.quarterCategoryDraft.findFirst({
            where: { id: categoryId, uploadedDocumentId: id },
          });

          if (!currentCategory) {
            throw new Error("Kategori kuarters tidak boleh dikemas kini.");
          }

          await tx.quarterCategoryDraft.update({
            where: { id: categoryId },
            data: {
              categoryName,
              address,
              rentalPrice,
              maintenancePrice,
              penaltyPrice,
            },
          });
        } else if (action === "update-kuarters-unit") {
          const unitId = normalizeKuartersText(body?.unitId);
          const categoryId = normalizeKuartersText(body?.categoryId);
          const unitCode = normalizeKuartersText(body?.unitCode);

          if (!unitId || !categoryId || !unitCode) {
            throw new Error("Data unit kuarters tidak lengkap.");
          }

          const conflictId = await findUnitConflictInSameDraftCategory(
            tx,
            id,
            categoryId,
            unitId,
            unitCode,
          );

          if (conflictId) {
            throw new Error(
              `Kod unit bertindih dalam dokumen ini untuk kategori yang sama: ${unitCode}.`,
            );
          }

          await tx.unitDraft.updateMany({
            where: { id: unitId, uploadedDocumentId: id, categoryDraftId: categoryId },
            data: { unitCode },
          });
        } else if (extractResult?.documentType === "bayaran") {
          const paymentDate = getBayaranPaymentDate(extractResult.paymentMonth);
          const nextIds = new Set<string>(
            extractResult.records
              .map((record: { paymentId?: string }) => record.paymentId)
              .filter((value: unknown): value is string => typeof value === "string"),
          );

          await tx.paymentDraft.deleteMany({
            where: { uploadedDocumentId: id, id: { notIn: [...nextIds] } },
          });

          for (const record of extractResult.records) {
            if (!record.paymentId) {
              continue;
            }

            await tx.paymentDraft.updateMany({
              where: { id: record.paymentId, uploadedDocumentId: id },
              data: {
                residentName: record.nama,
                residentIcNumber: record.noGajiNoKp,
                department: record.ptjpkName || record.jabatanName || null,
                paymentDate,
                receiptNo: record.noResit || null,
                referenceNo: record.noRujukan || null,
                amount: record.amaunRm || "0",
                description: record.catatan || "bayaran",
                rawData: rawData(record),
              },
            });
          }
        } else if (extractResult?.documentType === "tunggakan") {
          const nextIds = new Set<string>(
            extractResult.records
              .map((record: { arrearsSummaryId?: string }) => record.arrearsSummaryId)
              .filter((value: unknown): value is string => typeof value === "string"),
          );

          await tx.arrearsSummaryDraft.deleteMany({
            where: { uploadedDocumentId: id, id: { notIn: [...nextIds] } },
          });

          for (const record of extractResult.records) {
            if (!record.arrearsSummaryId) {
              continue;
            }

            await tx.arrearsSummaryDraft.updateMany({
              where: { id: record.arrearsSummaryId, uploadedDocumentId: id },
              data: {
                residentName: record.nama,
                residentIcNumber: record.noKadPengenalan,
                totalArrearsAmount: record.jumlahTunggakan || "0",
                description: "tunggakan",
                rawData: rawData(record),
              },
            });
          }
        } else if (extractResult?.documentType === "kuarters") {
          for (const record of extractResult.records as ExtractedQuarterRecord[]) {
            if (!record.categoryId) {
              continue;
            }

            const categoryName = normalizeKuartersText(record.categoryName);
            const address = normalizeKuartersText(record.address, "N/A");
            const conflictId = await findCategoryConflictInSameDocument(
              tx,
              id,
              record.categoryId,
              categoryName,
              address,
            );

            if (conflictId) {
              throw new Error(
                `Kategori dan alamat kuarters bertindih dalam dokumen ini: ${categoryName}.`,
              );
            }

            await tx.quarterCategoryDraft.updateMany({
              where: { id: record.categoryId, uploadedDocumentId: id },
              data: {
                categoryName,
                address,
                rentalPrice: normalizeKuartersMoney(record.rentalPrice),
                maintenancePrice: normalizeKuartersMoney(record.maintenancePrice),
                penaltyPrice: normalizeKuartersMoney(record.penaltyPrice),
                rawData: rawData(record),
              },
            });

            const nextUnitIds = new Set(
              record.units
                .map((unit) => unit.unitId)
                .filter((value): value is string => Boolean(value)),
            );
            await tx.unitDraft.deleteMany({
              where: {
                uploadedDocumentId: id,
                categoryDraftId: record.categoryId,
                id: { notIn: [...nextUnitIds] },
              },
            });

            for (const unit of record.units) {
              if (!unit.unitId || !unit.unitCode) {
                continue;
              }

              const unitConflictId = await findUnitConflictInSameDraftCategory(
                tx,
                id,
                record.categoryId,
                unit.unitId,
                unit.unitCode,
              );

              if (unitConflictId) {
                throw new Error(
                  `Kod unit bertindih dalam dokumen ini untuk kategori yang sama: ${unit.unitCode}.`,
                );
              }

              await tx.unitDraft.updateMany({
                where: { id: unit.unitId, uploadedDocumentId: id },
                data: { unitCode: unit.unitCode, rawData: rawData(unit) },
              });
            }
          }
        } else {
          throw new Error("Data ekstrak tidak lengkap.");
        }

        await createAuditLog(tx, {
          actor: currentAdmin,
          moduleName: "Muat Naik",
          targetData: `${existingDocument.category} / ${existingDocument.originalName ?? existingDocument.fileName}`,
          actionType: "UPDATE",
          description: `Mengemaskini draf ekstrak dokumen ${existingDocument.category}: ${existingDocument.originalName ?? existingDocument.fileName}.`,
        });

        return existingDocument;
      },
      uploadedDocumentTransactionOptions,
    );

    return NextResponse.json({
      success: true,
      data: { document: await mapUploadedDocumentForReview(document) },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal mengemas kini dokumen.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const currentAdmin = await getCurrentAdmin();
    const { id } = await context.params;

    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const document = await tx.uploadedDocument.findUnique({
          where: { id },
          select: { category: true, fileName: true, originalName: true },
        });

        await tx.uploadedDocument.delete({ where: { id } });

        await createAuditLog(tx, {
          actor: currentAdmin,
          moduleName: "Muat Naik",
          targetData: `${document?.category ?? "DOKUMEN"} / ${document?.originalName ?? document?.fileName ?? id}`,
          actionType: "DELETE",
          description: `Memadam dokumen belum disahkan ${document?.category ?? "DOKUMEN"}: ${document?.originalName ?? document?.fileName ?? id}.`,
        });
      },
      uploadedDocumentTransactionOptions,
    );

    return NextResponse.json({
      success: true,
      message: "Dokumen berjaya dipadam.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal memadam dokumen.",
      },
      { status: 500 },
    );
  }
}
