import { createPenghuniDraftUpdateHandler } from "@/lib/uploaded-document/penghuni/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = createPenghuniDraftUpdateHandler();
