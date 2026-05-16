import type { Prisma } from "@prisma/client";

import type { VerifyResult } from "@/lib/uploaded-document/verification";
import {
  findQuarterCategoryByDetails,
  findQuarterCategoryByNameAddress,
  findUnitByCategoryIdAndCode,
} from "@/lib/uploaded-document/kuarters/queries";

export async function verifyKuartersDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const selectedKeySet = new Set(selectedKeys);
  const categoryDrafts = await tx.quarterCategoryDraft.findMany({
    where: {
      uploadedDocumentId,
      OR: [
        { id: { in: selectedKeys } },
        { units: { some: { id: { in: selectedKeys } } } },
      ],
    },
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
    const exactCategoryId = await findQuarterCategoryByDetails(
      tx,
      draft.categoryName,
      draft.address,
      draft.rentalPrice.toFixed(2),
      draft.maintenancePrice.toFixed(2),
      draft.penaltyPrice.toFixed(2),
    );

    if (categorySelected) {
      if (exactCategoryId) {
        failedMessages.push(`Kategori ${draft.categoryName} telah wujud.`);
        await tx.quarterCategoryDraft.update({
          where: { id: draft.id },
          data: { originalCategoryId: exactCategoryId },
        });
        categoryId = exactCategoryId;
      } else if (categoryId) {
        await tx.quarterCategory.update({
          where: { id: categoryId },
          data: {
            categoryName: draft.categoryName,
            address: draft.address,
            rentalPrice: draft.rentalPrice,
            maintenancePrice: draft.maintenancePrice,
            penaltyPrice: draft.penaltyPrice,
            uploadedDocumentId,
          },
        });
        await tx.quarterCategoryDraft.update({
          where: { id: draft.id },
          data: { originalCategoryId: categoryId },
        });
        verifiedRows += 1;
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
          data: { originalCategoryId: categoryId },
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
          data: { originalUnitId: existingUnitId },
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
