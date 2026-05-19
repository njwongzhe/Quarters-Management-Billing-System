import { randomUUID } from "crypto";

import { Prisma } from "@prisma/client";

import { generateTransactionNos } from "@/lib/transactions/transactions";
import type { VerifyResult } from "@/lib/uploaded-document/verification";

export async function verifyTunggakanDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const drafts = await tx.arrearsSummaryDraft.findMany({
    where: { uploadedDocumentId, id: { in: selectedKeys } },
  });
  const failedMessages: string[] = [];

  if (drafts.length === 0) {
    return { verifiedRows: 0, failedMessages };
  }

  const residentByIc = await resolveTunggakanResidents(tx, drafts);
  const residentIds = uniqueValues(
    drafts
      .map((draft) => residentByIc.get(normalizeIc(draft.residentIcNumber))?.id)
      .filter((residentId): residentId is string => Boolean(residentId)),
  );
  const residentIdsWithTransactions = await findResidentIdsWithTransactions(
    tx,
    residentIds,
  );
  const summaryIdByResidentId = await findArrearsSummaryIdsByResidentId(
    tx,
    residentIds,
  );
  const failedDraftUpdates = [];
  const rowsToVerify = [];
  const residentIdsQueuedForVerification = new Set<string>();

  for (const draft of drafts) {
    const residentId = residentByIc.get(normalizeIc(draft.residentIcNumber))?.id;

    if (!residentId) {
      failedMessages.push(
        `Tunggakan ${draft.residentName} gagal disahkan kerana No. Kad Pengenalan tidak sah.`,
      );
      continue;
    }

    const existingSummaryId = summaryIdByResidentId.get(residentId) ?? null;

    if (residentIdsWithTransactions.has(residentId)) {
      failedMessages.push(
        `Tunggakan ${draft.residentName} gagal disahkan kerana penghuni ini sudah mempunyai transaksi dalam sistem.`,
      );
      failedDraftUpdates.push({ draftId: draft.id, residentId, summaryId: existingSummaryId });
      continue;
    }

    if (existingSummaryId) {
      failedMessages.push(`Tunggakan ${draft.residentName} telah wujud.`);
      failedDraftUpdates.push({ draftId: draft.id, residentId, summaryId: existingSummaryId });
      continue;
    }

    if (residentIdsQueuedForVerification.has(residentId)) {
      failedMessages.push(`Tunggakan ${draft.residentName} telah wujud.`);
      failedDraftUpdates.push({ draftId: draft.id, residentId, summaryId: null });
      continue;
    }

    residentIdsQueuedForVerification.add(residentId);
    rowsToVerify.push({ draft, residentId });
  }

  await updateFailedTunggakanDrafts(tx, failedDraftUpdates);

  if (rowsToVerify.length === 0) {
    return { verifiedRows: 0, failedMessages };
  }

  const transactionNos = await generateTransactionNos(tx, rowsToVerify.length);

  await tx.arrearsSummary.createMany({
    data: rowsToVerify.map((row) => ({
      residentId: row.residentId,
      totalArrearsAmount: row.draft.totalArrearsAmount,
      lastUpdatedMonth: row.draft.lastUpdatedMonth,
      description: row.draft.description,
    })),
  });

  await tx.transaction.createMany({
    data: rowsToVerify.map((row, index) => {
      const amount = Number(row.draft.totalArrearsAmount);

      return {
        transactionNo: transactionNos[index],
        residentId: row.residentId,
        transactionDate: row.draft.lastUpdatedMonth ?? new Date(),
        category: "BAKI_AWAL",
        description: "Baki awal daripada muat naik tunggakan.",
        debitAmount: amount < 0 ? Math.abs(amount) : 0,
        creditAmount: amount >= 0 ? amount : 0,
      };
    }),
  });

  await tx.arrearsSummaryDraft.deleteMany({
    where: { id: { in: rowsToVerify.map((row) => row.draft.id) } },
  });

  return { verifiedRows: rowsToVerify.length, failedMessages };
}

type TunggakanDraftForVerification = Prisma.ArrearsSummaryDraftGetPayload<object>;

type TunggakanResidentLookup = {
  id: string;
  icNumber: string;
  fullName: string;
  normalizedIc: string;
};

async function resolveTunggakanResidents(
  tx: Prisma.TransactionClient,
  drafts: TunggakanDraftForVerification[],
) {
  const normalizedIcs = uniqueValues(
    drafts.map((draft) => normalizeIc(draft.residentIcNumber)).filter(Boolean),
  );
  const residentByIc = new Map<string, TunggakanResidentLookup>();

  if (normalizedIcs.length === 0) {
    return residentByIc;
  }

  const exactResidents = await tx.resident.findMany({
    where: { icNumber: { in: normalizedIcs } },
    select: {
      id: true,
      icNumber: true,
      fullName: true,
    },
  });

  for (const resident of exactResidents) {
    const normalizedIc = normalizeIc(resident.icNumber);

    residentByIc.set(normalizedIc, { ...resident, normalizedIc });
  }

  await addFormattedIcResidentMatches(tx, normalizedIcs, residentByIc);
  await createMissingTunggakanResidents(tx, drafts, normalizedIcs, residentByIc);

  return residentByIc;
}

