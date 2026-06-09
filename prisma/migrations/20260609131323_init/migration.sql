-- CreateEnum
CREATE TYPE "ResidentStatus" AS ENUM ('AKTIF', 'TIDAK_LAYAK', 'PENCEN_MENDATANG', 'DATA_TIDAK_LENGKAP');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('OCCUPIED', 'VACANT');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('CURRENT', 'PAST');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('BAYARAN', 'CAJ_SEWA', 'CAJ_PENYELENGGARAAN', 'CAJ_PENALTI', 'CAJ_TAMBAHAN', 'REBAT', 'BAKI_AWAL', 'LAIN_LAIN');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('NORMAL', 'DIBALIKAN', 'DILARASKAN', 'PEMBALIKAN', 'PELARASAN');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VERIFY', 'LOGIN', 'LOGOUT', 'EXPORT', 'REVERSAL', 'ADJUSTMENT', 'IMPORT_EXTRACT');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('BAYARAN', 'TUNGGAKAN', 'PENGHUNI', 'KUARTERS');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('ADMIN_PROFILE', 'RESIDENT', 'QUARTER_CATEGORY', 'UNIT', 'UNIT_OCCUPANCY', 'MONTHLY_CHARGE', 'ADDITIONAL_CHARGE', 'REBATE', 'PAYMENT', 'TRANSACTION', 'ARREARS_SUMMARY');

