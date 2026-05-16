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
  timeout: 300000,
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

  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const document = await tx.uploadedDocument.findUnique({
        where: { id: uploadedDocumentId },
        include: { uploadedBy: { select: { fullName: true } } },
      });

      if (!document) {
        throw new Error("Dokumen tidak ditemui.");
      }

      if (document.category !== kind.toUpperCase()) {
        throw new Error("Jenis dokumen semakan tidak sepadan.");
      }

      let verifyResult: VerifyResult;

      if (kind === "bayaran") {
        verifyResult = await verifyBayaranDrafts(tx, uploadedDocumentId, selectedKeys);
      } else if (kind === "tunggakan") {
        verifyResult = await verifyTunggakanDrafts(
          tx,
          uploadedDocumentId,
          selectedKeys,
        );
      } else if (kind === "penghuni") {
        verifyResult = await verifyPenghuniDrafts(tx, uploadedDocumentId, selectedKeys);
      } else {
        verifyResult = await verifyKuartersDrafts(tx, uploadedDocumentId, selectedKeys);
      }

      const remainingDocument = await tx.uploadedDocument.findUnique({
        where: { id: uploadedDocumentId },
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
