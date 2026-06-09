-- Automates scheduled quarter unit check-in/check-out status updates.
--
-- Source of truth:
-- - "UnitOccupancy"."moveInDate"
-- - "UnitOccupancy"."moveOutDate"
--
-- Cached/derived fields updated by this migration:
-- - "UnitOccupancy"."status"
-- - "Unit"."status"
--
-- Schedule:
-- - Runs daily at 00:05 Malaysia time.
-- - pg_cron schedules use UTC, so 00:05 MYT is 16:05 UTC on the previous day.
--
-- Supabase prerequisite:
-- - Enable pg_cron in Supabase Dashboard > Integrations > Cron.

CREATE OR REPLACE FUNCTION public.sync_quarter_unit_occupancy_statuses(
  p_reference_date date DEFAULT (timezone('Asia/Kuala_Lumpur', now())::date)
)
RETURNS TABLE (
  updated_occupancies integer,
  updated_units integer
) AS $$
DECLARE
  v_reference_timestamp timestamp := p_reference_date::timestamp;
BEGIN
  WITH changed_occupancies AS (
    UPDATE "UnitOccupancy" AS occupancy
    SET
      "status" = CASE
        WHEN occupancy."moveOutDate" IS NOT NULL
          AND occupancy."moveOutDate" < v_reference_timestamp
        THEN 'PAST'::"OccupancyStatus"
        ELSE 'CURRENT'::"OccupancyStatus"
      END,
      "updatedAt" = NOW()
    WHERE occupancy."status" IS DISTINCT FROM CASE
        WHEN occupancy."moveOutDate" IS NOT NULL
          AND occupancy."moveOutDate" < v_reference_timestamp
        THEN 'PAST'::"OccupancyStatus"
        ELSE 'CURRENT'::"OccupancyStatus"
      END
    RETURNING 1
  )
  SELECT COUNT(*)::integer
  INTO updated_occupancies
  FROM changed_occupancies;

  WITH next_unit_status AS (
    SELECT
      unit_row."id",
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM "UnitOccupancy" AS occupancy
          WHERE occupancy."unitId" = unit_row."id"
            AND occupancy."moveInDate" <= v_reference_timestamp
            AND (
              occupancy."moveOutDate" IS NULL
              OR occupancy."moveOutDate" >= v_reference_timestamp
            )
        )
        THEN 'OCCUPIED'::"UnitStatus"
        ELSE 'VACANT'::"UnitStatus"
      END AS "nextStatus"
    FROM "Unit" AS unit_row
  ),
  changed_units AS (
    UPDATE "Unit" AS unit_row
    SET
      "status" = next_unit_status."nextStatus",
      "updatedAt" = NOW()
    FROM next_unit_status
    WHERE unit_row."id" = next_unit_status."id"
      AND unit_row."status" IS DISTINCT FROM next_unit_status."nextStatus"
    RETURNING 1
  )
  SELECT COUNT(*)::integer
  INTO updated_units
  FROM changed_units;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Run once immediately when the migration is applied so existing scheduled
-- assignments are normalized before waiting for the next cron run.
SELECT public.sync_quarter_unit_occupancy_statuses();

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF CURRENT_DATABASE() = 'postgres' THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    IF EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'daily-quarter-unit-occupancy-status-sync'
    ) THEN
      PERFORM cron.unschedule('daily-quarter-unit-occupancy-status-sync');
    END IF;

    PERFORM cron.schedule(
      'daily-quarter-unit-occupancy-status-sync',
      '5 16 * * *',
      $cron$
        SELECT public.sync_quarter_unit_occupancy_statuses();
      $cron$
    );
  END IF;
END $$;
