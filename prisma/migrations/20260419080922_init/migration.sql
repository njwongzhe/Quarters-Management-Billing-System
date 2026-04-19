-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ResidentStatus" AS ENUM ('AKTIF', 'TIDAK_LAYAK', 'PENCEN_MENDATANG', 'DATA_TIDAK_LENGKAP', 'KELUAR');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('OCCUPIED', 'VACANT');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('CURRENT', 'PAST');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('BAYARAN', 'CAJ_SEWA', 'CAJ_PENYELENGGARAAN', 'CAJ_PENALTI', 'CAJ_TAMBAHAN', 'REBAT', 'BAKI_AWAL', 'LAIN_LAIN');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('NORMAL', 'DIBATALKAN', 'DILARASKAN', 'PEMBALIKAN', 'PELARASAN');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VERIFY', 'LOGIN', 'LOGOUT', 'EXPORT', 'REVERSAL', 'ADJUSTMENT', 'IMPORT_EXTRACT');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('ADMIN_PROFILE', 'RESIDENT', 'QUARTER_CLASS', 'UNIT', 'UNIT_OCCUPANCY', 'MONTHLY_CHARGE', 'ADDITIONAL_CHARGE', 'REBATE', 'PAYMENT', 'TRANSACTION', 'ARREARS_SUMMARY');

