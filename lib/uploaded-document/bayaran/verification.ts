import { randomUUID } from "crypto";

import { Prisma } from "@prisma/client";

import { createPaymentRecords } from "@/lib/payments/payment-creation";
import type { VerifyResult } from "@/lib/uploaded-document/verification";

export async function verifyBayaranDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const drafts = await tx.paymentDraft.findMany({
    where: { uploadedDocumentId, id: { in: selectedKeys } },
  });
  const failedMessages: string[] = [];

  if (drafts.length === 0) {
    return { verifiedRows: 0, failedMessages };
  }

  const residentByIc = await resolveBayaranResidents(tx, drafts);
  await updateExistingBayaranResidents(tx, drafts, residentByIc);

  const preparedDrafts = drafts.map((draft) => {
    const normalizedIc = normalizeIc(draft.residentIcNumber);
    const resident = residentByIc.get(normalizedIc);

    return {
      draft,
      residentId: resident?.id ?? "",
      receiptNo: normalizeReceiptNo(draft.receiptNo ?? draft.referenceNo),
    };
  });

  const existingPaymentKeys = await findExistingBayaranPaymentKeys(
    tx,
    preparedDrafts,
  );
  const rowsToVerify = [];

  for (const prepared of preparedDrafts) {
    if (!prepared.residentId) {
      failedMessages.push(
        `Bayaran ${prepared.draft.residentName} gagal disahkan kerana No. Kad Pengenalan tidak sah.`,
      );
      continue;
    }

    const paymentKey = getBayaranPaymentKey({
      residentId: prepared.residentId,
      paymentDate: prepared.draft.paymentDate,
      receiptNo: prepared.receiptNo,
      amount: prepared.draft.amount,
    });

    if (paymentKey && existingPaymentKeys.has(paymentKey)) {
      failedMessages.push(
        `Bayaran ${prepared.draft.residentName} gagal disahkan kerana bayaran dengan tarikh, No Rujukan dan amaun yang sama telah wujud dalam sistem.`,
      );
      continue;
    }

    rowsToVerify.push(prepared);
  }

  if (rowsToVerify.length === 0) {
    return { verifiedRows: 0, failedMessages };
  }

  await createPaymentRecords(
    tx,
    rowsToVerify.map((row) => ({
      residentId: row.residentId,
      paymentDate: row.draft.paymentDate,
      receiptNo: row.receiptNo,
      amount: row.draft.amount,
      description: row.draft.description,
      uploadedDocumentId,
    })),
  );

  await tx.paymentDraft.deleteMany({
    where: { id: { in: rowsToVerify.map((row) => row.draft.id) } },
  });

  return { verifiedRows: rowsToVerify.length, failedMessages };
}

type BayaranDraftForVerification = Prisma.PaymentDraftGetPayload<object>;

type BayaranResidentLookup = {
  id: string;
  icNumber: string;
  fullName: string;
  department: string | null;
  normalizedIc: string;
};

