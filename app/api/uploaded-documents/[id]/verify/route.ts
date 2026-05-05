import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/current-admin";
import {
  applyVerifiedPenghuniOccupancy,
  parseExtractResult,
} from "@/lib/uploaded-documents";
import type { ExtractResult } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import type {
  ExtractedBayaranRecord,
  ExtractedPenghuniRecord,
  ExtractedQuarterRecord,
  ExtractedTunggakanRecord,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadedDocumentTransactionOptions = {
  maxWait: 30000,
  timeout: 300000,
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const currentAdmin = await getCurrentAdmin();
    const { id } = await context.params;
    const verifiedAt = new Date();
    const body = await request.json().catch(() => null);
    const selectedKeys: Set<string> | null = Array.isArray(body?.selectedKeys)
      ? new Set(
          body.selectedKeys.filter(
            (key: unknown): key is string => typeof key === "string",
          ),
        )
      : null;

    const remainingExtractResult = await prisma.$transaction(
      async (tx) => {
        const document = await tx.uploadedDocument.findUnique({
          where: { id },
          select: {
            remark: true,
            recordStatus: true,
          },
        });

        if (!document) {
          throw new Error("Dokumen tidak ditemui.");
        }

        if (document.recordStatus !== "PENDING") {
          throw new Error("Dokumen ini sudah diproses.");
        }

        const extractResult = parseExtractResult(document.remark);

        if (selectedKeys && selectedKeys.size === 0) {
          throw new Error("Sila pilih sekurang-kurangnya satu rekod untuk disahkan.");
        }

        if (extractResult && selectedKeys) {
          const selectedExtractResult = buildSelectedExtractResult(
            extractResult,
            selectedKeys,
          );
          const nextRemainingExtractResult = buildRemainingExtractResult(
            extractResult,
            selectedKeys,
          );

          if (selectedExtractResult.records.length === 0) {
            throw new Error("Rekod dipilih tidak ditemui.");
          }

          const verifiedRows = await verifySelectedExtractResult(
            tx,
            id,
            verifiedAt,
            selectedExtractResult,
          );

          if (verifiedRows === 0) {
            throw new Error(
              "Rekod dipilih tidak dapat disahkan. Sila semak status rekod.",
            );
          }

          if (selectedExtractResult.documentType === "penghuni") {
            await applyVerifiedPenghuniOccupancy(tx, selectedExtractResult);
          }

          await tx.uploadedDocument.update({
            where: { id },
            data:
              nextRemainingExtractResult.records.length > 0
                ? {
                    remark: JSON.stringify(nextRemainingExtractResult),
                    recordStatus: "PENDING",
                  }
                : {
                    recordStatus: "VERIFIED",
                    verifiedAt,
                  },
          });

          return nextRemainingExtractResult.records.length > 0
            ? nextRemainingExtractResult
            : null;
        }

        await tx.$executeRaw`
          UPDATE "Resident"
          SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          UPDATE "QuarterCategory"
          SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          UPDATE "Unit"
          SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          UPDATE "ArrearsSummary"
          SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          UPDATE "Payment"
          SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.uploadedDocument.update({
          where: {
            id,
          },
          data: {
            recordStatus: "VERIFIED",
            verifiedAt,
          },
        });
      },
      uploadedDocumentTransactionOptions,
    );

    return NextResponse.json({
      success: true,
      message: "Data berjaya disahkan.",
      data: {
        remainingExtractResult,
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

type ExtractRecord = ExtractResult["records"][number];

function getExtractRecordKey(
  documentType: ExtractResult["documentType"],
  record: ExtractRecord,
) {
  if (documentType === "bayaran") {
    const bayaranRecord = record as ExtractedBayaranRecord;
    return (
      bayaranRecord.paymentId ??
      `${bayaranRecord.page}-${bayaranRecord.bil}-${bayaranRecord.noGajiNoKp}-${bayaranRecord.noRujukan}`
    );
  }

  if (documentType === "tunggakan") {
    const tunggakanRecord = record as ExtractedTunggakanRecord;
    return (
      tunggakanRecord.arrearsSummaryId ??
      `${tunggakanRecord.noKadPengenalan}-${tunggakanRecord.sourceSheet}-${tunggakanRecord.sourceRow}`
    );
  }

  if (documentType === "penghuni") {
    const penghuniRecord = record as ExtractedPenghuniRecord;
    return (
      penghuniRecord.residentId ??
      `${penghuniRecord.noKadPengenalan}-${penghuniRecord.sourceSheet}-${penghuniRecord.sourceRow}`
    );
  }

  const kuartersRecord = record as ExtractedQuarterRecord;
  return kuartersRecord.categoryId ?? kuartersRecord.id;
}

function buildSelectedExtractResult(
  extractResult: ExtractResult,
  selectedKeys: Set<string>,
) {
  return buildExtractResultWithRecords(
    extractResult,
    extractResult.records.filter((record) =>
      selectedKeys.has(getExtractRecordKey(extractResult.documentType, record)),
    ) as ExtractResult["records"],
  );
}

function buildRemainingExtractResult(
  extractResult: ExtractResult,
  selectedKeys: Set<string>,
) {
  return buildExtractResultWithRecords(
    extractResult,
    extractResult.records.filter(
      (record) =>
        !selectedKeys.has(getExtractRecordKey(extractResult.documentType, record)),
    ) as ExtractResult["records"],
  );
}

function buildExtractResultWithRecords(
  extractResult: ExtractResult,
  records: ExtractResult["records"],
): ExtractResult {
  if (extractResult.documentType === "bayaran") {
    const bayaranRecords = records as typeof extractResult.records;
    return {
      ...extractResult,
      recordCount: bayaranRecords.length,
      records: bayaranRecords,
    };
  }

  if (extractResult.documentType === "tunggakan") {
    const tunggakanRecords = records as typeof extractResult.records;
    return {
      ...extractResult,
      recordCount: tunggakanRecords.filter(
        (record) => record.importStatus !== "IGNORED",
      ).length,
      totalAmount: tunggakanRecords
        .filter((record) => record.importStatus !== "IGNORED")
        .reduce((total, record) => total + Number(record.jumlahTunggakan || 0), 0)
        .toFixed(2),
      records: tunggakanRecords,
    };
  }

  if (extractResult.documentType === "kuarters") {
    const kuartersRecords = records as typeof extractResult.records;
    return {
      ...extractResult,
      recordCount: kuartersRecords.length,
      totalUnits: kuartersRecords.reduce(
        (total, record) => total + record.units.length,
        0,
      ),
      records: kuartersRecords,
    };
  }

  const penghuniRecords = records as typeof extractResult.records;
  return {
    ...extractResult,
    recordCount: penghuniRecords.length,
    records: penghuniRecords,
  };
}

async function verifySelectedExtractResult(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  verifiedAt: Date,
  extractResult: ExtractResult,
) {
  let verifiedRows = 0;

  if (extractResult.documentType === "bayaran") {
    const ids = extractResult.records
      .map((record) => record.paymentId)
      .filter((value): value is string => Boolean(value));
    const residentIds = extractResult.records
      .map((record) => record.residentId)
      .filter((value): value is string => Boolean(value));

    if (ids.length > 0) {
      verifiedRows += await tx.$executeRaw`
        UPDATE "Payment"
        SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
        WHERE "id" IN (${Prisma.join(ids.map((item) => Prisma.sql`${item}::uuid`))})
          AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
          AND "recordStatus" = 'PENDING'::"RecordStatus"
      `;
    }

    verifiedRows += await verifySelectedResidents(
      tx,
      uploadedDocumentId,
      verifiedAt,
      residentIds,
    );
  }

  if (extractResult.documentType === "tunggakan") {
    const ids = extractResult.records
      .map((record) => record.arrearsSummaryId)
      .filter((value): value is string => Boolean(value));
    const residentIds = extractResult.records
      .map((record) => record.residentId)
      .filter((value): value is string => Boolean(value));

    if (ids.length > 0) {
      verifiedRows += await tx.$executeRaw`
        UPDATE "ArrearsSummary"
        SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
        WHERE "id" IN (${Prisma.join(ids.map((item) => Prisma.sql`${item}::uuid`))})
          AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
          AND "recordStatus" = 'PENDING'::"RecordStatus"
      `;
    }

    verifiedRows += await verifySelectedResidents(
      tx,
      uploadedDocumentId,
      verifiedAt,
      residentIds,
    );
  }

  if (extractResult.documentType === "penghuni") {
    const ids = extractResult.records
      .map((record) => record.residentId)
      .filter((value): value is string => Boolean(value));

    if (ids.length > 0) {
      verifiedRows += await tx.$executeRaw`
        UPDATE "Resident"
        SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
        WHERE "id" IN (${Prisma.join(ids.map((item) => Prisma.sql`${item}::uuid`))})
          AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
          AND "recordStatus" = 'PENDING'::"RecordStatus"
      `;
    }
  }

  if (extractResult.documentType === "kuarters") {
    const categoryIds = extractResult.records
      .map((record) => record.categoryId)
      .filter((value): value is string => Boolean(value));
    const unitIds = extractResult.records
      .flatMap((record) => record.units.map((unit) => unit.unitId))
      .filter((value): value is string => Boolean(value));

    if (categoryIds.length > 0) {
      verifiedRows += await tx.$executeRaw`
        UPDATE "QuarterCategory"
        SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
        WHERE "id" IN (${Prisma.join(
          categoryIds.map((item) => Prisma.sql`${item}::uuid`),
        )})
          AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
          AND "recordStatus" = 'PENDING'::"RecordStatus"
      `;
    }

    if (unitIds.length > 0) {
      verifiedRows += await tx.$executeRaw`
        UPDATE "Unit"
        SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
        WHERE "id" IN (${Prisma.join(unitIds.map((item) => Prisma.sql`${item}::uuid`))})
          AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
          AND "recordStatus" = 'PENDING'::"RecordStatus"
      `;
    }
  }

  return verifiedRows;
}

async function verifySelectedResidents(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  verifiedAt: Date,
  residentIds: string[],
) {
  if (residentIds.length === 0) {
    return 0;
  }

  return tx.$executeRaw`
    UPDATE "Resident"
    SET "recordStatus" = 'VERIFIED'::"RecordStatus", "verifiedAt" = ${verifiedAt}, "updatedAt" = NOW()
    WHERE "id" IN (${Prisma.join(
      residentIds.map((item) => Prisma.sql`${item}::uuid`),
    )})
      AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
      AND "recordStatus" = 'PENDING'::"RecordStatus"
  `;
}
