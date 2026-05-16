-- How to Use This Migration:
-- 1. In command line, run: `npx prisma migrate dev --name add_status_automation`.
-- 2. Then, find the generated SQL file (migration.sql) in `prisma/migrations/<id>_add_status_automation/migration.sql` and replace its content with this code.
-- 3. To apply the migration, run: `npx prisma migrate deploy` again.
-- If any edited has been maded to this file, please make sure to do further steps to ensure the changes are applied correctly:
-- 1. Go to Supabase Sidebar > "SQL Editer" and run:
--    DELETE FROM _prisma_migrations 
--    WHERE migration_name = '<id>_add_status_automation'; -- Replace <id> with the actual ID of the migration folder you just created.
-- 2. Then, re-run Step 1 to Step 3 above to ensure the migration is applied with the correct changes.

-- Prerequisites:
-- Activate pg_cron extension in your Supabase database to enable scheduled tasks.
-- Go to Supabase Sidebar > "Integrations" > "Cron" and enable "pg_cron" if it's not already active.

-- To Check The Setup is Working:
-- Go to Supabase Sidebar > "Database" > "Triggers" and verify that the triggers for "UnitOccupancy", "Transaction" and "Resident" are created successfully.
-- Go to Supabase Sidebar > "Integrations" > "Cron" > "Jobs" and verify that the scheduled job "daily-age-status-update" is listed.

-- Current Logic:
-- 1. [Highest Priority]: If a resident has no occupancy record but has transaction records, set status to "DATA_TIDAK_LENGKAP".
-- 2. [Sticky Rule]: If original status is "TIDAK_LAYAK", it cannot revert to "AKTIF" or "PENCEN_MENDATANG" unless data is incomplete.
-- 3. [Age Rule]: If a resident has reached 60 years old (exactly to the day), set status to "TIDAK_LAYAK".
-- 4. [Age Rule]: If a resident has reached 59 years old (exactly to the day), set status to "PENCEN_MENDATANG".
-- 5. Otherwise, set status to "AKTIF".
-- 6. [Global Monitoring]: Any update to Resident, UnitOccupancy or Transaction will trigger this calculation.

-- ======================================================================
-- 1. Update ResidentStatus Based on UnitOccupancy, Transactions and Age
-- ======================================================================
CREATE OR REPLACE FUNCTION calculate_and_update_resident_status(p_resident_id UUID)
RETURNS VOID AS $$
DECLARE
  v_has_occupancy BOOLEAN;
  v_has_transaction BOOLEAN;
  v_ic_number TEXT;
  v_old_status "ResidentStatus"; -- Used to check the current status before update.
  v_new_status "ResidentStatus"; -- Strictly using the Prisma Enum type.
