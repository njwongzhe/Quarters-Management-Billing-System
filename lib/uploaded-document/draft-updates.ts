import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import type { ExtractResult } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { createAuditLog } from "@/lib/audit/audit-logs";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { prisma } from "@/lib/prisma";
import {
  updateBayaranDraft,
  updateBayaranDrafts,
} from "@/lib/uploaded-document/bayaran/draft-updates";
import { mapUploadedDocumentForReview } from "@/lib/uploaded-document/documents";
import {
  deleteKuartersCategoryDraft,
  deleteKuartersUnitDraft,
  updateKuartersCategoryDraft,
  updateKuartersDrafts,
  updateKuartersUnitDraft,
} from "@/lib/uploaded-document/kuarters/draft-updates";
import {
  deletePenghuniDraft,
  updatePenghuniDraft,
  updatePenghuniDrafts,
} from "@/lib/uploaded-document/penghuni/draft-updates";
import {
  updateTunggakanDraft,
  updateTunggakanDrafts,
} from "@/lib/uploaded-document/tunggakan/draft-updates";

const uploadedDocumentTransactionOptions = {
  maxWait: 30000,
  timeout: 300000,
};

type DraftUpdateKind = ExtractResult["documentType"];

type DraftUpdateRouteContext = {
  params: Promise<{ id: string }>;
};

