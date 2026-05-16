import { createUploadedDocumentDraftUpdateHandler } from "@/lib/uploaded-document/draft-updates";
import { createUploadedDocumentImportHandler } from "@/lib/uploaded-document/import";
import { createUploadedDocumentVerifyHandler } from "@/lib/uploaded-document/verification";

export const createPenghuniUploadHandler = () =>
  createUploadedDocumentImportHandler("penghuni");

export const createPenghuniDraftUpdateHandler = () =>
  createUploadedDocumentDraftUpdateHandler("penghuni");

export const createPenghuniVerifyHandler = () =>
  createUploadedDocumentVerifyHandler("penghuni");
