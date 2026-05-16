import { createTunggakanDraftUpdateHandler } from "@/lib/uploaded-document/tunggakan/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = createTunggakanDraftUpdateHandler();
