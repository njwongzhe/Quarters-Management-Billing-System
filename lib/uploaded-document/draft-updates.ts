import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import type { ExtractResult } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import {
  formatAuditTarget,
  formatAuditValue,
  recordDataAuditLog,
} from "@/lib/audit/data-audit";
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

type DraftAuditActor = Awaited<ReturnType<typeof getCurrentAdmin>>;

async function recordUploadedDocumentDraftAudit(
  tx: Prisma.TransactionClient,
  currentAdmin: DraftAuditActor,
  uploadedDocumentId: string,
  input: {
    summary: string;
    details?: Array<string | null | undefined | false>;
  },
) {
  const document = await tx.uploadedDocument.findUnique({
    where: { id: uploadedDocumentId },
    select: {
      category: true,
      fileName: true,
      originalName: true,
    },
  });

  await recordDataAuditLog(tx, {
    actor: currentAdmin,
    moduleName: "Muat Naik",
    actionType: "UPDATE",
    target: formatAuditTarget([
      document?.category ?? "DOKUMEN",
      document?.originalName ?? document?.fileName ?? uploadedDocumentId,
    ]),
    summary: input.summary,
    details: [
      `Kategori dokumen: ${document?.category ?? "DOKUMEN"}.`,
      `Nama fail: ${document?.originalName ?? document?.fileName ?? uploadedDocumentId}.`,
      ...(input.details ?? []),
    ],
  });
}

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

      await recordUploadedDocumentDraftAudit(tx, currentAdmin, uploadedDocumentId, {
        summary: "Mengemaskini draf ekstrak dokumen sebelum pengesahan.",
        details: [
          action ? `Tindakan draf: ${action}.` : "Tindakan draf: kemas kini pukal.",
          extractResult
            ? `Jumlah rekod draf selepas kemas kini: ${formatAuditValue(extractResult.records.length)}.`
            : null,
          kind === "kuarters" && action === "update-kuarters-category"
            ? `Kategori dikemas kini: ${formatAuditValue(
                "categoryName" in payload
                  ? (payload as { categoryName?: unknown }).categoryName
                  : null,
              )}; alamat: ${formatAuditValue(
                "address" in payload
                  ? (payload as { address?: unknown }).address
                  : null,
              )}; sewa: RM ${formatAuditValue(
                "rentalPrice" in payload
                  ? (payload as { rentalPrice?: unknown }).rentalPrice
                  : null,
              )}; penyelenggaraan: RM ${formatAuditValue(
                "maintenancePrice" in payload
                  ? (payload as { maintenancePrice?: unknown }).maintenancePrice
                  : null,
              )}; penalti: RM ${formatAuditValue(
                "penaltyPrice" in payload
                  ? (payload as { penaltyPrice?: unknown }).penaltyPrice
                  : null,
              )}.`
            : null,
          kind === "kuarters" && action === "update-kuarters-unit"
            ? `Unit dikemas kini: ${formatAuditValue(
                "unitCode" in payload
                  ? (payload as { unitCode?: unknown }).unitCode
                  : null,
              )}.`
            : null,
        ],
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
        const currentAdmin = await getCurrentAdmin();

        if (action === "delete-kuarters-unit") {
          await prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
              await deleteKuartersUnitDraft(tx, id, payload);
              await recordUploadedDocumentDraftAudit(tx, currentAdmin, id, {
                summary: "Memadam unit kuarters daripada draf semakan.",
                details: [
                  `ID kategori draf: ${formatAuditValue(
                    "categoryId" in payload
                      ? (payload as { categoryId?: unknown }).categoryId
                      : null,
                  )}.`,
                  `ID unit draf: ${formatAuditValue(
                    "unitId" in payload
                      ? (payload as { unitId?: unknown }).unitId
                      : null,
                  )}.`,
                  `Kod unit: ${formatAuditValue(
                    "unitCode" in payload
                      ? (payload as { unitCode?: unknown }).unitCode
                      : null,
                  )}.`,
                ],
              });
            },
            uploadedDocumentTransactionOptions,
          );

          return NextResponse.json({
            success: true,
            data: {
              deletedUnitId:
                "unitId" in payload ? (payload as { unitId?: unknown }).unitId : null,
            },
          });
        }

        await prisma.$transaction(
          async (tx: Prisma.TransactionClient) => {
            await deleteKuartersCategoryDraft(tx, id, payload);
            await recordUploadedDocumentDraftAudit(tx, currentAdmin, id, {
              summary: "Memadam kategori kuarters daripada draf semakan.",
              details: [
                `ID kategori draf: ${formatAuditValue(
                  "categoryId" in payload
                    ? (payload as { categoryId?: unknown }).categoryId
                    : null,
                )}.`,
                `Nama kategori: ${formatAuditValue(
                  "categoryName" in payload
                    ? (payload as { categoryName?: unknown }).categoryName
                    : null,
                )}.`,
              ],
            });
          },
          uploadedDocumentTransactionOptions,
        );

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
        const currentAdmin = await getCurrentAdmin();

        if (action === "delete-penghuni-record") {
          const residentId =
            "residentId" in payload
              ? (payload as { residentId?: unknown }).residentId
              : null;

          if (typeof residentId !== "string") {
            throw new Error("Rekod penghuni tidak ditemui.");
          }

          await prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
              await deletePenghuniDraft(tx, id, residentId);
              await recordUploadedDocumentDraftAudit(tx, currentAdmin, id, {
                summary: "Memadam rekod penghuni daripada draf semakan.",
                details: [
                  `ID rekod draf penghuni: ${residentId}.`,
                  "Rekod ini tidak akan disahkan atau dimasukkan ke data penghuni.",
                ],
              });
            },
            uploadedDocumentTransactionOptions,
          );

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

          const updatedRecord = await prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
              const result = await updateTunggakanDraft(
                tx,
                id,
                record as Parameters<typeof updateTunggakanDraft>[2],
              );
              await recordUploadedDocumentDraftAudit(tx, currentAdmin, id, {
                summary: "Mengemaskini satu rekod tunggakan dalam draf semakan.",
                details: [
                  `Nama penghuni: ${formatAuditValue(result.nama)}.`,
                  `No. KP: ${formatAuditValue(result.noKadPengenalan)}.`,
                  `Jumlah tunggakan: RM ${formatAuditValue(result.jumlahTunggakan)}.`,
                  `Status import selepas kemas kini: ${formatAuditValue(result.importStatus)}.`,
                  result.importMessage
                    ? `Catatan import: ${result.importMessage}`
                    : null,
                ],
              });
              return result;
            },
            uploadedDocumentTransactionOptions,
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

          const updatedRecord = await prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
              const result = await updateBayaranDraft(
                tx,
                id,
                record as Parameters<typeof updateBayaranDraft>[2],
              );
              await recordUploadedDocumentDraftAudit(tx, currentAdmin, id, {
                summary: "Mengemaskini satu rekod bayaran dalam draf semakan.",
                details: [
                  `Nama pembayar: ${formatAuditValue(result.nama)}.`,
                  `No. KP: ${formatAuditValue(result.noGajiNoKp)}.`,
                  `Tarikh bayaran: ${formatAuditValue(result.tarikh)}.`,
                  `No. rujukan/resit: ${formatAuditValue(result.noRujukan)}.`,
                  `Amaun bayaran: RM ${formatAuditValue(result.amaunRm)}.`,
                  `Rekod asal ditemui: ${formatAuditValue(result.isExisted)}.`,
                ],
              });
              return result;
            },
            uploadedDocumentTransactionOptions,
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

        const updatedRecord = await prisma.$transaction(
          async (tx: Prisma.TransactionClient) => {
            const result = await updatePenghuniDraft(
              tx,
              id,
              record as Parameters<typeof updatePenghuniDraft>[2],
            );
            await recordUploadedDocumentDraftAudit(tx, currentAdmin, id, {
              summary: "Mengemaskini satu rekod penghuni dalam draf semakan.",
              details: [
                `Nama penghuni: ${formatAuditValue(result.nama)}.`,
                `No. KP: ${formatAuditValue(result.noKadPengenalan)}.`,
                `No. telefon: ${formatAuditValue(result.perhubungan)}.`,
                `Emel: ${formatAuditValue(result.gmail)}.`,
                `Kuarters/unit: ${formatAuditTarget([
                  result.kuarters,
                  result.unit,
                ])}.`,
                `Rekod asal ditemui: ${formatAuditValue(result.isExisted)}.`,
              ],
            });
            return result;
          },
          uploadedDocumentTransactionOptions,
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
