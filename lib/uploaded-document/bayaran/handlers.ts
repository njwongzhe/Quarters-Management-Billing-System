import { createUploadedDocumentDraftUpdateHandler } from "@/lib/uploaded-document/draft-updates";
import { createUploadedDocumentImportHandler } from "@/lib/uploaded-document/import";
import { createUploadedDocumentVerifyHandler } from "@/lib/uploaded-document/verification";

export const createBayaranUploadHandler = () =>
  createUploadedDocumentImportHandler("bayaran");

export const createBayaranDraftUpdateHandler = () =>
  createUploadedDocumentDraftUpdateHandler("bayaran");

export const createBayaranVerifyHandler = () =>
  createUploadedDocumentVerifyHandler("bayaran");