-- CreateTable
CREATE TABLE "AdminProfile" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "department" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resident" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "icNumber" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "position" TEXT,
    "department" TEXT,
    "serviceLevel" TEXT,
    "status" "ResidentStatus" NOT NULL DEFAULT 'AKTIF',
    "description" TEXT,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'VERIFIED',
    "createdById" UUID,
    "verifiedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterClass" (
    "id" UUID NOT NULL,
    "className" TEXT NOT NULL,
    "rentalPrice" DECIMAL(12,2) NOT NULL,
    "maintenancePrice" DECIMAL(12,2) NOT NULL,
    "penaltyPrice" DECIMAL(12,2) NOT NULL,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'VERIFIED',
    "createdById" UUID,
    "verifiedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "QuarterClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" UUID NOT NULL,
    "unitCode" TEXT NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'VACANT',
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'VERIFIED',
    "classId" UUID NOT NULL,
    "createdById" UUID,
    "verifiedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitOccupancy" (
    "id" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "moveInDate" TIMESTAMP(3) NOT NULL,
    "moveOutDate" TIMESTAMP(3),
    "status" "OccupancyStatus" NOT NULL DEFAULT 'CURRENT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitOccupancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArrearsSummary" (
    "id" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "totalArrearsAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastUpdatedMonth" TIMESTAMP(3),
    "description" TEXT,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'VERIFIED',
    "createdById" UUID,
    "verifiedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "ArrearsSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyCharge" (
    "id" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "unitId" UUID,
    "chargeMonth" TIMESTAMP(3) NOT NULL,
    "rentalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maintenanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penaltyAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "additionalChargesTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rebateTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalMonthlyCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentReceived" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceForMonth" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'VERIFIED',
    "createdById" UUID,
    "verifiedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "MonthlyCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalCharge" (
    "id" UUID NOT NULL,
    "monthlyChargeId" UUID NOT NULL,
    "chargeDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'VERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rebate" (
    "id" UUID NOT NULL,
    "monthlyChargeId" UUID NOT NULL,
    "rebateDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'VERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rebate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "receiptNo" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'VERIFIED',
    "createdById" UUID,
    "verifiedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL,
    "residentId" UUID,
    "paymentId" UUID,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'NORMAL',
    "relatedTransactionId" UUID,
    "debitAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "creditAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "receiptNo" TEXT,
    "notes" TEXT,
    "runningBalance" DECIMAL(12,2),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,
    "userName" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "pageName" TEXT,
    "actionType" "AuditActionType" NOT NULL,
    "description" TEXT NOT NULL,
    "entityType" "EntityType",
    "entityId" UUID,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminProfile_email_key" ON "AdminProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Resident_icNumber_key" ON "Resident"("icNumber");

-- CreateIndex
CREATE INDEX "Resident_fullName_idx" ON "Resident"("fullName");

-- CreateIndex
CREATE INDEX "Resident_status_idx" ON "Resident"("status");

-- CreateIndex
CREATE INDEX "Resident_recordStatus_idx" ON "Resident"("recordStatus");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterClass_className_key" ON "QuarterClass"("className");

-- CreateIndex
CREATE INDEX "QuarterClass_recordStatus_idx" ON "QuarterClass"("recordStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_unitCode_key" ON "Unit"("unitCode");

-- CreateIndex
CREATE INDEX "Unit_classId_idx" ON "Unit"("classId");

-- CreateIndex
CREATE INDEX "Unit_status_idx" ON "Unit"("status");

-- CreateIndex
CREATE INDEX "Unit_recordStatus_idx" ON "Unit"("recordStatus");

-- CreateIndex
CREATE INDEX "UnitOccupancy_residentId_idx" ON "UnitOccupancy"("residentId");

-- CreateIndex
CREATE INDEX "UnitOccupancy_unitId_idx" ON "UnitOccupancy"("unitId");

-- CreateIndex
CREATE INDEX "UnitOccupancy_status_idx" ON "UnitOccupancy"("status");

-- CreateIndex
CREATE INDEX "UnitOccupancy_moveInDate_idx" ON "UnitOccupancy"("moveInDate");

-- CreateIndex
CREATE UNIQUE INDEX "ArrearsSummary_residentId_key" ON "ArrearsSummary"("residentId");

-- CreateIndex
CREATE INDEX "ArrearsSummary_recordStatus_idx" ON "ArrearsSummary"("recordStatus");

-- CreateIndex
CREATE INDEX "ArrearsSummary_lastUpdatedMonth_idx" ON "ArrearsSummary"("lastUpdatedMonth");

-- CreateIndex
CREATE INDEX "MonthlyCharge_residentId_idx" ON "MonthlyCharge"("residentId");

-- CreateIndex
CREATE INDEX "MonthlyCharge_chargeMonth_idx" ON "MonthlyCharge"("chargeMonth");

-- CreateIndex
CREATE INDEX "MonthlyCharge_recordStatus_idx" ON "MonthlyCharge"("recordStatus");

-- CreateIndex
CREATE INDEX "MonthlyCharge_unitId_idx" ON "MonthlyCharge"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyCharge_residentId_chargeMonth_key" ON "MonthlyCharge"("residentId", "chargeMonth");

-- CreateIndex
CREATE INDEX "AdditionalCharge_monthlyChargeId_idx" ON "AdditionalCharge"("monthlyChargeId");

-- CreateIndex
CREATE INDEX "AdditionalCharge_chargeDate_idx" ON "AdditionalCharge"("chargeDate");

-- CreateIndex
CREATE INDEX "AdditionalCharge_recordStatus_idx" ON "AdditionalCharge"("recordStatus");

-- CreateIndex
CREATE INDEX "Rebate_monthlyChargeId_idx" ON "Rebate"("monthlyChargeId");

-- CreateIndex
CREATE INDEX "Rebate_rebateDate_idx" ON "Rebate"("rebateDate");

-- CreateIndex
CREATE INDEX "Rebate_recordStatus_idx" ON "Rebate"("recordStatus");

-- CreateIndex
CREATE INDEX "Payment_residentId_idx" ON "Payment"("residentId");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_receiptNo_idx" ON "Payment"("receiptNo");

-- CreateIndex
CREATE INDEX "Payment_recordStatus_idx" ON "Payment"("recordStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_paymentId_key" ON "Transaction"("paymentId");

-- CreateIndex
CREATE INDEX "Transaction_residentId_idx" ON "Transaction"("residentId");

-- CreateIndex
CREATE INDEX "Transaction_paymentId_idx" ON "Transaction"("paymentId");

-- CreateIndex
CREATE INDEX "Transaction_transactionDate_idx" ON "Transaction"("transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_relatedTransactionId_idx" ON "Transaction"("relatedTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_receiptNo_idx" ON "Transaction"("receiptNo");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_moduleName_idx" ON "AuditLog"("moduleName");

-- CreateIndex
CREATE INDEX "AuditLog_actionType_idx" ON "AuditLog"("actionType");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterClass" ADD CONSTRAINT "QuarterClass_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterClass" ADD CONSTRAINT "QuarterClass_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_classId_fkey" FOREIGN KEY ("classId") REFERENCES "QuarterClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitOccupancy" ADD CONSTRAINT "UnitOccupancy_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitOccupancy" ADD CONSTRAINT "UnitOccupancy_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrearsSummary" ADD CONSTRAINT "ArrearsSummary_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrearsSummary" ADD CONSTRAINT "ArrearsSummary_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrearsSummary" ADD CONSTRAINT "ArrearsSummary_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyCharge" ADD CONSTRAINT "MonthlyCharge_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyCharge" ADD CONSTRAINT "MonthlyCharge_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyCharge" ADD CONSTRAINT "MonthlyCharge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyCharge" ADD CONSTRAINT "MonthlyCharge_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalCharge" ADD CONSTRAINT "AdditionalCharge_monthlyChargeId_fkey" FOREIGN KEY ("monthlyChargeId") REFERENCES "MonthlyCharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rebate" ADD CONSTRAINT "Rebate_monthlyChargeId_fkey" FOREIGN KEY ("monthlyChargeId") REFERENCES "MonthlyCharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_relatedTransactionId_fkey" FOREIGN KEY ("relatedTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
