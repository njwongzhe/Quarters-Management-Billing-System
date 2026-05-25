import { randomUUID } from "crypto";

import { Prisma } from "@prisma/client";

import type { ExtractedPenghuniRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import {
  getTodayStartInMalaysia,
  resolveQuarterUnitOccupancyState,
} from "@/lib/quarters/quarter-units";
import type { VerifyResult } from "@/lib/uploaded-document/verification";
import {
  findQuarterCategoryByNameAddress,
  findUnitByCategoryIdAndCode,
} from "@/lib/uploaded-document/kuarters/queries";

const DEFAULT_QUARTER_ADDRESS = "N/A";

export async function verifyPenghuniDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const selectedKeySet = new Set(
    selectedKeys.flatMap((key) => [normalizeSelectedKey(key), normalizeIc(key)]),
  );
  const selectedDraftIds = selectedKeys.filter(isUuid);
  const selectedIcNumbers = selectedKeys
    .map(normalizeIc)
    .filter((key) => key.length === 12);
  const draftSelectionFilters = [
    ...(selectedDraftIds.length > 0 ? [{ id: { in: selectedDraftIds } }] : []),
    ...(selectedIcNumbers.length > 0
      ? [{ icNumber: { in: selectedIcNumbers } }]
      : []),
  ];
  const drafts = await tx.residentDraft.findMany({
    where: {
      uploadedDocumentId,
      ...(draftSelectionFilters.length > 0 ? { OR: draftSelectionFilters } : {}),
    },
  });
  const selectedDrafts = drafts.filter((draft) => {
    const draftKeys = [
      normalizeSelectedKey(draft.id),
      normalizeSelectedKey(draft.icNumber),
      normalizeIc(draft.icNumber),
    ];

    return draftKeys.some((key) => selectedKeySet.has(key));
  });
  const failedMessages: string[] = [];
  const successMessages: string[] = [];
  const residentIdByIc = await findResidentIdsByNormalizedIc(tx, selectedDrafts);
  const existingResidentIds = new Set(residentIdByIc.values());
  const recordByDraftId = new Map(
    selectedDrafts.map((draft) => [draft.id, buildRecordFromDraft(draft)]),
  );
  const unitResolutionCache = await createPenghuniUnitResolutionCache(
    tx,
    [...recordByDraftId.values()],
  );
  const selectedIcNumbersQueuedForVerification = new Set<string>();
  const candidates: PreparedPenghuniDraft[] = [];

  if (selectedDrafts.length === 0) {
    return {
      verifiedRows: 0,
      failedMessages: [
        "Rekod dipilih tidak ditemui dalam draf semakan. Sila muat semula halaman dan cuba lagi.",
      ],
    };
  }

  for (const draft of selectedDrafts) {
    const record = recordByDraftId.get(draft.id) ?? buildRecordFromDraft(draft);
    const normalizedDraftIc = normalizeIc(draft.icNumber);

    if (normalizedDraftIc.length !== 12) {
      failedMessages.push(
        `Penghuni ${draft.fullName} gagal disahkan kerana No. K/P tidak sah.`,
      );
      continue;
    }

    if (selectedIcNumbersQueuedForVerification.has(normalizedDraftIc)) {
      failedMessages.push(
        `Penghuni ${draft.fullName} gagal disahkan kerana No. K/P bertindih dalam pilihan semakan.`,
      );
      continue;
    }

    selectedIcNumbersQueuedForVerification.add(normalizedDraftIc);

    let residentId = residentIdByIc.get(normalizedDraftIc) ?? "";
    if (!residentId) {
      residentId = randomUUID();
      residentIdByIc.set(normalizedDraftIc, residentId);
    }

    const unitResult = await resolvePenghuniUnit(
      tx,
      record,
      draft.fullName,
      unitResolutionCache,
    );

    if (unitResult.failedMessage) {
      failedMessages.push(unitResult.failedMessage);
      continue;
    }

    successMessages.push(...unitResult.successMessages);

    const unitId = unitResult.unitId;
    const hasUnitToOccupy = Boolean(unitId || unitResult.unitKey);
    const hasMoveInDate = Boolean(normalizePenghuniText(record.tarikhMasuk));

    if (hasUnitToOccupy && !hasMoveInDate) {
      failedMessages.push(
        `Penghunian ${draft.fullName} gagal disahkan kerana tarikh masuk belum diisi.`,
      );
      continue;
    }

    const moveInDate = hasMoveInDate
      ? parsePenghuniMoveInDate(record.tarikhMasuk ?? "")
      : null;
    const moveOutDate = parseNullablePenghuniDate(record.tarikhKeluar ?? "");

    if (hasMoveInDate && !moveInDate) {
      failedMessages.push(
        `Penghunian ${draft.fullName} gagal disahkan kerana tarikh masuk tidak sah.`,
      );
      continue;
    }

    if (moveInDate && moveOutDate && moveOutDate < moveInDate) {
      failedMessages.push(
        `Penghunian ${draft.fullName} gagal disahkan kerana tarikh keluar lebih awal daripada tarikh masuk.`,
      );
      continue;
    }

    candidates.push({
      draft,
      normalizedIc: normalizedDraftIc,
      residentId,
      unitId: unitResult.unitId,
      unitKey: unitResult.unitKey,
      quarterCategoryName: unitResult.categoryName,
      quarterAddress: unitResult.address,
      unitCode: unitResult.unitCode,
      moveInDate,
      moveOutDate,
    });
  }

  const rowsAfterInternalConflictCheck = filterPenghuniInternalConflicts(
    candidates,
    failedMessages,
  );
  const conflictingDraftIds = await findConflictingPenghuniDraftIds(
    tx,
    rowsAfterInternalConflictCheck,
  );
  const rowsToVerify = rowsAfterInternalConflictCheck.filter((row) => {
    if (conflictingDraftIds.has(row.draft.id)) {
      failedMessages.push(
        `Penghunian ${row.draft.fullName} gagal disahkan kerana unit ${row.draft.unitCode ?? ""} telah diduduki dalam tempoh tersebut.`,
      );
      return false;
    }

    return true;
  });

  if (rowsToVerify.length === 0) {
    return { verifiedRows: 0, failedMessages, successMessages };
  }

  const residentWriteCounts = await writePenghuniResidents(
    tx,
    rowsToVerify,
    existingResidentIds,
  );
  const quarterCreationMessages = await createMissingPenghuniUnitsForVerifiedRows(
    tx,
    rowsToVerify,
    unitResolutionCache,
  );
  const additionalAffectedUnitIds = await writePenghuniOccupancies(tx, rowsToVerify);

  await tx.residentDraft.deleteMany({
    where: { id: { in: rowsToVerify.map((row) => row.draft.id) } },
  });

  await syncUnitOccupancyStatuses(tx, [
    ...new Set([
      ...rowsToVerify.map((row) => row.unitId).filter(Boolean),
      ...additionalAffectedUnitIds,
    ]),
  ]);

  const summaryMessages = [
    residentWriteCounts.created > 0
      ? `${residentWriteCounts.created} penghuni baharu ditambah.`
      : "",
    residentWriteCounts.updated > 0
      ? `${residentWriteCounts.updated} rekod penghuni sedia ada dikemas kini.`
      : "",
  ].filter(Boolean);

  return {
    verifiedRows: rowsToVerify.length,
    failedMessages,
    successMessages: [
      ...summaryMessages,
      ...successMessages,
      ...quarterCreationMessages,
    ],
  };
}

