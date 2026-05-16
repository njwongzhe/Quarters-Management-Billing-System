import { createKuartersVerifyHandler } from "@/lib/uploaded-document/kuarters/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createKuartersVerifyHandler();
