CREATE INDEX "Transaction_relatedTransactionId_createdAt_idx"
ON "Transaction"("relatedTransactionId", "createdAt");

CREATE INDEX "Transaction_createdAt_transactionNo_idx"
ON "Transaction"("createdAt", "transactionNo");

CREATE INDEX "UploadedDocument_category_uploadedAt_idx"
ON "UploadedDocument"("category", "uploadedAt");