type ResidentDraftRow = Prisma.ResidentDraftGetPayload<Record<string, never>>;

type PreparedPenghuniDraft = {
  draft: ResidentDraftRow;
  normalizedIc: string;
  residentId: string;
  unitId: string;
  unitKey: string;
  quarterCategoryName: string;
  quarterAddress: string;
  unitCode: string;
  moveInDate: Date | null;
  moveOutDate: Date | null;
};

function filterPenghuniInternalConflicts(
  candidates: PreparedPenghuniDraft[],
  failedMessages: string[],
) {
  const acceptedRows: PreparedPenghuniDraft[] = [];

  for (const candidate of candidates) {
    const candidateMoveInDate = candidate.moveInDate;

    if (
      getPenghuniCandidateUnitConflictKey(candidate) &&
      candidateMoveInDate &&
      acceptedRows.some(
        (accepted) =>
          getPenghuniCandidateUnitConflictKey(accepted) ===
            getPenghuniCandidateUnitConflictKey(candidate) &&
          accepted.residentId !== candidate.residentId &&
          accepted.moveInDate &&
          dateRangesOverlap(
            accepted.moveInDate,
            accepted.moveOutDate,
            candidateMoveInDate,
            candidate.moveOutDate,
          ),
      )
    ) {
      failedMessages.push(
        `Penghunian ${candidate.draft.fullName} gagal disahkan kerana unit ${candidate.draft.unitCode ?? ""} telah diduduki dalam tempoh tersebut.`,
      );
      continue;
    }

    acceptedRows.push(candidate);
  }

  return acceptedRows;
}

