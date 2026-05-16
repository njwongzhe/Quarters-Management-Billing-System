import type { DocumentCategory, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import type {
  ExtractResult,
  ProcessingDraft,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { createAuditLog } from "@/lib/audit-logs";
import { getCurrentAdmin } from "@/lib/current-admin";
import { prisma } from "@/lib/prisma";
import { createPendingBayaranRows } from "@/lib/uploaded-document/bayaran/import";
import {
  mapUploadedDocumentForReview,
} from "@/lib/uploaded-document/documents";
import { createPendingKuartersRows } from "@/lib/uploaded-document/kuarters/import";
import { createPendingPenghuniRows } from "@/lib/uploaded-document/penghuni/import";
import { createPendingTunggakanRows } from "@/lib/uploaded-document/tunggakan/import";

export const uploadedDocumentTransactionOptions = {
  maxWait: 30000,
  timeout: 300000,
};

type ImportKind = ProcessingDraft["kind"];
type ImportActor = {
  profile: {
    id: string;
    fullName: string;
  };
} | null;

export type CreateUploadedDocumentPayload = {
  fileName: string;
  fileType: string;
  fileSize: number;
  extractResult: ExtractResult;
};

type CreateUploadedDocumentOptions = {
  kind: ImportKind;
  currentAdmin: ImportActor;
  payload: CreateUploadedDocumentPayload;
};

function documentCategoryForKind(kind: ImportKind) {
  return kind.toUpperCase() as DocumentCategory;
}

export function parseCreateUploadedDocumentPayload(
  body: unknown,
): CreateUploadedDocumentPayload {
  const payload = body && typeof body === "object" ? body : {};
  const {
    fileName,
    fileType,
    fileSize,
    extractResult,
  } = payload as Partial<CreateUploadedDocumentPayload>;

  if (
    !fileName ||
    !fileType ||
    typeof fileSize !== "number" ||
    !extractResult
  ) {
    throw new Error("Data dokumen tidak lengkap.");
  }

  return { fileName, fileType, fileSize, extractResult };
}

export async function createUploadedDocumentForKind({
  kind,
  currentAdmin,
  payload,
}: CreateUploadedDocumentOptions) {
  if (payload.extractResult.documentType !== kind) {
    throw new Error(`Jenis data ekstrak tidak sepadan dengan route ${kind}.`);
  }

  const document = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const createdDocument = await tx.uploadedDocument.create({
        data: {
          fileName: payload.fileName,
          originalName: payload.fileName,
          fileType: payload.fileType,
          fileSize: payload.fileSize,
          category: documentCategoryForKind(kind),
          uploadedById: currentAdmin?.profile.id ?? null,
          description: "Menunggu semakan dan pengesahan data ekstrak.",
          remark: null,
        },
      });

      if (kind === "bayaran") {
        await createPendingBayaranRows(tx, createdDocument.id, payload.extractResult);
      } else if (kind === "tunggakan") {
        await createPendingTunggakanRows(tx, createdDocument.id, payload.extractResult);
      } else if (kind === "penghuni") {
        await createPendingPenghuniRows(tx, createdDocument.id, payload.extractResult);
      } else {
        await createPendingKuartersRows(tx, createdDocument.id, payload.extractResult);
      }

      const updatedDocument = await tx.uploadedDocument.findUniqueOrThrow({
        where: { id: createdDocument.id },
        include: { uploadedBy: { select: { fullName: true } } },
      });

      await createAuditLog(tx, {
        actor: currentAdmin,
        moduleName: "Muat Naik",
        targetData: `${documentCategoryForKind(kind)} / ${payload.fileName}`,
        actionType: "IMPORT_EXTRACT",
        description: `Muat naik dokumen ${documentCategoryForKind(kind)}: ${payload.fileName}.`,
      });

      return updatedDocument;
    },
    uploadedDocumentTransactionOptions,
  );

  return mapUploadedDocumentForReview(document);
}

export function createUploadedDocumentImportHandler(kind: ImportKind) {
  return async function POST(request: Request) {
    try {
      const currentAdmin = await getCurrentAdmin();
      const payload = parseCreateUploadedDocumentPayload(await request.json());
      const document = await createUploadedDocumentForKind({
        kind,
        currentAdmin,
        payload,
      });

      return NextResponse.json({ success: true, data: { document } });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : `Gagal menyimpan dokumen ${kind}.`,
        },
        { status: 500 },
      );
    }
  };
}