async function resolveBayaranResidents(
  tx: Prisma.TransactionClient,
  drafts: BayaranDraftForVerification[],
) {
  const normalizedIcs = uniqueValues(
    drafts.map((draft) => normalizeIc(draft.residentIcNumber)).filter(Boolean),
  );
  const residentByIc = new Map<string, BayaranResidentLookup>();

  if (normalizedIcs.length === 0) {
    return residentByIc;
  }

  const exactResidents = await tx.resident.findMany({
    where: { icNumber: { in: normalizedIcs } },
    select: {
      id: true,
      icNumber: true,
      fullName: true,
      department: true,
    },
  });

  for (const resident of exactResidents) {
    residentByIc.set(normalizeIc(resident.icNumber), {
      ...resident,
      normalizedIc: normalizeIc(resident.icNumber),
    });
  }

  const missingIcs = normalizedIcs.filter((icNumber) => !residentByIc.has(icNumber));

  if (missingIcs.length > 0) {
    const formattedResidents = await tx.$queryRaw<BayaranResidentLookup[]>`
      SELECT
        "id",
        "icNumber",
        "fullName",
        "department",
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

  const newResidentRows = [];
  const draftByIc = new Map<string, BayaranDraftForVerification>();

  for (const draft of drafts) {
    const normalizedIc = normalizeIc(draft.residentIcNumber);

    if (!normalizedIc || residentByIc.has(normalizedIc) || draftByIc.has(normalizedIc)) {
      continue;
    }

    draftByIc.set(normalizedIc, draft);
    const resident = {
      id: randomUUID(),
      icNumber: normalizedIc,
      fullName: draft.residentName,
      department: draft.department ?? null,
      normalizedIc,
    };

    residentByIc.set(normalizedIc, resident);
    newResidentRows.push({
      id: resident.id,
      fullName: resident.fullName,
      icNumber: resident.icNumber,
      department: resident.department,
    });
  }

  if (newResidentRows.length > 0) {
    await tx.resident.createMany({
      data: newResidentRows,
      skipDuplicates: true,
    });
  }

  return residentByIc;
}

async function updateExistingBayaranResidents(
  tx: Prisma.TransactionClient,
  drafts: BayaranDraftForVerification[],
  residentByIc: Map<string, BayaranResidentLookup>,
) {
  const updateRows = [];
  const seenResidentIds = new Set<string>();

  for (const draft of drafts) {
    const normalizedIc = normalizeIc(draft.residentIcNumber);
    const resident = residentByIc.get(normalizedIc);

    if (!resident || seenResidentIds.has(resident.id)) {
      continue;
    }

    seenResidentIds.add(resident.id);

    if (
      resident.fullName === draft.residentName &&
      resident.icNumber === normalizedIc &&
      (resident.department ?? null) === (draft.department ?? null)
    ) {
      continue;
    }

    updateRows.push(
      Prisma.sql`(${resident.id}::uuid, ${draft.residentName}::text, ${normalizedIc}::text, ${draft.department ?? null}::text)`,
    );
  }

  if (updateRows.length === 0) {
    return;
  }

  await tx.$executeRaw`
    UPDATE "Resident" AS resident
    SET
      "fullName" = updates."fullName",
      "icNumber" = updates."icNumber",
      "department" = updates."department",
      "updatedAt" = NOW()
    FROM (VALUES ${Prisma.join(updateRows)}) AS updates("id", "fullName", "icNumber", "department")
    WHERE resident."id" = updates."id"
  `;
}

type PreparedBayaranDraft = {
  draft: BayaranDraftForVerification;
  residentId: string;
  receiptNo: string | null;
};

async function findExistingBayaranPaymentKeys(
  tx: Prisma.TransactionClient,
  preparedDrafts: PreparedBayaranDraft[],
) {
  const residentIds = uniqueValues(
    preparedDrafts.map((row) => row.residentId).filter(Boolean),
  );
  const receiptNos = uniqueValues(
    preparedDrafts
      .map((row) => row.receiptNo)
      .filter((receiptNo): receiptNo is string => Boolean(receiptNo)),
  );
  const paymentDates = uniqueDates(
    preparedDrafts.map((row) => row.draft.paymentDate),
  );

  if (residentIds.length === 0 || receiptNos.length === 0 || paymentDates.length === 0) {
    return new Set<string>();
  }

  const payments = await tx.payment.findMany({
    where: {
      residentId: { in: residentIds },
      receiptNo: { in: receiptNos },
      paymentDate: { in: paymentDates },
    },
    select: {
      residentId: true,
      paymentDate: true,
      receiptNo: true,
      amount: true,
    },
  });

  return new Set(
    payments
      .map((payment) =>
        getBayaranPaymentKey({
          residentId: payment.residentId,
          paymentDate: payment.paymentDate,
          receiptNo: payment.receiptNo,
          amount: payment.amount,
        }),
      )
      .filter((key): key is string => Boolean(key)),
  );
}

function getBayaranPaymentKey(input: {
  residentId: string | null | undefined;
  paymentDate: Date | null | undefined;
  receiptNo: string | null | undefined;
  amount: Prisma.Decimal | string | number | null | undefined;
}) {
  const receiptNo = normalizeReceiptNo(input.receiptNo);

  if (!input.residentId || !input.paymentDate || !receiptNo || input.amount == null) {
    return "";
  }

  return [
    input.residentId,
    input.paymentDate.toISOString(),
    receiptNo,
    normalizeDecimal(input.amount),
  ].join("|");
}

function normalizeIc(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeReceiptNo(value: string | null | undefined) {
  const normalizedValue = String(value ?? "").replace(/\s+/g, " ").trim();

  return normalizedValue || null;
}

function normalizeDecimal(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(2);
}

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}

function uniqueDates(values: Date[]) {
  const dateByKey = new Map<string, Date>();

  for (const value of values) {
    dateByKey.set(value.toISOString(), value);
  }

  return [...dateByKey.values()];
}