async function findConflictingPenghuniDraftIds(
  tx: Prisma.TransactionClient,
  candidates: PreparedPenghuniDraft[],
) {
  const occupancyCandidates = candidates.filter(
    (candidate) => candidate.unitId && candidate.moveInDate,
  );

  if (occupancyCandidates.length === 0) {
    return new Set<string>();
  }

  const payload = occupancyCandidates.map((candidate) => ({
    draftId: candidate.draft.id,
    residentId: candidate.residentId,
    unitId: candidate.unitId,
    moveInDate: candidate.moveInDate?.toISOString(),
    moveOutDate: candidate.moveOutDate?.toISOString() ?? null,
  }));

  const conflicts = await tx.$queryRaw<{ draftId: string }[]>`
    WITH input AS (
      SELECT *
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(
        "draftId" text,
        "residentId" uuid,
        "unitId" uuid,
        "moveInDate" timestamp,
        "moveOutDate" timestamp
      )
    )
    SELECT DISTINCT input."draftId"
    FROM input
    INNER JOIN "UnitOccupancy" occupancy
      ON occupancy."unitId" = input."unitId"
      AND occupancy."residentId" <> input."residentId"
      AND occupancy."moveInDate" <= COALESCE(input."moveOutDate", 'infinity'::timestamp)
      AND COALESCE(occupancy."moveOutDate", 'infinity'::timestamp) >= input."moveInDate"
  `;

  return new Set(conflicts.map((conflict) => conflict.draftId));
}

async function writePenghuniResidents(
  tx: Prisma.TransactionClient,
  rowsToVerify: PreparedPenghuniDraft[],
  existingResidentIds: Set<string>,
) {
  const rowsByResidentId = new Map<string, PreparedPenghuniDraft>();

  for (const row of rowsToVerify) {
    rowsByResidentId.set(row.residentId, row);
  }

  const rows = [...rowsByResidentId.values()];
  const existingRows = rows.filter((row) => existingResidentIds.has(row.residentId));
  const newRows = rows.filter((row) => !existingResidentIds.has(row.residentId));

  if (newRows.length > 0) {
    await tx.resident.createMany({
      data: newRows.map((row) => ({
        id: row.residentId,
        fullName: row.draft.fullName,
        icNumber: row.normalizedIc,
        phone: row.draft.phone,
        email: row.draft.email,
        position: row.draft.position,
        department: row.draft.department,
        serviceLevel: row.draft.serviceLevel,
        status: row.draft.status,
        description: row.draft.description,
      })),
      skipDuplicates: true,
    });
  }

  if (existingRows.length > 0) {
    await tx.$executeRaw`
      UPDATE "Resident" AS resident
      SET
        "fullName" = updates."fullName",
        "icNumber" = updates."icNumber",
        "phone" = updates."phone",
        "email" = updates."email",
        "position" = updates."position",
        "department" = updates."department",
        "serviceLevel" = updates."serviceLevel",
        "status" = updates."status",
        "description" = updates."description",
        "updatedAt" = NOW()
      FROM (
        VALUES ${Prisma.join(
          existingRows.map(
            (row) =>
              Prisma.sql`(
                ${row.residentId}::uuid,
                ${row.draft.fullName}::text,
                ${row.normalizedIc}::text,
                ${row.draft.phone ?? null}::text,
                ${row.draft.email ?? null}::text,
                ${row.draft.position ?? null}::text,
                ${row.draft.department ?? null}::text,
                ${row.draft.serviceLevel ?? null}::text,
                ${row.draft.status}::"ResidentStatus",
                ${row.draft.description ?? null}::text
              )`,
          ),
        )}
      ) AS updates(
        "id",
        "fullName",
        "icNumber",
        "phone",
        "email",
        "position",
        "department",
        "serviceLevel",
        "status",
        "description"
      )
      WHERE resident."id" = updates."id"
    `;
  }

  return { created: newRows.length, updated: existingRows.length };
}