export async function updateUploadedDocumentDraftForKind(
  kind: DraftUpdateKind,
  uploadedDocumentId: string,
  body: unknown,
  currentAdmin: Awaited<ReturnType<typeof getCurrentAdmin>>,
) {
  const payload = body && typeof body === "object" ? body : {};
  const { action, extractResult } = payload as {
    action?: string;
    extractResult?: ExtractResult;
  };
  let updatedPenghuniRecord: unknown = null;
  let updatedTunggakanRecord: unknown = null;
  let updatedBayaranRecord: unknown = null;

  const document = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const existingDocument = await tx.uploadedDocument.findUnique({
        where: { id: uploadedDocumentId },
        include: { uploadedBy: { select: { fullName: true } } },
      });

      if (!existingDocument) {
        throw new Error("Dokumen tidak ditemui.");
      }

      if (existingDocument.category !== kind.toUpperCase()) {
        throw new Error("Jenis dokumen semakan tidak sepadan.");
      }

      if (kind === "bayaran") {
        if (action === "update-bayaran-record") {
          const record =
            "record" in payload ? (payload as { record?: unknown }).record : null;

          if (!record || typeof record !== "object" || Array.isArray(record)) {
            throw new Error("Data bayaran tidak lengkap.");
          }

          updatedBayaranRecord = await updateBayaranDraft(
            tx,
            uploadedDocumentId,
            record as Parameters<typeof updateBayaranDraft>[2],
          );
        } else if (extractResult?.documentType === "bayaran") {
          await updateBayaranDrafts(tx, uploadedDocumentId, extractResult);
        } else {
          throw new Error("Data ekstrak bayaran tidak lengkap.");
        }
      } else if (kind === "tunggakan") {
        if (action === "update-tunggakan-record") {
          const record =
            "record" in payload ? (payload as { record?: unknown }).record : null;

          if (!record || typeof record !== "object" || Array.isArray(record)) {
            throw new Error("Data tunggakan tidak lengkap.");
          }

          updatedTunggakanRecord = await updateTunggakanDraft(
            tx,
            uploadedDocumentId,
            record as Parameters<typeof updateTunggakanDraft>[2],
          );
        } else if (extractResult?.documentType === "tunggakan") {
          await updateTunggakanDrafts(tx, uploadedDocumentId, extractResult);
        } else {
          throw new Error("Data ekstrak tunggakan tidak lengkap.");
        }
      } else if (kind === "penghuni") {
        if (action === "update-penghuni-record") {
          const record =
            "record" in payload ? (payload as { record?: unknown }).record : null;

          if (!record || typeof record !== "object" || Array.isArray(record)) {
            throw new Error("Data penghuni tidak lengkap.");
          }

          updatedPenghuniRecord = await updatePenghuniDraft(
            tx,
            uploadedDocumentId,
            record as Parameters<typeof updatePenghuniDraft>[2],
          );
        } else if (extractResult?.documentType === "penghuni") {
          await updatePenghuniDrafts(tx, uploadedDocumentId, extractResult.records);
        } else {
          throw new Error("Data ekstrak penghuni tidak lengkap.");
        }
      } else if (kind === "kuarters") {
        if (action === "update-kuarters-category") {
          await updateKuartersCategoryDraft(tx, uploadedDocumentId, payload);
        } else if (action === "update-kuarters-unit") {
          await updateKuartersUnitDraft(tx, uploadedDocumentId, payload);
        } else if (extractResult?.documentType === "kuarters") {
          await updateKuartersDrafts(tx, uploadedDocumentId, extractResult.records);
        } else {
          throw new Error("Data ekstrak kuarters tidak lengkap.");
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

  if (updatedPenghuniRecord) {
    return { record: updatedPenghuniRecord };
  }

  if (updatedTunggakanRecord) {
    return { record: updatedTunggakanRecord };
  }

  if (updatedBayaranRecord) {
    return { record: updatedBayaranRecord };
  }

  return mapUploadedDocumentForReview(document);
}

export function createUploadedDocumentDraftUpdateHandler(kind: DraftUpdateKind) {
  return async function PATCH(request: Request, context: DraftUpdateRouteContext) {
    try {
      const { id } = await context.params;
      const body = await request.json();
      const payload = body && typeof body === "object" ? body : {};

      const action =
        "action" in payload ? (payload as { action?: unknown }).action : undefined;

      if (
        kind === "kuarters" &&
        (action === "delete-kuarters-unit" ||
          action === "delete-kuarters-category")
      ) {
        await getCurrentAdmin();

        if (action === "delete-kuarters-unit") {
          await deleteKuartersUnitDraft(prisma, id, payload);

          return NextResponse.json({
            success: true,
            data: {
              deletedUnitId:
                "unitId" in payload ? (payload as { unitId?: unknown }).unitId : null,
            },
          });
        }

        await deleteKuartersCategoryDraft(prisma, id, payload);

        return NextResponse.json({
          success: true,
          data: {
            deletedCategoryId:
              "categoryId" in payload
                ? (payload as { categoryId?: unknown }).categoryId
                : null,
          },
        });
      }

      if (
        (kind === "bayaran" || kind === "penghuni" || kind === "tunggakan") &&
        (action === "update-bayaran-record" ||
          action === "update-penghuni-record" ||
          action === "update-tunggakan-record" ||
          action === "delete-penghuni-record")
      ) {
        await getCurrentAdmin();

        if (action === "delete-penghuni-record") {
          const residentId =
            "residentId" in payload
              ? (payload as { residentId?: unknown }).residentId
              : null;

          if (typeof residentId !== "string") {
            throw new Error("Rekod penghuni tidak ditemui.");
          }

          await deletePenghuniDraft(prisma, id, residentId);

          return NextResponse.json({
            success: true,
            data: { deletedResidentId: residentId },
          });
        }

        if (action === "update-tunggakan-record") {
          const record =
            "record" in payload ? (payload as { record?: unknown }).record : null;

          if (!record || typeof record !== "object" || Array.isArray(record)) {
            throw new Error("Data tunggakan tidak lengkap.");
          }

          const updatedRecord = await updateTunggakanDraft(
            prisma,
            id,
            record as Parameters<typeof updateTunggakanDraft>[2],
          );

          return NextResponse.json({
            success: true,
            data: { record: updatedRecord },
          });
        }

        if (action === "update-bayaran-record") {
          const record =
            "record" in payload ? (payload as { record?: unknown }).record : null;

          if (!record || typeof record !== "object" || Array.isArray(record)) {
            throw new Error("Data bayaran tidak lengkap.");
          }

          const updatedRecord = await updateBayaranDraft(
            prisma,
            id,
            record as Parameters<typeof updateBayaranDraft>[2],
          );

          return NextResponse.json({
            success: true,
            data: { record: updatedRecord },
          });
        }

        const record =
          "record" in payload ? (payload as { record?: unknown }).record : null;

        if (!record || typeof record !== "object" || Array.isArray(record)) {
          throw new Error("Data penghuni tidak lengkap.");
        }

        const updatedRecord = await updatePenghuniDraft(
          prisma,
          id,
          record as Parameters<typeof updatePenghuniDraft>[2],
        );

        return NextResponse.json({
          success: true,
          data: { record: updatedRecord },
        });
      }

      const currentAdmin = await getCurrentAdmin();
      const updateResult = await updateUploadedDocumentDraftForKind(
        kind,
        id,
        payload,
        currentAdmin,
      );
      const data =
        updateResult && typeof updateResult === "object" && "record" in updateResult
          ? updateResult
          : { document: updateResult };

      return NextResponse.json({
        success: true,
        data,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Gagal mengemas kini dokumen.",
        },
        { status: 500 },
      );
    }
  };
}