BEGIN
  -- 1. Retrieve the IC Number and Current Status of the resident.
  SELECT "icNumber", "status" INTO v_ic_number, v_old_status FROM "Resident" WHERE id = p_resident_id;

  -- 2. Check if a UnitOccupancy record exists.
  SELECT EXISTS(
    SELECT 1 FROM "UnitOccupancy" WHERE "residentId" = p_resident_id
  ) INTO v_has_occupancy;

  -- 3. Check if a Transaction record exists.
  SELECT EXISTS(
    SELECT 1 FROM "Transaction" WHERE "residentId" = p_resident_id
  ) INTO v_has_transaction;

  -- 4. Optimized Priority Evaluation (Lazy Evaluation)
  
  -- [Step A]: Check for incomplete data (Highest Priority).
  IF v_has_occupancy = false AND v_has_transaction = true THEN
    v_new_status := 'DATA_TIDAK_LENGKAP';

  -- [Step B]: Check if original status is already 'TIDAK_LAYAK' (Sticky Rule).
  ELSIF v_old_status = 'TIDAK_LAYAK' THEN
    v_new_status := 'TIDAK_LAYAK';

  -- [Step C]: Only calculate age if previous conditions are NOT met.
  ELSE
    DECLARE
      v_age INT := 0;
      v_ic_yy INT; v_ic_mm INT; v_ic_dd INT;
      v_birth_year INT; v_birth_date DATE;
    BEGIN
      -- Calculate exact age based on Malaysian IC Number.
      IF LENGTH(v_ic_number) >= 6 THEN
        v_ic_yy := SUBSTRING(v_ic_number FROM 1 FOR 2)::INT;
        v_ic_mm := SUBSTRING(v_ic_number FROM 3 FOR 2)::INT;
        v_ic_dd := SUBSTRING(v_ic_number FROM 5 FOR 2)::INT;

        IF v_ic_yy > (EXTRACT(YEAR FROM CURRENT_DATE) - 2000) THEN
          v_birth_year := 1900 + v_ic_yy;
        ELSE
          v_birth_year := 2000 + v_ic_yy;
        END IF;

        IF v_ic_mm BETWEEN 1 AND 12 AND v_ic_dd BETWEEN 1 AND 31 THEN
          v_birth_date := make_date(v_birth_year, v_ic_mm, v_ic_dd);
          v_age := EXTRACT(YEAR FROM age(CURRENT_DATE, v_birth_date));
        END IF;
      END IF;

      -- Apply Age Rule
      IF v_age >= 60 THEN
        v_new_status := 'TIDAK_LAYAK';
      ELSIF v_age = 59 THEN
        v_new_status := 'PENCEN_MENDATANG';
      ELSIF v_age >= 0 THEN
        v_new_status := 'AKTIF';
      ELSE
        v_new_status := 'DATA_TIDAK_LENGKAP';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_new_status := 'DATA_TIDAK_LENGKAP'; -- Fallback if IC parsing fails.
    END;
  END IF;

  -- 6. Execute update. (Ensure we only write to the DB if the status actually changes.)
  UPDATE "Resident"
  SET status = v_new_status
  WHERE id = p_resident_id 
    AND status IS DISTINCT FROM v_new_status;
END;
$$ LANGUAGE plpgsql;


-- ==================================
-- 2. Real-time Monitoring: Triggers
-- ==================================

-- A. Resident Table Trigger: Triggered by ANY data update on the Resident record.
CREATE OR REPLACE FUNCTION trigger_on_resident_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Use pg_trigger_depth() to prevent infinite loops when the function itself updates the Resident status.
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  PERFORM calculate_and_update_resident_status(NEW.id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Listen for any INSERT, UPDATE on Resident table.
DROP TRIGGER IF EXISTS check_status_on_resident_update ON "Resident";
CREATE TRIGGER check_status_on_resident_update
AFTER INSERT OR UPDATE ON "Resident"
FOR EACH ROW EXECUTE FUNCTION trigger_on_resident_change();


-- B. Relation Tables Trigger: Triggered by changes in Occupancy or Transactions.
CREATE OR REPLACE FUNCTION trigger_relation_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_and_update_resident_status(OLD."residentId");
  ELSE
    PERFORM calculate_and_update_resident_status(NEW."residentId");
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Listen for INSERT, UPDATE, or DELETE on UnitOccupancy table.
DROP TRIGGER IF EXISTS check_status_on_occupancy ON "UnitOccupancy";
CREATE TRIGGER check_status_on_occupancy
AFTER INSERT OR UPDATE OR DELETE ON "UnitOccupancy"
FOR EACH ROW EXECUTE FUNCTION trigger_relation_status_update();

-- Listen for INSERT, UPDATE, or DELETE on Transaction table.
DROP TRIGGER IF EXISTS check_status_on_transaction ON "Transaction";
CREATE TRIGGER check_status_on_transaction
AFTER INSERT OR UPDATE OR DELETE ON "Transaction"
FOR EACH ROW EXECUTE FUNCTION trigger_relation_status_update();


-- =============================================
-- 3. Daily Check: Scheduled Task Using pg_cron
-- =============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    IF CURRENT_DATABASE() = 'postgres' THEN
      CREATE EXTENSION IF NOT EXISTS pg_cron;

      PERFORM cron.schedule(
        'daily-age-status-update',
        '1 0 * * *', 
        $cron$
          DO $do$
            DECLARE
              r RECORD;
            BEGIN
              FOR r IN SELECT id FROM "Resident" LOOP
                PERFORM calculate_and_update_resident_status(r.id);
              END LOOP;
            END;
          $do$;
        $cron$
      );
    END IF;
END $$;