async function writePenghuniOccupancies(
  tx: Prisma.TransactionClient,
  rowsToVerify: PreparedPenghuniDraft[],
) {
  const occupancyRows = rowsToVerify.filter(
    (row): row is PreparedPenghuniDraft & { unitId: string; moveInDate: Date } =>
      Boolean(row.unitId && row.moveInDate),
  );

  if (occupancyRows.length === 0) {
    return [];
  }

  const additionalAffectedUnitIds = await markOtherCurrentPenghuniOccupanciesPast(
    tx,
    occupancyRows,
  );
  const occupancyIdByDraftId = await findPenghuniOccupancyIdsToUpdate(
    tx,
    occupancyRows,
  );
  const rowsToUpdate = occupancyRows.filter((row) =>
    occupancyIdByDraftId.has(row.draft.id),
  );
  const rowsToCreate = occupancyRows.filter(
    (row) => !occupancyIdByDraftId.has(row.draft.id),
  );

  if (rowsToUpdate.length > 0) {
    await tx.$executeRaw`
      UPDATE "UnitOccupancy" AS occupancy
      SET
        "moveInDate" = updates."moveInDate",
        "moveOutDate" = updates."moveOutDate",
        "status" = updates."status",
        "description" = 'Dikemas kini selepas pengesahan dokumen penghuni.',
        "updatedAt" = NOW()
      FROM (
        VALUES ${Prisma.join(
          rowsToUpdate.map((row) => {
            const occupancyId = occupancyIdByDraftId.get(row.draft.id);
            const occupancyState = resolveQuarterUnitOccupancyState({
              moveInDate: row.moveInDate,
              moveOutDate: row.moveOutDate,
            });

            return Prisma.sql`(
              ${occupancyId}::uuid,
              ${row.moveInDate}::timestamp,
              ${row.moveOutDate}::timestamp,
              ${occupancyState.occupancyStatus}::"OccupancyStatus"
            )`;
          }),
        )}
      ) AS updates("id", "moveInDate", "moveOutDate", "status")
      WHERE occupancy."id" = updates."id"
    `;
  }

  if (rowsToCreate.length > 0) {
    await tx.unitOccupancy.createMany({
      data: rowsToCreate.map((row) => {
        const occupancyState = resolveQuarterUnitOccupancyState({
          moveInDate: row.moveInDate,
          moveOutDate: row.moveOutDate,
        });

        return {
          residentId: row.residentId,
          unitId: row.unitId,
          moveInDate: row.moveInDate,
          moveOutDate: row.moveOutDate,
          status: occupancyState.occupancyStatus,
          description: "Dicipta selepas pengesahan dokumen penghuni.",
        };
      }),
    });
  }

  return additionalAffectedUnitIds;
}

async function markOtherCurrentPenghuniOccupanciesPast(
  tx: Prisma.TransactionClient,
  occupancyRows: (PreparedPenghuniDraft & { unitId: string; moveInDate: Date })[],
) {
  const referenceDate = getTodayStartInMalaysia();

  const affectedRows = await tx.$queryRaw<{ unitId: string }[]>`
    UPDATE "UnitOccupancy" AS occupancy
    SET
      "moveOutDate" = COALESCE(occupancy."moveOutDate", updates."moveInDate"),
      "status" = CASE
        WHEN updates."moveInDate" < ${referenceDate}::timestamp
        THEN 'PAST'::"OccupancyStatus"
        ELSE 'CURRENT'::"OccupancyStatus"
      END,
      "updatedAt" = NOW()
    FROM (
      VALUES ${Prisma.join(
        occupancyRows.map(
          (row) =>
            Prisma.sql`(${row.residentId}::uuid, ${row.unitId}::uuid, ${row.moveInDate}::timestamp)`,
        ),
      )}
    ) AS updates("residentId", "unitId", "moveInDate")
    WHERE occupancy."residentId" = updates."residentId"
      AND occupancy."status" = 'CURRENT'::"OccupancyStatus"
      AND occupancy."unitId" <> updates."unitId"
      AND occupancy."moveInDate" <= updates."moveInDate"
    RETURNING occupancy."unitId" AS "unitId"
  `;

  return [...new Set(affectedRows.map((row) => row.unitId))];
}

