import { createBayaranDraftUpdateHandler } from "@/lib/uploaded-document/bayaran/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = createBayaranDraftUpdateHandler();
