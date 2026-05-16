import type { Prisma } from "@prisma/client";

import { generateTransactionNo } from "@/lib/transactions";
import type { VerifyResult } from "@/lib/uploaded-document/verification";
import { ensureResidentFromDraft } from "@/lib/uploaded-document/shared";

export async function verifyTunggakanDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const drafts = await tx.arrearsSummaryDraft.findMany({
    where: { uploadedDocumentId, id: { in: selectedKeys } },
  });
  const failedMessages: string[] = [];
  let verifiedRows = 0;

  for (const draft of drafts) {
    const residentId = await ensureResidentFromDraft(tx, {
      fullName: draft.residentName,
      icNumber: draft.residentIcNumber,
    });
    const hasTransactions = await residentHasTransactions(tx, residentId);

    if (hasTransactions) {
      failedMessages.push(
        `Tunggakan ${draft.residentName} gagal disahkan kerana penghuni ini sudah mempunyai transaksi dalam sistem.`,
      );
      await tx.arrearsSummaryDraft.update({
        where: { id: draft.id },
        data: { originalResidentId: residentId },
      });
      continue;
    }

    const existingSummary = await tx.arrearsSummary.findUnique({
      where: { residentId },
      select: { id: true },
    });

    if (existingSummary) {
      failedMessages.push(`Tunggakan ${draft.residentName} telah wujud.`);
      await tx.arrearsSummaryDraft.update({
        where: { id: draft.id },
        data: { originalSummaryId: existingSummary.id },
      });
      continue;
    }

    const amount = Number(draft.totalArrearsAmount);
    const transactionDate = draft.lastUpdatedMonth ?? new Date();

    await tx.arrearsSummary.create({
      data: {
        residentId,
        totalArrearsAmount: draft.totalArrearsAmount,
        lastUpdatedMonth: draft.lastUpdatedMonth,
        description: draft.description,
      },
    });
    const transactionNo = await generateTransactionNo(tx);

    await tx.transaction.create({
      data: {
        transactionNo,
        residentId,
        transactionDate,
        category: "BAKI_AWAL",
        description: "Baki awal daripada muat naik tunggakan.",
        debitAmount: amount < 0 ? Math.abs(amount) : 0,
        creditAmount: amount >= 0 ? amount : 0,
      },
    });
    await tx.arrearsSummaryDraft.delete({ where: { id: draft.id } });
    verifiedRows += 1;
  }

  return { verifiedRows, failedMessages };
}

async function residentHasTransactions(
  tx: Prisma.TransactionClient,
  residentId: string,
) {
  const transaction = await tx.transaction.findFirst({
    where: { residentId },
    select: { id: true },
  });

  return Boolean(transaction);
}