async function findPenghuniOccupancyIdsToUpdate(
  tx: Prisma.TransactionClient,
  occupancyRows: (PreparedPenghuniDraft & { unitId: string; moveInDate: Date })[],
) {
  const rows = await tx.$queryRaw<{ draftId: string; occupancyId: string }[]>`
    WITH input AS (
      SELECT *
      FROM jsonb_to_recordset(${JSON.stringify(
        occupancyRows.map((row) => ({
          draftId: row.draft.id,
          residentId: row.residentId,
          unitId: row.unitId,
        })),
      )}::jsonb) AS x("draftId" text, "residentId" uuid, "unitId" uuid)
    )
    SELECT DISTINCT ON (input."draftId")
      input."draftId",
      occupancy."id" AS "occupancyId"
    FROM input
    INNER JOIN "UnitOccupancy" occupancy
      ON occupancy."residentId" = input."residentId"
      AND occupancy."unitId" = input."unitId"
    ORDER BY
      input."draftId",
      CASE WHEN occupancy."status" = 'CURRENT'::"OccupancyStatus" THEN 0 ELSE 1 END,
      occupancy."moveInDate" DESC,
      occupancy."createdAt" DESC
  `;

  return new Map(rows.map((row) => [row.draftId, row.occupancyId]));
}

function buildRecordFromDraft(
  draft: Prisma.ResidentDraftGetPayload<Record<string, never>>,
): ExtractedPenghuniRecord {
  return {
    residentId: draft.id,
    originalResidentId: draft.originalResidentId ?? undefined,
    isExisted: false,
    nama: draft.fullName,
    noKadPengenalan: draft.icNumber,
    kuarters: draft.quarterCategoryName ?? "",
    unit: draft.unitCode ?? "",
    alamatKuarters: draft.quarterAddress ?? "",
    perhubungan: draft.phone ?? "",
    gmail: draft.email ?? "",
    pekerjaan: draft.position ?? "",
    jabatan: draft.department ?? "",
    tarafPerkhidmatan: draft.serviceLevel ?? "",
    tarikhMasuk: draft.moveInDate?.toISOString() ?? "",
    tarikhKeluar: draft.moveOutDate?.toISOString() ?? "",
    catatan: draft.description ?? "",
  };
}

type UnitResolutionResult = {
  unitId: string;
  unitKey: string;
  categoryName: string;
  address: string;
  unitCode: string;
  failedMessage?: string;
  successMessages: string[];
};

type PenghuniUnitResolutionCache = {
  existingUnitIdByRecordKey: Map<string, string>;
  categoryIdByNameAddress: Map<string, string>;
  unitIdByCategoryUnit: Map<string, string>;
};

async function createPenghuniUnitResolutionCache(
  tx: Prisma.TransactionClient,
  records: ExtractedPenghuniRecord[],
): Promise<PenghuniUnitResolutionCache> {
  const categoryIdByNameAddress = await findExistingPenghuniCategoryIdsByKey(
    tx,
    records,
  );
  const existingUnitIdByRecordKey = await findExistingPenghuniUnitIdsByRecordKey(
    tx,
    records,
  );
  const unitIdByCategoryUnit = new Map<string, string>();

  for (const record of records) {
    const categoryName = normalizePenghuniText(record.kuarters);
    const address = normalizePenghuniAddress(record.alamatKuarters);
    const unitCode = normalizePenghuniText(record.unit);

    if (!categoryName || !unitCode) {
      continue;
    }

    const categoryId = categoryIdByNameAddress.get(
      getPenghuniCategoryKey(categoryName, address),
    );

    if (!categoryId) {
      continue;
    }

    unitIdByCategoryUnit.set(
      getPenghuniCategoryUnitKey(categoryId, unitCode),
      existingUnitIdByRecordKey.get(getPenghuniRecordUnitKey(record)) ?? "",
    );
  }

  return {
    existingUnitIdByRecordKey,
    categoryIdByNameAddress,
    unitIdByCategoryUnit,
  };
}

