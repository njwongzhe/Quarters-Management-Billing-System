import { createKuartersDraftUpdateHandler } from "@/lib/uploaded-document/kuarters/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = createKuartersDraftUpdateHandler();
