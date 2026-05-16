import { createUploadedDocumentDraftUpdateHandler } from "@/lib/uploaded-document/draft-updates";
import { createUploadedDocumentImportHandler } from "@/lib/uploaded-document/import";
import { createUploadedDocumentVerifyHandler } from "@/lib/uploaded-document/verification";

export const createKuartersUploadHandler = () =>
  createUploadedDocumentImportHandler("kuarters");

export const createKuartersDraftUpdateHandler = () =>
  createUploadedDocumentDraftUpdateHandler("kuarters");

export const createKuartersVerifyHandler = () =>
  createUploadedDocumentVerifyHandler("kuarters");