async function resolvePenghuniUnit(
  tx: Prisma.TransactionClient,
  record: ExtractedPenghuniRecord,
  residentName: string,
  cache: PenghuniUnitResolutionCache,
): Promise<UnitResolutionResult> {
  const categoryName = normalizePenghuniText(record.kuarters);
  const rawAddress = normalizePenghuniText(record.alamatKuarters);
  const address = normalizePenghuniAddress(record.alamatKuarters);
  const unitCode = normalizePenghuniText(record.unit);
  const hasAnyQuarterInfo = Boolean(categoryName || rawAddress || unitCode);
  const emptyResult = {
    unitId: "",
    unitKey: "",
    categoryName: "",
    address: "",
    unitCode: "",
    successMessages: [],
  };

  if (!hasAnyQuarterInfo) {
    return emptyResult;
  }

  if (!categoryName || !unitCode) {
    return {
      unitId: "",
      unitKey: "",
      categoryName: "",
      address: "",
      unitCode: "",
      failedMessage: `Penghuni ${residentName} gagal disahkan kerana maklumat kuarters tidak lengkap.`,
      successMessages: [],
    };
  }

  const recordUnitKey = getPenghuniRecordUnitKeyFromParts({
    categoryName,
    address,
    unitCode,
  });
  const existingUnitId = cache.existingUnitIdByRecordKey.get(recordUnitKey);

  if (existingUnitId) {
    return {
      unitId: existingUnitId,
      unitKey: recordUnitKey,
      categoryName,
      address,
      unitCode,
      successMessages: [],
    };
  }

  const categoryKey = getPenghuniCategoryKey(categoryName, address);
  let categoryId = cache.categoryIdByNameAddress.get(categoryKey);

  if (categoryId === undefined) {
    categoryId = await findQuarterCategoryByNameAddress(tx, categoryName, address);
    cache.categoryIdByNameAddress.set(categoryKey, categoryId);
  }

  let unitId = "";

  if (categoryId) {
    const unitKey = getPenghuniCategoryUnitKey(categoryId, unitCode);
    unitId = cache.unitIdByCategoryUnit.get(unitKey) ?? "";

    if (!cache.unitIdByCategoryUnit.has(unitKey)) {
      unitId = await findUnitByCategoryIdAndCode(tx, categoryId, unitCode);
      cache.unitIdByCategoryUnit.set(unitKey, unitId);
    }
  }

  return {
    unitId,
    unitKey: recordUnitKey,
    categoryName,
    address,
    unitCode,
    successMessages: [],
  };
}

async function createMissingPenghuniUnitsForVerifiedRows(
  tx: Prisma.TransactionClient,
  rowsToVerify: PreparedPenghuniDraft[],
  cache: PenghuniUnitResolutionCache,
) {
  const successMessages: string[] = [];

  for (const row of rowsToVerify) {
    if (row.unitId || !row.unitKey) {
      continue;
    }

    const categoryKey = getPenghuniCategoryKey(
      row.quarterCategoryName,
      row.quarterAddress,
    );
    let categoryId = cache.categoryIdByNameAddress.get(categoryKey);

    if (categoryId === undefined) {
      categoryId = await findQuarterCategoryByNameAddress(
        tx,
        row.quarterCategoryName,
        row.quarterAddress,
      );
      cache.categoryIdByNameAddress.set(categoryKey, categoryId);
    }

    if (!categoryId) {
      const category = await tx.quarterCategory.create({
        data: {
          categoryName: row.quarterCategoryName,
          address: row.quarterAddress,
          rentalPrice: 0,
          maintenancePrice: 0,
          penaltyPrice: 0,
        },
        select: { id: true },
      });
      categoryId = category.id;
      cache.categoryIdByNameAddress.set(categoryKey, categoryId);
      successMessages.push(
        `Kategori kuarters ${row.quarterCategoryName} ditambah secara automatik.`,
      );
    }

    const categoryUnitKey = getPenghuniCategoryUnitKey(categoryId, row.unitCode);
    let unitId = cache.unitIdByCategoryUnit.get(categoryUnitKey);

    if (unitId === undefined) {
      unitId = await findUnitByCategoryIdAndCode(tx, categoryId, row.unitCode);
      cache.unitIdByCategoryUnit.set(categoryUnitKey, unitId);
    }

    if (!unitId) {
      const unit = await tx.unit.create({
        data: {
          unitCode: row.unitCode,
          status: "VACANT",
          categoryId,
        },
        select: { id: true },
      });
      unitId = unit.id;
      cache.unitIdByCategoryUnit.set(categoryUnitKey, unitId);
      cache.existingUnitIdByRecordKey.set(row.unitKey, unitId);
      successMessages.push(`Unit ${row.unitCode} ditambah secara automatik.`);
    }

    row.unitId = unitId;
  }

  return successMessages;
}

