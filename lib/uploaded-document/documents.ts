import type { UploadedDocument } from "@prisma/client";

import type {
  ExtractResult,
  ProcessingDraft,
  ProcessingDraftSummary,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { buildBayaranExtractResultFromDraftRows } from "@/lib/uploaded-document/bayaran/documents";
import { buildKuartersExtractResultFromDraftRows } from "@/lib/uploaded-document/kuarters/documents";
import { buildPenghuniExtractResultFromDraftRows } from "@/lib/uploaded-document/penghuni/documents";
import { buildTunggakanExtractResultFromDraftRows } from "@/lib/uploaded-document/tunggakan/documents";
import { prisma } from "@/lib/prisma";

export type UploadedDocumentWithUploader = UploadedDocument & {
  uploadedBy?: {
    fullName: string;
  } | null;
};

export type ReviewBuildOptions = {
  useStoredReferences?: boolean;
};

const draftKindByCategory = {
  BAYARAN: "bayaran",
  TUNGGAKAN: "tunggakan",
  PENGHUNI: "penghuni",
  KUARTERS: "kuarters",
} as const;

type UploadedDocumentCategory = keyof typeof draftKindByCategory;

export type UploadedDocumentQueueItem = Pick<
  UploadedDocument,
  | "id"
  | "category"
  | "fileName"
  | "originalName"
  | "fileType"
  | "fileSize"
  | "uploadedAt"
> & {
  uploadedBy?: {
    fullName: string;
  } | null;
};

export function mapUploadedDocumentForQueue(
  document: UploadedDocumentQueueItem,
): ProcessingDraftSummary | null {
  const kind = draftKindByCategory[document.category as UploadedDocumentCategory];

  if (!kind) {
    return null;
  }

  return {
    id: document.id,
    kind,
    fileName: document.originalName ?? document.fileName,
    fileType: document.fileType,
    fileSize: document.fileSize,
    uploadedBy: document.uploadedBy?.fullName ?? "Username",
    uploadedAt: document.uploadedAt.toISOString(),
  };
}

export async function getUploadedDocumentsForQueue(
  category?: UploadedDocumentCategory,
) {
  const documents = await prisma.uploadedDocument.findMany({
    where: category
      ? {
          category,
        }
      : undefined,
    orderBy: {
      uploadedAt: "desc",
    },
    select: {
      id: true,
      category: true,
      fileName: true,
      originalName: true,
      fileType: true,
      fileSize: true,
      uploadedAt: true,
      uploadedBy: {
        select: {
          fullName: true,
        },
      },
    },
  });

  return documents
    .map(mapUploadedDocumentForQueue)
    .filter((document) => document !== null);
}

export async function mapUploadedDocumentForReview(
  document: UploadedDocumentWithUploader,
  options: ReviewBuildOptions = {},
): Promise<ProcessingDraft | null> {
  const extractResult = await buildExtractResultFromDraftRows(document, options);

  if (!extractResult) {
    return null;
  }

  // Parse parsingMode from remark JSON
  if (document.remark) {
    try {
      const parsedRemark = JSON.parse(document.remark);
      if (parsedRemark && typeof parsedRemark === "object" && "parsingMode" in parsedRemark) {
        extractResult.parsingMode = parsedRemark.parsingMode;
      }
    } catch {
      extractResult.parsingMode = "strict";
    }
  } else {
    extractResult.parsingMode = "strict";
  }

  return {
    id: document.id,
    kind: extractResult.documentType,
    fileName: document.originalName ?? document.fileName,
    fileType: document.fileType,
    fileSize: document.fileSize,
    uploadedBy: document.uploadedBy?.fullName ?? "Username",
    uploadedAt: document.uploadedAt.toISOString(),
    extractResult,
  };
}

async function buildExtractResultFromDraftRows(
  document: UploadedDocumentWithUploader,
  options: ReviewBuildOptions,
): Promise<ExtractResult | null> {
  if (document.category === "BAYARAN") {
    return buildBayaranExtractResultFromDraftRows(document.id, options);
  }

  if (document.category === "TUNGGAKAN") {
    return buildTunggakanExtractResultFromDraftRows(document.id, options);
  }

  if (document.category === "PENGHUNI") {
    return buildPenghuniExtractResultFromDraftRows(document.id, options);
  }

  if (document.category === "KUARTERS") {
    return buildKuartersExtractResultFromDraftRows(document.id, options);
  }

  return null;
}
