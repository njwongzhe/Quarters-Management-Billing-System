import type { Prisma } from "@prisma/client";

import type { VerifyResult } from "@/lib/uploaded-document/verification";
import { ensureResidentFromDraft } from "@/lib/uploaded-document/shared";

export async function verifyBayaranDrafts(
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
