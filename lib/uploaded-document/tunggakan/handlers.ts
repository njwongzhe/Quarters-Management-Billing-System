import { createUploadedDocumentDraftUpdateHandler } from "@/lib/uploaded-document/draft-updates";
import { createUploadedDocumentImportHandler } from "@/lib/uploaded-document/import";
import { createUploadedDocumentVerifyHandler } from "@/lib/uploaded-document/verification";

export const createTunggakanUploadHandler = () =>
  createUploadedDocumentImportHandler("tunggakan");

export const createTunggakanDraftUpdateHandler = () =>
  createUploadedDocumentDraftUpdateHandler("tunggakan");

export const createTunggakanVerifyHandler = () =>
  createUploadedDocumentVerifyHandler("tunggakan");