async function findExistingPenghuniCategoryIdsByKey(
  tx: Prisma.TransactionClient,
  records: ExtractedPenghuniRecord[],
) {
  const payload = records
    .map((record) => ({
      key: getPenghuniCategoryKey(
        normalizePenghuniText(record.kuarters),
        normalizePenghuniAddress(record.alamatKuarters),
      ),
      categoryName: normalizePenghuniText(record.kuarters),
      address: normalizePenghuniAddress(record.alamatKuarters),
    }))
    .filter((record) => record.categoryName);
  const categoryIdByKey = new Map(payload.map((row) => [row.key, ""]));

  if (payload.length === 0) {
    return categoryIdByKey;
  }

  const uniquePayload = [...new Map(payload.map((row) => [row.key, row])).values()];
  const rows = await tx.$queryRaw<{ key: string; categoryId: string }[]>`
    WITH input AS (
      SELECT *
      FROM jsonb_to_recordset(${JSON.stringify(uniquePayload)}::jsonb) AS x(
        "key" text,
        "categoryName" text,
        "address" text
      )
    )
    SELECT DISTINCT ON (input."key")
      input."key",
      category."id" AS "categoryId"
    FROM input
    INNER JOIN "QuarterCategory" category
      ON UPPER(TRIM(regexp_replace(category."categoryName", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(input."categoryName", '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE(category."address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(input."address", '\\s+', ' ', 'g')))
    ORDER BY input."key", category."createdAt" DESC
  `;

  for (const row of rows) {
    categoryIdByKey.set(row.key, row.categoryId);
  }

  return categoryIdByKey;
}

async function findExistingPenghuniUnitIdsByRecordKey(
  tx: Prisma.TransactionClient,
  records: ExtractedPenghuniRecord[],
) {
  const payload = records
    .map((record) => ({
      key: getPenghuniRecordUnitKey(record),
      categoryName: normalizePenghuniText(record.kuarters),
      address: normalizePenghuniAddress(record.alamatKuarters),
      unitCode: normalizePenghuniText(record.unit),
    }))
    .filter((record) => record.categoryName && record.unitCode);
  const unitIdByRecordKey = new Map<string, string>();

  if (payload.length === 0) {
    return unitIdByRecordKey;
  }

  const uniquePayload = [...new Map(payload.map((row) => [row.key, row])).values()];
  const rows = await tx.$queryRaw<{ key: string; unitId: string }[]>`
    WITH input AS (
      SELECT *
      FROM jsonb_to_recordset(${JSON.stringify(uniquePayload)}::jsonb) AS x(
        "key" text,
        "categoryName" text,
        "address" text,
        "unitCode" text
      )
    )
    SELECT DISTINCT ON (input."key")
      input."key",
      unit."id" AS "unitId"
    FROM input
    INNER JOIN "QuarterCategory" category
      ON UPPER(TRIM(regexp_replace(category."categoryName", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(input."categoryName", '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE(category."address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(input."address", '\\s+', ' ', 'g')))
    INNER JOIN "Unit" unit
      ON unit."categoryId" = category."id"
      AND UPPER(TRIM(regexp_replace(unit."unitCode", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(input."unitCode", '\\s+', ' ', 'g')))
    ORDER BY input."key", unit."createdAt" DESC
  `;

  for (const row of rows) {
    unitIdByRecordKey.set(row.key, row.unitId);
  }

  return unitIdByRecordKey;
}

function getPenghuniCategoryKey(categoryName: string, address: string) {
  return [categoryName.toUpperCase(), address.toUpperCase()].join("|");
}

function getPenghuniCategoryUnitKey(categoryId: string, unitCode: string) {
  return [categoryId, unitCode.toUpperCase()].join("|");
}

function getPenghuniRecordUnitKey(record: ExtractedPenghuniRecord) {
  return getPenghuniRecordUnitKeyFromParts({
    categoryName: normalizePenghuniText(record.kuarters),
    address: normalizePenghuniAddress(record.alamatKuarters),
    unitCode: normalizePenghuniText(record.unit),
  });
}

function getPenghuniRecordUnitKeyFromParts({
  categoryName,
  address,
  unitCode,
}: {
  categoryName: string;
  address: string;
  unitCode: string;
}) {
  return [
    categoryName.toUpperCase(),
    address.toUpperCase(),
    unitCode.toUpperCase(),
  ].join("|");
}

function normalizePenghuniText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizePenghuniAddress(value: unknown) {
  return normalizePenghuniText(value) || DEFAULT_QUARTER_ADDRESS;
}