-- CreateTable
CREATE TABLE "AdminProfile" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "department" TEXT,
    "gender" TEXT,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterCategory" (
    "id" UUID NOT NULL,
    "categoryName" TEXT NOT NULL,
    "address" TEXT,
    "rentalPrice" DECIMAL(12,2) NOT NULL,
    "maintenancePrice" DECIMAL(12,2) NOT NULL,
    "penaltyPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" UUID NOT NULL,
    "unitCode" TEXT NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'VACANT',
    "categoryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "description" TEXT,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalCharge" (
    "id" UUID NOT NULL,
    "monthlyChargeId" UUID NOT NULL,
    "chargeDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
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
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL,
    "transactionNo" TEXT,
    "residentId" UUID,
    "paymentId" UUID,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "chargeMonth" TIMESTAMP(3),
    "category" "TransactionCategory" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'NORMAL',
    "relatedTransactionId" UUID,
    "debitAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "creditAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "receiptNo" TEXT,
    "description" TEXT,
    "runningBalance" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedDocument" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "uploadedById" UUID,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "remark" TEXT,

    CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentDraft" (
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
    "quarterCategoryName" TEXT,
    "quarterAddress" TEXT,
    "unitCode" TEXT,
    "moveInDate" TIMESTAMP(3),
    "moveOutDate" TIMESTAMP(3),
    "uploadedDocumentId" UUID NOT NULL,
    "originalResidentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterCategoryDraft" (
    "id" UUID NOT NULL,
    "categoryName" TEXT NOT NULL,
    "address" TEXT,
    "rentalPrice" DECIMAL(12,2) NOT NULL,
    "maintenancePrice" DECIMAL(12,2) NOT NULL,
    "penaltyPrice" DECIMAL(12,2) NOT NULL,
    "uploadedDocumentId" UUID NOT NULL,
    "originalCategoryId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterCategoryDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitDraft" (
    "id" UUID NOT NULL,
    "unitCode" TEXT NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'VACANT',
    "uploadedDocumentId" UUID NOT NULL,
    "categoryDraftId" UUID,
    "originalUnitId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArrearsSummaryDraft" (
    "id" UUID NOT NULL,
    "residentName" TEXT NOT NULL,
    "residentIcNumber" TEXT NOT NULL,
    "totalArrearsAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastUpdatedMonth" TIMESTAMP(3),
    "description" TEXT,
    "uploadedDocumentId" UUID NOT NULL,
    "originalResidentId" UUID,
    "originalSummaryId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArrearsSummaryDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentDraft" (
    "id" UUID NOT NULL,
    "residentName" TEXT NOT NULL,
    "residentIcNumber" TEXT NOT NULL,
    "department" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "receiptNo" TEXT,
    "referenceNo" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "uploadedDocumentId" UUID NOT NULL,
    "originalResidentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,
    "userName" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "targetData" TEXT,
    "actionType" "AuditActionType" NOT NULL,
    "description" TEXT NOT NULL,
    "entityType" "EntityType",
    "entityId" UUID,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCycle" (
    "id" UUID NOT NULL,
    "billingMonth" TIMESTAMP(3) NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "recordsBilled" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BillingCycle_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "QuarterCategory_categoryName_address_key" ON "QuarterCategory"("categoryName", "address");

-- CreateIndex
CREATE INDEX "Unit_categoryId_idx" ON "Unit"("categoryId");

-- CreateIndex
CREATE INDEX "Unit_status_idx" ON "Unit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_categoryId_unitCode_key" ON "Unit"("categoryId", "unitCode");

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
CREATE INDEX "ArrearsSummary_lastUpdatedMonth_idx" ON "ArrearsSummary"("lastUpdatedMonth");

-- CreateIndex
CREATE INDEX "MonthlyCharge_residentId_idx" ON "MonthlyCharge"("residentId");

-- CreateIndex
CREATE INDEX "MonthlyCharge_chargeMonth_idx" ON "MonthlyCharge"("chargeMonth");

-- CreateIndex
CREATE INDEX "MonthlyCharge_unitId_idx" ON "MonthlyCharge"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyCharge_residentId_chargeMonth_key" ON "MonthlyCharge"("residentId", "chargeMonth");

-- CreateIndex
CREATE INDEX "AdditionalCharge_monthlyChargeId_idx" ON "AdditionalCharge"("monthlyChargeId");

-- CreateIndex
CREATE INDEX "AdditionalCharge_chargeDate_idx" ON "AdditionalCharge"("chargeDate");

-- CreateIndex
CREATE INDEX "Rebate_monthlyChargeId_idx" ON "Rebate"("monthlyChargeId");

-- CreateIndex
CREATE INDEX "Rebate_rebateDate_idx" ON "Rebate"("rebateDate");

-- CreateIndex
CREATE INDEX "Payment_residentId_idx" ON "Payment"("residentId");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_receiptNo_idx" ON "Payment"("receiptNo");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionNo_key" ON "Transaction"("transactionNo");

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
CREATE INDEX "Transaction_transactionNo_idx" ON "Transaction"("transactionNo");

-- CreateIndex
CREATE INDEX "UploadedDocument_category_idx" ON "UploadedDocument"("category");

-- CreateIndex
CREATE INDEX "UploadedDocument_uploadedAt_idx" ON "UploadedDocument"("uploadedAt");

-- CreateIndex
CREATE INDEX "UploadedDocument_uploadedById_idx" ON "UploadedDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "ResidentDraft_uploadedDocumentId_idx" ON "ResidentDraft"("uploadedDocumentId");

-- CreateIndex
CREATE INDEX "ResidentDraft_icNumber_idx" ON "ResidentDraft"("icNumber");

-- CreateIndex
CREATE INDEX "QuarterCategoryDraft_uploadedDocumentId_idx" ON "QuarterCategoryDraft"("uploadedDocumentId");

-- CreateIndex
CREATE INDEX "UnitDraft_uploadedDocumentId_idx" ON "UnitDraft"("uploadedDocumentId");

-- CreateIndex
CREATE INDEX "UnitDraft_categoryDraftId_idx" ON "UnitDraft"("categoryDraftId");

-- CreateIndex
CREATE INDEX "ArrearsSummaryDraft_uploadedDocumentId_idx" ON "ArrearsSummaryDraft"("uploadedDocumentId");

-- CreateIndex
CREATE INDEX "ArrearsSummaryDraft_residentIcNumber_idx" ON "ArrearsSummaryDraft"("residentIcNumber");

-- CreateIndex
CREATE INDEX "PaymentDraft_uploadedDocumentId_idx" ON "PaymentDraft"("uploadedDocumentId");

-- CreateIndex
CREATE INDEX "PaymentDraft_residentIcNumber_idx" ON "PaymentDraft"("residentIcNumber");

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

-- CreateIndex
CREATE UNIQUE INDEX "BillingCycle_billingMonth_key" ON "BillingCycle"("billingMonth");

-- CreateIndex
CREATE INDEX "BillingCycle_billingMonth_idx" ON "BillingCycle"("billingMonth");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QuarterCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitOccupancy" ADD CONSTRAINT "UnitOccupancy_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitOccupancy" ADD CONSTRAINT "UnitOccupancy_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrearsSummary" ADD CONSTRAINT "ArrearsSummary_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyCharge" ADD CONSTRAINT "MonthlyCharge_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyCharge" ADD CONSTRAINT "MonthlyCharge_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalCharge" ADD CONSTRAINT "AdditionalCharge_monthlyChargeId_fkey" FOREIGN KEY ("monthlyChargeId") REFERENCES "MonthlyCharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rebate" ADD CONSTRAINT "Rebate_monthlyChargeId_fkey" FOREIGN KEY ("monthlyChargeId") REFERENCES "MonthlyCharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_relatedTransactionId_fkey" FOREIGN KEY ("relatedTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentDraft" ADD CONSTRAINT "ResidentDraft_uploadedDocumentId_fkey" FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterCategoryDraft" ADD CONSTRAINT "QuarterCategoryDraft_uploadedDocumentId_fkey" FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitDraft" ADD CONSTRAINT "UnitDraft_uploadedDocumentId_fkey" FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitDraft" ADD CONSTRAINT "UnitDraft_categoryDraftId_fkey" FOREIGN KEY ("categoryDraftId") REFERENCES "QuarterCategoryDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrearsSummaryDraft" ADD CONSTRAINT "ArrearsSummaryDraft_uploadedDocumentId_fkey" FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDraft" ADD CONSTRAINT "PaymentDraft_uploadedDocumentId_fkey" FOREIGN KEY ("uploadedDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
