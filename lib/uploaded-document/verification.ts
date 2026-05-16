import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import type { ExtractResult } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { getCurrentAdmin } from "@/lib/current-admin";
import { prisma } from "@/lib/prisma";
import { verifyBayaranDrafts } from "@/lib/uploaded-document/bayaran/verification";
import { mapUploadedDocumentForReview } from "@/lib/uploaded-document/documents";
import { verifyKuartersDrafts } from "@/lib/uploaded-document/kuarters/verification";
import { verifyPenghuniDrafts } from "@/lib/uploaded-document/penghuni/verification";
import { verifyTunggakanDrafts } from "@/lib/uploaded-document/tunggakan/verification";

const uploadedDocumentTransactionOptions = {
  maxWait: 30000,
  timeout: 120000,
};

const verifyChunkSizeByKind: Record<VerifyKind, number> = {
  bayaran: 50,
  tunggakan: 50,
  penghuni: 20,
  kuarters: Number.MAX_SAFE_INTEGER,
};

export type VerifyKind = ExtractResult["documentType"];

export type VerifyResult = {
  verifiedRows: number;
  failedMessages: string[];
  successMessages?: string[];
};

export type UploadedDocumentVerificationResult = VerifyResult & {
  message: string;
  remainingExtractResult: ExtractResult | null;
};

type VerificationAccumulator = VerifyResult & {
  document: Awaited<ReturnType<typeof findUploadedDocumentForVerification>> | null;
};

export function parseSelectedKeys(body: unknown) {
  const selectedKeys =
    body && typeof body === "object" && "selectedKeys" in body
      ? (body as { selectedKeys?: unknown }).selectedKeys
      : null;

  return Array.isArray(selectedKeys)
    ? selectedKeys.filter((key: unknown): key is string => typeof key === "string")
    : [];
}

export async function verifyUploadedDocumentForKind(
  kind: VerifyKind,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<UploadedDocumentVerificationResult> {
  if (selectedKeys.length === 0) {
    throw new Error("Sila pilih sekurang-kurangnya satu rekod untuk disahkan.");
  }

  const document = await findUploadedDocumentForVerification(uploadedDocumentId);

  if (!document) {
    throw new Error("Dokumen tidak ditemui.");
  }

  if (document.category !== kind.toUpperCase()) {
    throw new Error("Jenis dokumen semakan tidak sepadan.");
  }

  const result: VerificationAccumulator = {
    verifiedRows: 0,
    failedMessages: [],
    successMessages: [],
    document,
  };

  for (const chunk of chunkSelectedKeys(selectedKeys, verifyChunkSizeByKind[kind])) {
    const chunkResult = await prisma.$transaction(
      (tx: Prisma.TransactionClient) =>
        verifyUploadedDocumentChunk(tx, kind, uploadedDocumentId, chunk),
      uploadedDocumentTransactionOptions,
    );

    result.verifiedRows += chunkResult.verifiedRows;
    result.failedMessages.push(...chunkResult.failedMessages);
    result.successMessages?.push(...(chunkResult.successMessages ?? []));
  }

  const hasRemainingDrafts = await hasRemainingDraftRows(kind, uploadedDocumentId);

  if (!hasRemainingDrafts) {
    await prisma.uploadedDocument.delete({ where: { id: uploadedDocumentId } });
    result.document = null;
  } else {
    result.document = await findUploadedDocumentForVerification(uploadedDocumentId);
  }

  const remainingDraft = result.document
    ? await mapUploadedDocumentForReview(result.document)
    : null;
  const successSuffix =
    result.successMessages && result.successMessages.length > 0
      ? ` ${result.successMessages.join(" ")}`
      : "";
  const failedSuffix =
    result.failedMessages.length > 0 ? ` ${result.failedMessages.join(" ")}` : "";

  return {
    verifiedRows: result.verifiedRows,
    failedMessages: result.failedMessages,
    successMessages: result.successMessages,
    message:
      result.verifiedRows > 0
        ? `Data berjaya disahkan.${successSuffix}${failedSuffix}`
        : `Tiada rekod baharu disahkan.${failedSuffix}`,
    remainingExtractResult: remainingDraft?.extractResult ?? null,
  };
}

async function findUploadedDocumentForVerification(uploadedDocumentId: string) {
  return prisma.uploadedDocument.findUnique({
    where: { id: uploadedDocumentId },
    include: { uploadedBy: { select: { fullName: true } } },
  });
}

async function verifyUploadedDocumentChunk(
  tx: Prisma.TransactionClient,
  kind: VerifyKind,
  uploadedDocumentId: string,
  selectedKeys: string[],
) {
  if (kind === "bayaran") {
    return verifyBayaranDrafts(tx, uploadedDocumentId, selectedKeys);
  }

  if (kind === "tunggakan") {
    return verifyTunggakanDrafts(tx, uploadedDocumentId, selectedKeys);
  }

  if (kind === "penghuni") {
    return verifyPenghuniDrafts(tx, uploadedDocumentId, selectedKeys);
  }

  return verifyKuartersDrafts(tx, uploadedDocumentId, selectedKeys);
}

function chunkSelectedKeys(selectedKeys: string[], chunkSize: number) {
  const chunks: string[][] = [];

  for (let index = 0; index < selectedKeys.length; index += chunkSize) {
    chunks.push(selectedKeys.slice(index, index + chunkSize));
  }

  return chunks;
}

async function hasRemainingDraftRows(kind: VerifyKind, uploadedDocumentId: string) {
  if (kind === "bayaran") {
    return (await prisma.paymentDraft.count({ where: { uploadedDocumentId } })) > 0;
  }

  if (kind === "tunggakan") {
    return (
      (await prisma.arrearsSummaryDraft.count({ where: { uploadedDocumentId } })) > 0
    );
  }

  if (kind === "penghuni") {
    return (await prisma.residentDraft.count({ where: { uploadedDocumentId } })) > 0;
  }

  const [categoryCount, unitCount] = await Promise.all([
    prisma.quarterCategoryDraft.count({ where: { uploadedDocumentId } }),
    prisma.unitDraft.count({ where: { uploadedDocumentId } }),
  ]);

  return categoryCount + unitCount > 0;
}

type VerifyRouteContext = {
  params: Promise<{ id: string }>;
};

export function createUploadedDocumentVerifyHandler(kind: VerifyKind) {
  return async function POST(request: Request, context: VerifyRouteContext) {
    try {
      await getCurrentAdmin();
      const { id } = await context.params;
      const selectedKeys = parseSelectedKeys(await request.json().catch(() => null));

      if (selectedKeys.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Sila pilih sekurang-kurangnya satu rekod untuk disahkan.",
          },
          { status: 400 },
        );
      }

      const result = await verifyUploadedDocumentForKind(kind, id, selectedKeys);

      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          remainingExtractResult: result.remainingExtractResult,
          failedMessages: result.failedMessages,
          successMessages: result.successMessages ?? [],
          verifiedRows: result.verifiedRows,
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : `Gagal mengesahkan data ${kind}.`,
        },
        { status: 500 },
      );
    }
  };
}
