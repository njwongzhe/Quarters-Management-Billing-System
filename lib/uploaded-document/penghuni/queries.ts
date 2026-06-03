import { Prisma } from "@prisma/client";

import type { ExtractedPenghuniRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import type { QueryClient } from "@/lib/uploaded-document/shared";
import { findResidentByNormalizedIc } from "@/lib/uploaded-document/shared";

type ResidentExactMatch = {
  residentId: string;
  unitId: string | null;
};

export type PenghuniExactMatchInput = ExtractedPenghuniRecord & {
  residentId: string;
};

type ResidentExactMatchRow = ResidentExactMatch & {
  draftId: string;
};

function normalizedSql(column: string) {
  return Prisma.sql`regexp_replace(UPPER(COALESCE(${Prisma.raw(column)}, '')), '[^A-Z0-9]+', '', 'g')`;
}

function normalizedParamSql(value: string) {
  return Prisma.sql`regexp_replace(UPPER(COALESCE(${value}::text, '')), '[^A-Z0-9]+', '', 'g')`;
}

function normalizedUnitSql(column: string) {
  return Prisma.sql`UPPER(TRIM(regexp_replace(COALESCE(${Prisma.raw(column)}, ''), '\\s+', ' ', 'g')))`;
}

function normalizedUnitParamSql(value: string) {
  return Prisma.sql`UPPER(TRIM(regexp_replace(COALESCE(${value}::text, ''), '\\s+', ' ', 'g')))`;
}

function normalizedPositionSql(column: string) {
  return Prisma.sql`regexp_replace(regexp_replace(UPPER(COALESCE(${Prisma.raw(column)}, '')), '\\s*-?\\s*[A-Z]{1,3}\\d{1,2}\\s*$', ''), '[^A-Z0-9]+', '', 'g')`;
}

function normalizedPositionParamSql(value: string) {
  return Prisma.sql`regexp_replace(regexp_replace(UPPER(COALESCE(${value}::text, '')), '\\s*-?\\s*[A-Z]{1,3}\\d{1,2}\\s*$', ''), '[^A-Z0-9]+', '', 'g')`;
}

function normalizeDateForExactMatch(value: string | undefined) {
  const normalizedValue = value?.trim() ?? "";
  const dayFirstMatch = normalizedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (dayFirstMatch) {
    return `${dayFirstMatch[3]}-${dayFirstMatch[2]}-${dayFirstMatch[1]}`;
  }

  return /^\d{4}-\d{2}-\d{2}/.test(normalizedValue)
    ? normalizedValue.slice(0, 10)
    : "";
}

function normalizeAddressForExactMatch(value: string | undefined) {
  return normalizePenghuniLookupText(value) || "N/A";
}

export async function findExactPenghuniMatch(
  tx: QueryClient,
  record: ExtractedPenghuniRecord,
): Promise<ResidentExactMatch | null> {
  const residentId = await findResidentByNormalizedIc(tx, record.noKadPengenalan);

  if (!residentId) {
    return null;
  }

  const moveInDate = normalizeDateForExactMatch(record.tarikhMasuk);
  const moveOutDate = normalizeDateForExactMatch(record.tarikhKeluar);
  const quarterAddress = normalizeAddressForExactMatch(record.alamatKuarters);

  const matches = await tx.$queryRaw<ResidentExactMatch[]>`
    SELECT
      r."id" AS "residentId",
      u."id" AS "unitId"
    FROM "Resident" r
    LEFT JOIN "UnitOccupancy" o
      ON o."residentId" = r."id"
    LEFT JOIN "Unit" u
      ON u."id" = o."unitId"
    LEFT JOIN "QuarterCategory" qc
      ON qc."id" = u."categoryId"
    WHERE r."id" = ${residentId}::uuid
      AND ${normalizedSql('r."fullName"')} =
        ${normalizedParamSql(record.nama)}
      AND regexp_replace(r."icNumber", '\\D', '', 'g') =
        regexp_replace(${record.noKadPengenalan}, '\\D', '', 'g')
      AND regexp_replace(COALESCE(r."phone", ''), '[\\s-]', '', 'g') =
        regexp_replace(COALESCE(${record.perhubungan}::text, ''), '[\\s-]', '', 'g')
      AND LOWER(TRIM(COALESCE(r."email", ''))) =
        LOWER(TRIM(COALESCE(${record.gmail ?? ""}::text, '')))
      AND ${normalizedPositionSql('r."position"')} =
        ${normalizedPositionParamSql(record.pekerjaan)}
      AND ${normalizedSql('r."department"')} =
        ${normalizedParamSql(record.jabatan)}
      AND ${normalizedSql('r."serviceLevel"')} =
        ${normalizedParamSql(record.tarafPerkhidmatan ?? "")}
      AND ${normalizedSql('qc."categoryName"')} =
        ${normalizedParamSql(record.kuarters)}
      AND ${normalizedSql('qc."address"')} =
        ${normalizedParamSql(quarterAddress)}
      AND ${normalizedUnitSql('u."unitCode"')} =
        ${normalizedUnitParamSql(record.unit)}
      AND COALESCE(to_char(o."moveInDate", 'YYYY-MM-DD'), '') =
        COALESCE(${moveInDate}::text, '')
      AND COALESCE(to_char(o."moveOutDate", 'YYYY-MM-DD'), '') =
        COALESCE(${moveOutDate}::text, '')
    LIMIT 1
  `;

  return matches[0] ?? null;
}

export async function findExactPenghuniMatches(
  tx: QueryClient,
  records: PenghuniExactMatchInput[],
) {
  if (records.length === 0) {
    return new Map<string, ResidentExactMatch>();
  }

  const payload = records.map((record) => ({
    draftId: record.residentId,
    nama: record.nama,
    noKadPengenalan: record.noKadPengenalan,
    perhubungan: record.perhubungan,
    gmail: record.gmail ?? "",
    pekerjaan: record.pekerjaan,
    jabatan: record.jabatan,
    tarafPerkhidmatan: record.tarafPerkhidmatan ?? "",
    kuarters: record.kuarters,
    alamatKuarters: normalizeAddressForExactMatch(record.alamatKuarters),
    unit: record.unit,
    tarikhMasuk: normalizeDateForExactMatch(record.tarikhMasuk),
    tarikhKeluar: normalizeDateForExactMatch(record.tarikhKeluar),
  }));

  const matches = await tx.$queryRaw<ResidentExactMatchRow[]>`
    WITH input AS (
      SELECT *
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(
        "draftId" text,
        "nama" text,
        "noKadPengenalan" text,
        "perhubungan" text,
        "gmail" text,
        "pekerjaan" text,
        "jabatan" text,
        "tarafPerkhidmatan" text,
        "kuarters" text,
        "alamatKuarters" text,
        "unit" text,
        "tarikhMasuk" text,
        "tarikhKeluar" text
      )
    )
    SELECT DISTINCT ON (input."draftId")
      input."draftId",
      r."id" AS "residentId",
      u."id" AS "unitId"
    FROM input
    INNER JOIN "Resident" r
      ON regexp_replace(r."icNumber", '\\D', '', 'g') =
        regexp_replace(input."noKadPengenalan", '\\D', '', 'g')
    LEFT JOIN "UnitOccupancy" o
      ON o."residentId" = r."id"
    LEFT JOIN "Unit" u
      ON u."id" = o."unitId"
    LEFT JOIN "QuarterCategory" qc
      ON qc."id" = u."categoryId"
    WHERE ${normalizedSql('r."fullName"')} =
        ${normalizedSql('input."nama"')}
      AND regexp_replace(COALESCE(r."phone", ''), '[\\s-]', '', 'g') =
        regexp_replace(COALESCE(input."perhubungan", ''), '[\\s-]', '', 'g')
      AND LOWER(TRIM(COALESCE(r."email", ''))) =
        LOWER(TRIM(COALESCE(input."gmail", '')))
      AND ${normalizedPositionSql('r."position"')} =
        ${normalizedPositionSql('input."pekerjaan"')}
      AND ${normalizedSql('r."department"')} =
        ${normalizedSql('input."jabatan"')}
      AND ${normalizedSql('r."serviceLevel"')} =
        ${normalizedSql('input."tarafPerkhidmatan"')}
      AND ${normalizedSql('qc."categoryName"')} =
        ${normalizedSql('input."kuarters"')}
      AND ${normalizedSql('qc."address"')} =
        ${normalizedSql('input."alamatKuarters"')}
      AND ${normalizedUnitSql('u."unitCode"')} =
        ${normalizedUnitSql('input."unit"')}
      AND COALESCE(to_char(o."moveInDate", 'YYYY-MM-DD'), '') =
        COALESCE(input."tarikhMasuk", '')
      AND COALESCE(to_char(o."moveOutDate", 'YYYY-MM-DD'), '') =
        COALESCE(input."tarikhKeluar", '')
  `;

  return new Map(
    matches.map((match) => [
      match.draftId,
      { residentId: match.residentId, unitId: match.unitId },
    ]),
  );
}

export async function findUnitIdForPenghuniRecord(
  tx: QueryClient,
  record: Pick<ExtractedPenghuniRecord, "kuarters" | "unit" | "alamatKuarters">,
) {
  const categoryName = normalizePenghuniLookupText(record.kuarters);
  const address = normalizePenghuniLookupAddress(record.alamatKuarters);
  const unitCode = normalizePenghuniLookupText(record.unit);

  if (!categoryName || !unitCode) {
    return "";
  }

  const units = await tx.$queryRaw<{ id: string }[]>`
    SELECT u."id"
    FROM "Unit" u
    INNER JOIN "QuarterCategory" qc
      ON qc."id" = u."categoryId"
    WHERE UPPER(TRIM(regexp_replace(u."unitCode", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${unitCode}, '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(qc."categoryName", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${categoryName}, '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE(qc."address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${address}, '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return units[0]?.id ?? "";
}

function normalizePenghuniLookupText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizePenghuniLookupAddress(value: unknown) {
  return normalizePenghuniLookupText(value) || "N/A";
}

export async function hasOccupancyConflict(
  tx: Prisma.TransactionClient,
  unitId: string,
  _residentId: string | null,
  moveInDate: Date,
  moveOutDate: Date | null,
) {
  const conflicts = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "UnitOccupancy"
    WHERE "unitId" = ${unitId}::uuid
      AND "moveInDate" <= COALESCE(${moveOutDate}, 'infinity'::timestamp)
      AND COALESCE("moveOutDate", 'infinity'::timestamp) >= ${moveInDate}
    LIMIT 1
  `;

  return conflicts.length > 0;
}
