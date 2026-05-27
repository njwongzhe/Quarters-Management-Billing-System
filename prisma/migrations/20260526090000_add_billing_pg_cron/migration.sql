-- How to Use This Migration:
-- 1. Activate pg_cron in Supabase: Sidebar > Integrations > Cron.
-- 2. Run: `npx prisma migrate deploy`.
-- 3. Check Supabase Sidebar > Integrations > Cron > Jobs and verify
--    the scheduled job "monthly-billing-generation" is listed.
--
-- Current Billing Logic:
-- 1. Runs on the 1st day of each month.
-- 2. Bills the previous Malaysia/Singapore calendar month.
--    Example: 1 June run generates May billing.
-- 3. Creates CAJ_SEWA and CAJ_PENALTI transactions.
-- 4. Upserts MonthlyCharge and ArrearsSummary.
-- 5. Creates/updates BillingCycle as the monthly lock.
-- 6. Uses MonthlyCharge rental/penalty amounts as a second duplicate guard.
--

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DROP FUNCTION IF EXISTS run_monthly_billing(TIMESTAMPTZ);

CREATE FUNCTION run_monthly_billing(p_run_at TIMESTAMPTZ DEFAULT now())
RETURNS TABLE("recordsBilled" INTEGER, "targetBillingMonth" TIMESTAMP) AS $$
DECLARE
  v_run_time_local TIMESTAMP := p_run_at AT TIME ZONE 'Asia/Kuala_Lumpur';
  v_billing_month TIMESTAMP := date_trunc('month', p_run_at AT TIME ZONE 'Asia/Kuala_Lumpur') - INTERVAL '1 month';
  v_billing_month_end TIMESTAMP := date_trunc('month', p_run_at AT TIME ZONE 'Asia/Kuala_Lumpur') - INTERVAL '1 millisecond';
  v_total_days_in_month INTEGER;
  v_transaction_prefix TEXT := to_char(p_run_at AT TIME ZONE 'Asia/Kuala_Lumpur', 'YYYYMMDD');
  v_next_transaction_sequence INTEGER;
  v_records_billed INTEGER := 0;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('monthly-billing-generation')) THEN
    RETURN QUERY SELECT 0, v_billing_month;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "BillingCycle" bc
    WHERE bc."billingMonth" = v_billing_month
      AND bc.success = true
  ) THEN
    RETURN QUERY SELECT 0, v_billing_month;
    RETURN;
  END IF;

  v_total_days_in_month := EXTRACT(DAY FROM v_billing_month_end)::INTEGER;

  SELECT COALESCE(MAX(split_part(t."transactionNo", '-', 2)::INTEGER), 0) + 1
  INTO v_next_transaction_sequence
  FROM "Transaction" t
  WHERE t."transactionNo" ~ ('^' || v_transaction_prefix || '-[0-9]{8}$');

  DROP TABLE IF EXISTS billing_items;

  CREATE TEMP TABLE billing_items ON COMMIT DROP AS
  WITH candidate_occupancies AS (
    SELECT DISTINCT ON (uo."residentId")
      r.id AS "residentId",
      uo."unitId",
      uo."moveOutDate",
      r.status AS "residentStatus",
      qc."rentalPrice",
      qc."penaltyPrice",
      mc."rentalAmount" AS "existingRentalAmount",
      mc."penaltyAmount" AS "existingPenaltyAmount"
    FROM "UnitOccupancy" uo
    INNER JOIN "Resident" r ON r.id = uo."residentId"
    INNER JOIN "Unit" u ON u.id = uo."unitId"
    INNER JOIN "QuarterCategory" qc ON qc.id = u."categoryId"
    LEFT JOIN "MonthlyCharge" mc
      ON mc."residentId" = r.id
     AND mc."chargeMonth" = v_billing_month
    WHERE uo."moveInDate" <= v_billing_month_end
      AND (
        uo.status = 'CURRENT'::"OccupancyStatus"
        OR uo."moveOutDate" >= v_billing_month
      )
    ORDER BY uo."residentId", uo."moveInDate" DESC
  ),
  calculated AS (
    SELECT
      "residentId",
      "unitId",
      "moveOutDate",
      CASE
        WHEN COALESCE("existingRentalAmount", 0) <> 0 THEN 0::DECIMAL(12, 2)
        WHEN "moveOutDate" IS NOT NULL
          AND "moveOutDate" >= v_billing_month
          AND "moveOutDate" <= v_billing_month_end
          THEN ROUND(("rentalPrice" / v_total_days_in_month) * EXTRACT(DAY FROM "moveOutDate"), 2)
        ELSE "rentalPrice"
      END AS "rentalToAdd",
      CASE
        WHEN "residentStatus" = 'TIDAK_LAYAK'::"ResidentStatus"
          AND COALESCE("existingPenaltyAmount", 0) = 0
          THEN "penaltyPrice"
        ELSE 0::DECIMAL(12, 2)
      END AS "penaltyToAdd"
    FROM candidate_occupancies
  )
  SELECT
    "residentId",
    "unitId",
    "moveOutDate",
    "rentalToAdd",
    "penaltyToAdd",
    ("rentalToAdd" + "penaltyToAdd")::DECIMAL(12, 2) AS "totalNewCharges"
  FROM calculated
  WHERE ("rentalToAdd" + "penaltyToAdd") > 0;

  SELECT COUNT(*) INTO v_records_billed FROM billing_items;

  WITH transaction_rows AS (
    SELECT
      "residentId",
      'CAJ_SEWA'::"TransactionCategory" AS category,
      "rentalToAdd" AS amount,
      CASE
        WHEN "moveOutDate" IS NOT NULL
          AND "moveOutDate" >= v_billing_month
          AND "moveOutDate" <= v_billing_month_end
          THEN 'Caj Sewa (Prorata Pindah Keluar)'
        ELSE 'Caj Sewa Bulanan'
      END AS description,
      1 AS sort_order
    FROM billing_items
    WHERE "rentalToAdd" > 0

    UNION ALL

    SELECT
      "residentId",
      'CAJ_PENALTI'::"TransactionCategory" AS category,
      "penaltyToAdd" AS amount,
      'Denda / Penalti Hilang Kelayakan' AS description,
      2 AS sort_order
    FROM billing_items
    WHERE "penaltyToAdd" > 0
  ),
  numbered_transactions AS (
    SELECT
      *,
      row_number() OVER (ORDER BY "residentId", sort_order) AS sequence_offset
    FROM transaction_rows
  )
  INSERT INTO "Transaction" (
    id,
    "transactionNo",
    "residentId",
    "transactionDate",
    category,
    status,
    "debitAmount",
    "creditAmount",
    description,
    "createdAt",
    "updatedAt"
  )
  SELECT
    gen_random_uuid(),
    v_transaction_prefix || '-' || lpad((v_next_transaction_sequence + sequence_offset - 1)::TEXT, 8, '0'),
    "residentId",
    v_billing_month,
    category,
    'NORMAL'::"TransactionStatus",
    amount,
    0,
    description,
    now(),
    now()
  FROM numbered_transactions;

  INSERT INTO "MonthlyCharge" (
    id,
    "residentId",
    "unitId",
    "chargeMonth",
    "rentalAmount",
    "penaltyAmount",
    "totalMonthlyCharge",
    "balanceForMonth",
    "createdAt",
    "updatedAt"
  )
  SELECT
    gen_random_uuid(),
    "residentId",
    "unitId",
    v_billing_month,
    "rentalToAdd",
    "penaltyToAdd",
    "totalNewCharges",
    "totalNewCharges",
    now(),
    now()
  FROM billing_items
  ON CONFLICT ("residentId", "chargeMonth") DO UPDATE SET
    "unitId" = EXCLUDED."unitId",
    "rentalAmount" = "MonthlyCharge"."rentalAmount" + EXCLUDED."rentalAmount",
    "penaltyAmount" = "MonthlyCharge"."penaltyAmount" + EXCLUDED."penaltyAmount",
    "totalMonthlyCharge" = "MonthlyCharge"."totalMonthlyCharge" + EXCLUDED."totalMonthlyCharge",
    "balanceForMonth" = "MonthlyCharge"."balanceForMonth" + EXCLUDED."balanceForMonth",
    "updatedAt" = now();

  INSERT INTO "ArrearsSummary" (
    id,
    "residentId",
    "totalArrearsAmount",
    "lastUpdatedMonth",
    "createdAt",
    "updatedAt"
  )
  SELECT
    gen_random_uuid(),
    "residentId",
    "totalNewCharges",
    v_billing_month,
    now(),
    now()
  FROM billing_items
  ON CONFLICT ("residentId") DO UPDATE SET
    "totalArrearsAmount" = "ArrearsSummary"."totalArrearsAmount" + EXCLUDED."totalArrearsAmount",
    "lastUpdatedMonth" = EXCLUDED."lastUpdatedMonth",
    "updatedAt" = now();

  INSERT INTO "BillingCycle" (
    id,
    "billingMonth",
    "runDate",
    success,
    "recordsBilled"
  )
  VALUES (
    gen_random_uuid(),
    v_billing_month,
    v_run_time_local,
    true,
    v_records_billed
  )
  ON CONFLICT ("billingMonth") DO UPDATE SET
    "runDate" = EXCLUDED."runDate",
    success = true,
    "recordsBilled" = EXCLUDED."recordsBilled";

  RETURN QUERY SELECT v_records_billed, v_billing_month;
END;
$$ LANGUAGE plpgsql;