async function addFormattedIcResidentMatches(
  tx: Prisma.TransactionClient,
  normalizedIcs: string[],
  residentByIc: Map<string, TunggakanResidentLookup>,
) {
  const missingIcs = normalizedIcs.filter((icNumber) => !residentByIc.has(icNumber));

  if (missingIcs.length === 0) {
    return;
  }

  const formattedResidents = await tx.$queryRaw<TunggakanResidentLookup[]>`
    SELECT
      "id",
      "icNumber",
      "fullName",
      regexp_replace("icNumber", '\\D', '', 'g') AS "normalizedIc"
    FROM "Resident"
    WHERE regexp_replace("icNumber", '\\D', '', 'g') IN (${Prisma.join(missingIcs)})
  `;

  for (const resident of formattedResidents) {
    if (resident.normalizedIc && !residentByIc.has(resident.normalizedIc)) {
      residentByIc.set(resident.normalizedIc, resident);
    }
  }
}

async function createMissingTunggakanResidents(
  tx: Prisma.TransactionClient,
  drafts: TunggakanDraftForVerification[],
  normalizedIcs: string[],
  residentByIc: Map<string, TunggakanResidentLookup>,
) {
  const draftByIc = new Map<string, TunggakanDraftForVerification>();

  for (const draft of drafts) {
    const normalizedIc = normalizeIc(draft.residentIcNumber);

    if (!normalizedIc || residentByIc.has(normalizedIc) || draftByIc.has(normalizedIc)) {
      continue;
    }

    draftByIc.set(normalizedIc, draft);
  }

  const newResidents = [...draftByIc].map(([normalizedIc, draft]) => ({
    id: randomUUID(),
    fullName: draft.residentName,
    icNumber: normalizedIc,
  }));

  if (newResidents.length === 0) {
    return;
  }

  await tx.resident.createMany({
    data: newResidents,
    skipDuplicates: true,
  });

  const createdOrExistingResidents = await tx.resident.findMany({
    where: { icNumber: { in: normalizedIcs } },
    select: {
      id: true,
      icNumber: true,
      fullName: true,
    },
  });

  for (const resident of createdOrExistingResidents) {
    const normalizedIc = normalizeIc(resident.icNumber);

    if (!residentByIc.has(normalizedIc)) {
      residentByIc.set(normalizedIc, { ...resident, normalizedIc });
    }
  }
}

async function findResidentIdsWithTransactions(
  tx: Prisma.TransactionClient,
  residentIds: string[],
) {
  if (residentIds.length === 0) {
    return new Set<string>();
  }

  const rows = await tx.transaction.findMany({
    where: { residentId: { in: residentIds } },
    select: { residentId: true },
    distinct: ["residentId"],
  });

  return new Set(
    rows
      .map((row) => row.residentId)
      .filter((residentId): residentId is string => Boolean(residentId)),
  );
}

async function findArrearsSummaryIdsByResidentId(
  tx: Prisma.TransactionClient,
  residentIds: string[],
) {
  const summaryIdByResidentId = new Map<string, string>();

  if (residentIds.length === 0) {
    return summaryIdByResidentId;
  }

  const summaries = await tx.arrearsSummary.findMany({
    where: { residentId: { in: residentIds } },
    select: { id: true, residentId: true },
  });

  for (const summary of summaries) {
    summaryIdByResidentId.set(summary.residentId, summary.id);
  }

  return summaryIdByResidentId;
}

async function updateFailedTunggakanDrafts(
  tx: Prisma.TransactionClient,
  updates: { draftId: string; residentId: string; summaryId: string | null }[],
) {
  if (updates.length === 0) {
    return;
  }

  await tx.$executeRaw`
    UPDATE "ArrearsSummaryDraft" AS draft
    SET
      "originalResidentId" = updates."residentId",
      "originalSummaryId" = updates."summaryId",
      "updatedAt" = NOW()
    FROM (
      VALUES ${Prisma.join(
        updates.map(
          (update) =>
            Prisma.sql`(${update.draftId}::uuid, ${update.residentId}::uuid, ${update.summaryId}::uuid)`,
        ),
      )}
    ) AS updates("id", "residentId", "summaryId")
    WHERE draft."id" = updates."id"
  `;
}

function normalizeIc(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}
