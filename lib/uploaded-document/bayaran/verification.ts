import type { Prisma } from "@prisma/client";

import { generateTransactionNos } from "@/lib/transactions";
import type { VerifyResult } from "@/lib/uploaded-document/verification";
import { findResidentByNormalizedIc } from "@/lib/uploaded-document/shared";

export async function verifyBayaranDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const drafts = await tx.paymentDraft.findMany({
    where: { uploadedDocumentId, id: { in: selectedKeys } },
  });
  const failedMessages: string[] = [];
  const transactionNos = await generateTransactionNos(tx, drafts.length);
  let transactionNoIndex = 0;
  let verifiedRows = 0;

  for (const draft of drafts) {
    const receiptNo = draft.receiptNo ?? draft.referenceNo;
    const residentId = await ensureBayaranResident(tx, {
      fullName: draft.residentName,
      icNumber: draft.residentIcNumber,
      department: draft.department,
    });
    const existingPayment = receiptNo
      ? await tx.payment.findFirst({
          where: {
            residentId,
            paymentDate: draft.paymentDate,
            receiptNo,
          },
          select: { id: true },
        })
      : null;

    if (existingPayment) {
      failedMessages.push(
        `Bayaran ${draft.residentName} gagal disahkan kerana No Rujukan ${receiptNo} telah wujud dalam sistem.`,
      );
      continue;
    }

    const payment = await tx.payment.create({
      data: {
        residentId,
        paymentDate: draft.paymentDate,
        receiptNo,
        amount: draft.amount,
        description: draft.description,
        uploadedDocumentId,
      },
      select: { id: true },
    });
    const transactionNo = transactionNos[transactionNoIndex++];

    await tx.transaction.create({
      data: {
        transactionNo,
        residentId,
        paymentId: payment.id,
        transactionDate: draft.paymentDate,
        category: "BAYARAN",
        creditAmount: draft.amount,
        debitAmount: 0,
        receiptNo,
        description: draft.description ?? "Bayaran daripada muat naik.",
      },
    });
    await tx.paymentDraft.delete({ where: { id: draft.id } });
    verifiedRows += 1;
  }

  return { verifiedRows, failedMessages };
}

async function ensureBayaranResident(
  tx: Prisma.TransactionClient,
  draft: {
    fullName: string;
    icNumber: string;
    department?: string | null;
  },
) {
  const existingResidentId = await findResidentByNormalizedIc(tx, draft.icNumber);

  if (existingResidentId) {
    await tx.resident.update({
      where: { id: existingResidentId },
      data: {
        fullName: draft.fullName,
        icNumber: draft.icNumber,
        department: draft.department ?? null,
      },
    });

    return existingResidentId;
  }

  const resident = await tx.resident.create({
    data: {
      fullName: draft.fullName,
      icNumber: draft.icNumber,
      department: draft.department ?? null,
    },
    select: { id: true },
  });

  return resident.id;
}
