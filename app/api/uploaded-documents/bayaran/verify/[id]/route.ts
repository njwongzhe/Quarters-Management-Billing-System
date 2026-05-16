import { createBayaranVerifyHandler } from "@/lib/uploaded-document/bayaran/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createBayaranVerifyHandler();