function normalizeSelectedKey(value: string) {
  return value.trim();
}

function normalizeIc(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function dateRangesOverlap(
  firstMoveInDate: Date,
  firstMoveOutDate: Date | null,
  secondMoveInDate: Date,
  secondMoveOutDate: Date | null,
) {
  const firstEndTime = firstMoveOutDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const secondEndTime = secondMoveOutDate?.getTime() ?? Number.POSITIVE_INFINITY;

  return firstMoveInDate.getTime() <= secondEndTime &&
    firstEndTime >= secondMoveInDate.getTime();
}

function getPenghuniCandidateUnitConflictKey(candidate: PreparedPenghuniDraft) {
  return candidate.unitId || candidate.unitKey;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function syncUnitOccupancyStatuses(
  tx: Prisma.TransactionClient,
  unitIds: string[],
) {
  if (unitIds.length === 0) {
    return;
  }

  const referenceDate = getTodayStartInMalaysia();

  await tx.$executeRaw`
    UPDATE "UnitOccupancy" AS occupancy
    SET
      "status" = CASE
        WHEN occupancy."moveOutDate" IS NOT NULL
          AND occupancy."moveOutDate" < ${referenceDate}::timestamp
        THEN 'PAST'::"OccupancyStatus"
        ELSE 'CURRENT'::"OccupancyStatus"
      END,
      "updatedAt" = NOW()
    WHERE occupancy."unitId" IN (${Prisma.join(unitIds)})
  `;

  await tx.$executeRaw`
    UPDATE "Unit" AS unit
    SET
      "status" = CASE
        WHEN EXISTS (
          SELECT 1
          FROM "UnitOccupancy" occupancy
          WHERE occupancy."unitId" = unit."id"
            AND occupancy."moveInDate" <= ${referenceDate}::timestamp
            AND (
              occupancy."moveOutDate" IS NULL
              OR occupancy."moveOutDate" >= ${referenceDate}::timestamp
            )
        )
        THEN 'OCCUPIED'::"UnitStatus"
        ELSE 'VACANT'::"UnitStatus"
      END,
      "updatedAt" = NOW()
    WHERE unit."id" IN (${Prisma.join(unitIds)})
  `;
}

async function findResidentIdsByNormalizedIc(
  tx: Prisma.TransactionClient,
  drafts: Prisma.ResidentDraftGetPayload<Record<string, never>>[],
) {
  const normalizedIcs = [...new Set(
    drafts
      .map((draft) => normalizeIc(draft.icNumber))
      .filter((icNumber) => icNumber.length === 12),
  )];
  const residentIdByIc = new Map<string, string>();

  if (normalizedIcs.length === 0) {
    return residentIdByIc;
  }

  const exactResidents = await tx.resident.findMany({
    where: { icNumber: { in: normalizedIcs } },
    select: { id: true, icNumber: true },
  });

  for (const resident of exactResidents) {
    residentIdByIc.set(normalizeIc(resident.icNumber), resident.id);
  }

  const missingIcs = normalizedIcs.filter(
    (icNumber) => !residentIdByIc.has(icNumber),
  );

  if (missingIcs.length === 0) {
    return residentIdByIc;
  }

  const formattedResidents = await tx.$queryRaw<
    { id: string; normalizedIc: string }[]
  >`
    SELECT
      "id",
      regexp_replace("icNumber", '\\D', '', 'g') AS "normalizedIc"
    FROM "Resident"
    WHERE regexp_replace("icNumber", '\\D', '', 'g') IN (${Prisma.join(missingIcs)})
  `;

  for (const resident of formattedResidents) {
    if (resident.normalizedIc && !residentIdByIc.has(resident.normalizedIc)) {
      residentIdByIc.set(resident.normalizedIc, resident.id);
    }
  }

  return residentIdByIc;
}

function parsePenghuniMoveInDate(value: string) {
  const date = parsePenghuniDateValue(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseNullablePenghuniDate(value: string) {
  if (!value) {
    return null;
  }

  const date = parsePenghuniDateValue(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parsePenghuniDateValue(value: string) {
  const normalizedValue = value.trim();
  const dayFirstMatch = normalizedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  return dayFirstMatch
    ? new Date(
        `${dayFirstMatch[3]}-${dayFirstMatch[2]}-${dayFirstMatch[1]}T00:00:00.000Z`,
      )
    : new Date(value);
}
